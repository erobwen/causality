'use strict'; 
// require = require("esm")(module);
const { argumentsToArray, configSignature, mergeInto } = require("./lib/utility.js");
const defaultObjectlog = require("./lib/objectlog.js");
const { defaultDependencyInterfaceCreator } = require("./lib/defaultDependencyInterface.js");

// const log = console.log;
// const logg = (string) => {
//   console.log("-------------" + string + "-------------");
// };
// log; logg;

function createInstance(configuration) {

  /***************************************************************
   *
   *  Coonfiguration
   *
   ***************************************************************/

  const {
    requireRepeaterName = false,
    requireInvalidatorName = false,

    objectMetaProperty = "causality",
    objectMetaForwardToProperty = "causalityForwardTo",

    emitEvents = false, // either set onEventGlobal or define onChange on individual objects.
    sendEventsToObjects = true,
      // Reserved properties that you can override on observables IF sendEventsToObjects is set to true. 
      // onChange
      // onBuildCreate
      // onBuildRemove
      // TODO: onRemovedObserver, onRemovedLastObserver ? 
    onEventGlobal = null,
    emitReCreationEvents = false,
    
    customDependencyInterfaceCreator = null, //{recordDependencyOnArray, recordDependencyOnEnumeration, recordDependencyOnProperty, recordDependency}
    customCreateInvalidator = null, 
    customCreateRepeater = null,

    onWriteGlobal = null, 
    onReadGlobal = null, 
    cannotReadPropertyValue = null,

    objectlog = defaultObjectlog,
  } = configuration;  

  // console.log(objectlog)

  /***************************************************************
   *
   *  State
   *
   ***************************************************************/

  // Public state, shareable with other modules. 
  const state = {
    recordingPaused : 0,
    blockInvalidation : 0,
    postponeInvalidation : 0
  };

  // Object creation
  let nextObjectId = 1;

  // Stack
  let context = null;
  let inActiveRecording = false;
  let activeRecorder = null;

  // Observers
  let observerId = 0;
  let nextObserverToInvalidate = null;
  let lastObserverToInvalidate = null;

  // Invalidators

  // Repeaters
  let inRepeater = null;
  let firstDirtyRepeater = null;
  let lastDirtyRepeater = null;
  let refreshingAllDirtyRepeaters = false;


  /***************************************************************
   *
   *  Constants
   *
   ***************************************************************/

  const staticArrayOverrides = createStaticArrayOverrides();


  /************************************************************************
   *
   *  Instance
   *
   ************************************************************************/

  const instance = {
    // Main API
    create,
    c: create, 
    invalidateOnChange,
    repeatOnChange,
    repeat: repeatOnChange,

    // Modifiers
    withoutRecording,
    withoutReactions,

    // Transaction
    postponeReactions,
    transaction : postponeReactions,

    // Debugging and testing
    clearRepeaterLists,
    
    // Logging
    log,
    logGroup,
    logUngroup,
    logToString,
    
    // Advanced (only if you know what you are doing, typically used by plugins to causality)
    state,
    enterContext,
    leaveContext,
    invalidateObserver, 
    nextObserverId: () => { return observerId++ }
  }; 


  /***************************************************************
   *
   *  Customize
   *
   ***************************************************************/

  // Custom observer creators
  const createRepeater = customCreateRepeater ? customCreateRepeater : defaultCreateRepeater;
  const createInvalidator = customCreateInvalidator ? customCreateInvalidator : defaultCreateInvalidator;

  // Dependency interface (plugin data structures connecting observer and observable)
  const dependencyInterface = customDependencyInterfaceCreator ? 
    customDependencyInterfaceCreator(instance) 
    : 
    defaultDependencyInterfaceCreator(instance);
  const recordDependencyOnArray = dependencyInterface.recordDependencyOnArray;
  const recordDependencyOnEnumeration = dependencyInterface.recordDependencyOnEnumeration;
  const recordDependencyOnProperty = dependencyInterface.recordDependencyOnProperty;
  const invalidateArrayObservers = dependencyInterface.invalidateArrayObservers;
  const invalidateEnumerateObservers = dependencyInterface.invalidateEnumerateObservers;
  const invalidatePropertyObservers = dependencyInterface.invalidatePropertyObservers;
  const removeAllSources = dependencyInterface.removeAllSources;

  // Object.assign(instance, require("./lib/causalityObject.js").bindToInstance(instance));


  /************************************************************************
   *
   *  Module
   *
   ************************************************************************/

  return instance;


  /**********************************
   *
   *   State ajustments
   *
   **********************************/

  function withoutRecording(action) {
    state.recordingPaused++;
    updateContextState();
    action();
    state.recordingPaused--;
    updateContextState();
  }

  function postponeReactions(callback) {
    state.postponeInvalidation++;
    callback();
    state.postponeInvalidation--;
    proceedWithPostponedInvalidations();
  }

  function withoutReactions(callback) {
    state.blockInvalidation++;
    callback();
    state.blockInvalidation--;
  }


  /**********************************
   *
   *   Causality Global stacklets
   *
   **********************************/

  function updateContextState() {
    inActiveRecording = context !== null && state.recordingPaused === 0;
    activeRecorder = (inActiveRecording) ? context : null;    
    inRepeater = (context && context.type === "repeater") ? context: null;
  }

  function enterContext(enteredContext) {
    enteredContext.parent = context;
    context = enteredContext;
    updateContextState();
    return enteredContext;
  }

  function leaveContext( activeContext ) {    
    if( context && activeContext === context ) {
      context = context.parent;
    } else {
      throw new Error("Context missmatch");
    }
    updateContextState();
  }


  /***************************************************************
   *
   *  Array causality
   *
   ***************************************************************/

  function createStaticArrayOverrides() {
    const result = {
      pop : function() {
        let index = this.target.length - 1;
        let result = this.target.pop();

        if (emitEvents) emitSpliceEvent(this, index, [result], null);
        invalidateArrayObservers(this);

        return result;
      },

      push : function() {
        let index = this.target.length;
        let argumentsArray = argumentsToArray(arguments);
        this.target.push.apply(this.target, argumentsArray);

        if (emitEvents) emitSpliceEvent(this, index, null, argumentsArray);
        invalidateArrayObservers(this);

        return this.target.length;
      },

      shift : function() {
        let result = this.target.shift();
        
        if (emitEvents) emitSpliceEvent(this, 0, [result], null);
        invalidateArrayObservers(this);

        return result;

      },

      unshift : function() {
        let argumentsArray = argumentsToArray(arguments);
        this.target.unshift.apply(this.target, argumentsArray);

        if (emitEvents) emitSpliceEvent(this, 0, null, argumentsArray);
        invalidateArrayObservers(this);

        return this.target.length;
      },

      splice : function() {
        let argumentsArray = argumentsToArray(arguments);
        let index = argumentsArray[0];
        let removedCount = argumentsArray[1];
        if( typeof argumentsArray[1] === 'undefined' )
          removedCount = this.target.length - index;
        let added = argumentsArray.slice(2);
        let removed = this.target.slice(index, index + removedCount);
        let result = this.target.splice.apply(this.target, argumentsArray);

        if (emitEvents) emitSpliceEvent(this, index, removed, added);
        invalidateArrayObservers(this);

        return result; // equivalent to removed
      },

      copyWithin: function(target, start, end) {
        if( !start ) start = 0;
        if( !end ) end = this.target.length;
        if (target < 0) { start = this.target.length - target; }
        if (start < 0) { start = this.target.length - start; }
        if (end < 0) { start = this.target.length - end; }
        end = Math.min(end, this.target.length);
        start = Math.min(start, this.target.length);
        if (start >= end) {
          return;
        }
        let removed = this.target.slice(target, target + end - start);
        let added = this.target.slice(start, end);
        let result = this.target.copyWithin(target, start, end);

        if (emitEvents) emitSpliceEvent(this, target, added, removed);
        invalidateArrayObservers(this);

        return result;
      }
    };

    ['reverse', 'sort', 'fill'].forEach(function(functionName) {
      result[functionName] = function() {
        let argumentsArray = argumentsToArray(arguments);
        let removed = this.target.slice(0);
        let result = this.target[functionName]
            .apply(this.target, argumentsArray);

        if (emitEvents) emitSpliceEvent(this, 0, removed, this.target.slice(0));
        invalidateArrayObservers(this);

        return result;
      };
    });

    return result;
  }


  /***************************************************************
   *
   *  Array Handlers
   *
   ***************************************************************/

  function getHandlerArray(target, key) {
    if (key === objectMetaForwardToProperty) {
      return this.meta.forwardTo;
    } else if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.get.apply(forwardToHandler, [forwardToHandler.target, key]);
    } 

    if (onReadGlobal && !onReadGlobal(this, target)) { 
      return cannotReadPropertyValue;
    }

    if (staticArrayOverrides[key]) {
      return staticArrayOverrides[key].bind(this);
    } else if (key === objectMetaProperty) {
      return this.meta;
    } else {
      if (inActiveRecording) recordDependencyOnArray(activeRecorder, this);
      return target[key];
    }
  }

  function setHandlerArray(target, key, value) {
    if (this.meta.forwardTo !== null) {
      if (key === objectMetaForwardToProperty) {
        this.meta.forwardTo = value;
        return true;
      } else {
        let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
        return forwardToHandler.set.apply(forwardToHandler, [forwardToHandler.target, key, value]);
      }
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    } 

    let previousValue = target[key];

    // If same value as already set, do nothing.
    if (key in target) {
      if (previousValue === value || (Number.isNaN(previousValue) &&
                                      Number.isNaN(value)) ) {
        return true;
      }
    }

    if (!isNaN(key)) {
      // Number index
      if (typeof(key) === 'string') {
        key = parseInt(key);
      }
      target[key] = value;

      if( target[key] === value || (
        Number.isNaN(target[key]) && Number.isNaN(value)) ) {
        emitSpliceReplaceEvent(this, key, value, previousValue);
        invalidateArrayObservers(this);
      }
    } else {
      // String index
      target[key] = value;
      if( target[key] === value || (Number.isNaN(target[key]) &&
                                    Number.isNaN(value)) ) {
        emitSetEvent(this, key, value, previousValue);
        invalidateArrayObservers(this);
      }
    }

    if( target[key] !== value && !(Number.isNaN(target[key]) &&
                                   Number.isNaN(value)) ) {
      return false;
    }
    
    return true;
  }

  function deletePropertyHandlerArray(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.deleteProperty.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    } 

    if (!(key in target)) {
      return true;
    }

    let previousValue = target[key];
    delete target[key];
    if(!( key in target )) { // Write protected?
      emitDeleteEvent(this, key, previousValue);
      invalidateArrayObservers(this);
    }
    if( key in target ) return false; // Write protected?
    return true;
  }

  function ownKeysHandlerArray(target) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.ownKeys.apply(
        forwardToHandler, [forwardToHandler.target]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { 
      return cannotReadPropertyValue;
    }

    if (inActiveRecording) recordDependencyOnArray(activeRecorder, this);
    let result   = Object.keys(target);
    result.push('length');
    return result;
  }

  function hasHandlerArray(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.has.apply(forwardToHandler, [target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { 
      return cannotReadPropertyValue;
    }

    if (inActiveRecording) recordDependencyOnArray(activeRecorder, this);
    return key in target;
  }

  function definePropertyHandlerArray(target, key, oDesc) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.defineProperty.apply(
        forwardToHandler, [forwardToHandler.target, key, oDesc]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    } 

    invalidateArrayObservers(this);
    return target;
  }

  function getOwnPropertyDescriptorHandlerArray(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.getOwnPropertyDescriptor.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { 
      return cannotReadPropertyValue;
    }

    if (inActiveRecording) recordDependencyOnArray(activeRecorder, this);
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Object Handlers
   *
   ***************************************************************/


  function getHandlerObject(target, key) {
    key = key.toString();

    if (key === objectMetaForwardToProperty) {
      return this.meta.forwardTo;
    } else if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      let result = forwardToHandler.get.apply(forwardToHandler, [forwardToHandler.target, key]);
      return result;
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
    
    if (key === objectMetaProperty) {
      return this.meta;
    } else {  
      if (typeof(key) !== 'undefined') {
        if (inActiveRecording) recordDependencyOnProperty(activeRecorder, this, key);

        let scan = target;
        while ( scan !== null && typeof(scan) !== 'undefined' ) {
          let descriptor = Object.getOwnPropertyDescriptor(scan, key);
          if (typeof(descriptor) !== 'undefined' &&
              typeof(descriptor.get) !== 'undefined') {
            return descriptor.get.bind(this.meta.proxy)();
          }
          scan = Object.getPrototypeOf( scan );
        }
        return target[key];
      }
    }
  }

  function setHandlerObject(target, key, value) {
    if (key === objectMetaForwardToProperty) {
      this.meta.forwardTo = value;
      return true;
    } else if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.set.apply(forwardToHandler, [forwardToHandler.target, key, value]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    } 

    let previousValue = target[key];

    // If same value as already set, do nothing.
    if (key in target) {
      if (previousValue === value || (Number.isNaN(previousValue) &&
                                      Number.isNaN(value)) ) {
        return true;
      }
    }
    emitSetEvent(this, key, value, previousValue);

    let undefinedKey = !(key in target);
    target[key]      = value;
    let resultValue  = target[key];
    if( resultValue === value || (Number.isNaN(resultValue) &&
                                  Number.isNaN(value)) ) {
      // Write protected?
      invalidatePropertyObservers(this, key);
      if (undefinedKey) invalidateEnumerateObservers(this);
    }

    if( resultValue !== value  && !(Number.isNaN(resultValue) &&
                                    Number.isNaN(value))) return false;
    // Write protected?
    return true;
  }

  function deletePropertyHandlerObject(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      forwardToHandler.deleteProperty.apply(
        forwardToHandler, [forwardToHandler.target, key]);
      return true;
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    } 

    if (!(key in target)) {
      return true;
    } else {
      let previousValue = target[key];
      delete target[key];
      if(!( key in target )) { // Write protected?
        emitDeleteEvent(this, key, previousValue);
        invalidatePropertyObservers(this, key);
        invalidateEnumerateObservers(this);
      }
      if( key in target ) return false; // Write protected?
      return true;
    }
  }

  function ownKeysHandlerObject(target, key) { // Not inherited?
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.ownKeys.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (inActiveRecording) recordDependencyOnEnumeration(activeRecorder, this);

    let keys = Object.keys(target);
    // keys.push('id');
    return keys;
  }

  function hasHandlerObject(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.has.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (inActiveRecording) recordDependencyOnEnumeration(activeRecorder, this)
    return key in target;
  }

  function definePropertyHandlerObject(target, key, descriptor) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.defineProperty.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target)) {
      return;
    }
 
    invalidateEnumerateObservers(this);
    return Reflect.defineProperty(target, key, descriptor);
  }

  function getOwnPropertyDescriptorHandlerObject(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.getOwnPropertyDescriptor
        .apply(forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (inActiveRecording) recordDependencyOnEnumeration(activeRecorder, this)
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Create
   *
   ***************************************************************/

  function create(createdTarget, buildId) {
    if (typeof(createdTarget) === 'undefined') {
      createdTarget = {};
    }
    if (typeof(buildId) === 'undefined') {
      buildId = null;
    }

    let handler;
    if (createdTarget instanceof Array) {
      handler = {
        _arrayObservers : null,
        // getPrototypeOf: function () {},
        // setPrototypeOf: function () {},
        // isExtensible: function () {},
        // preventExtensions: function () {},
        // apply: function () {},
        // construct: function () {},
        get: getHandlerArray,
        set: setHandlerArray,
        deleteProperty: deletePropertyHandlerArray,
        ownKeys: ownKeysHandlerArray,
        has: hasHandlerArray,
        defineProperty: definePropertyHandlerArray,
        getOwnPropertyDescriptor: getOwnPropertyDescriptorHandlerArray
      };
    } else {
      handler = {
        // getPrototypeOf: function () {},
        // setPrototypeOf: function () {},
        // isExtensible: function () {},
        // preventExtensions: function () {},
        // apply: function () {},
        // construct: function () {},
        get: getHandlerObject,
        set: setHandlerObject,
        deleteProperty: deletePropertyHandlerObject,
        ownKeys: ownKeysHandlerObject,
        has: hasHandlerObject,
        defineProperty: definePropertyHandlerObject,
        getOwnPropertyDescriptor: getOwnPropertyDescriptorHandlerObject
      };
    }

    let proxy = new Proxy(createdTarget, handler);
    
    handler.target = createdTarget;
    handler.proxy = proxy;

    handler.meta = {
      id: nextObjectId++,
      buildId : buildId,
      forwardTo : null,
      target: createdTarget,
      handler : handler,
      proxy : proxy,

      // Optimization. Here to avoid expensive decoration post object creation.
      isRebuildOfOther: false,
    };

    if (inRepeater !== null && buildId !== null) {
      if (!inRepeater.newlyCreated) inRepeater.newlyCreated = [];
      
      if (inRepeater.buildIdObjectMap && typeof(inRepeater.buildIdObjectMap[buildId]) !== 'undefined') {
        // Object identity previously created
        handler.meta.isRebuildOfOther = true;
        let establishedObject = inRepeater.buildIdObjectMap[buildId];
        establishedObject.causalityForwardTo = proxy;

        inRepeater.newlyCreated.push(establishedObject);
        if (emitReCreationEvents) {
          emitCreationEvent(handler);
        }
        return establishedObject;
      } else {
        // Create a new one
        inRepeater.newlyCreated.push(proxy);
        emitCreationEvent(handler);
      }
    } else {
      emitCreationEvent(handler);
    }
    return proxy;
  }



  /**********************************
   *
   *  Emit events & onChange
   *
   **********************************/

  function emitSpliceEvent(handler, index, removed, added) {
    if (emitEvents) {
      emitEvent(handler, {type: 'splice', index, removed, added});
    }
  }

  function emitSpliceReplaceEvent(handler, key, value, previousValue) {
    if (emitEvents) {
      emitEvent(handler, {
        type: 'splice',
        index: key,
        removed: [previousValue],
        added: [value] });
    }
  }

  function emitSetEvent(handler, key, value, previousValue) {
    if (emitEvents) {
      emitEvent(handler, {
        type: 'set',
        property: key,
        newValue: value,
        oldValue: previousValue});
    }
  }

  function emitDeleteEvent(handler, key, previousValue) {
    if (emitEvents) {
      emitEvent(handler, {
        type: 'delete',
        property: key,
        deletedValue: previousValue});
    }
  }

  function emitCreationEvent(handler) {
    if (emitEvents) {
      emitEvent(handler, {type: 'create'})
    }
  }

  function emitEvent(handler, event) {
    event.object = handler.meta.proxy;
    event.objectId = handler.meta.id;

    if (!emitReCreationEvents && handler.meta.isRebuildOfOther) {
      return;
    }

    if (onEventGlobal) {
      onEventGlobal(event);
    }

    if (sendEventsToObjects && typeof(handler.target.onChange) === 'function') { // Consider. Put on queue and fire on end of reaction? onReactionEnd onTransactionEnd 
      handler.target.onChange(event);
    }
  }


  /**********************************
   *
   *   Reactive observers
   *
   **********************************/

  function proceedWithPostponedInvalidations() {
    if (state.postponeInvalidation == 0) {
      while (nextObserverToInvalidate !== null) {
        let recorder = nextObserverToInvalidate;
        nextObserverToInvalidate = nextObserverToInvalidate.nextToNotify;
        // blockSideEffects(function() {
        recorder.invalidateAction();
        // });
      }
      lastObserverToInvalidate = null;
    }
  }

  function invalidateObserver(observer) {
    if (observer != context) {
      // if( trace.contextMismatch && context && context.id ){
      //   console.log("invalidateObserver mismatch " + observer.type, observer.id||'');
      //   if( !context ) console.log('current context null');
      //   else {
      //     console.log("current context " + context.type, context.id||'');
      //     if( context.parent ){
      //       console.log("parent context " + context.parent.type, context.parent.id||'');
      //     }
      //   }
      // }
      
      observer.dispose(); // Cannot be any more dirty than it already is!
      if (state.postponeInvalidation > 0) {
        if (lastObserverToInvalidate !== null) {
          lastObserverToInvalidate.nextToNotify = observer;
        } else {
          nextObserverToInvalidate = observer;
        }
        lastObserverToInvalidate = observer;
      } else {
        // blockSideEffects(function() {
        observer.invalidateAction();
        // });
      }
    }
  }

    // From observed object
  // let observerSetContents = getMap(
  // observerSet, 'contents');
  // if (typeof(observerSet['contents'])) {
  ////! Should not be needed
  //     observerSet['contents'] = {};
  // }


  /**********************************
   *
   *  invalidateOnChange.
   *
   **********************************/

  function defaultCreateInvalidator(description, doAfterChange) {
    return {
      type: 'invalidator',
      id: observerId++,
      description: description,
      sources : [],
      nextToNotify: null,
      invalidateAction: doAfterChange,
      dispose : function() {
        removeAllSources(this);
      },
      record : function( action ){
        if( context == this || this.isRemoved ) return action();
        const activeContext = enterContext(this);
        const value = action();
        leaveContext( activeContext );
        return value;
      },
      returnValue: null
    }
  }


  function invalidateOnChange() {
    // description(optional), doFirst, doAfterChange. doAfterChange
    // cannot modify model, if needed, use a repeater instead.
    // (for guaranteed consistency)

    // Arguments
    let doFirst;
    let doAfterChange;
    let description = null;
    if (arguments.length > 2) {
      description   = arguments[0];
      doFirst       = arguments[1];
      doAfterChange = arguments[2];
    } else {
      if (requireInvalidatorName) throw new Error("Missing description for 'invalidateOnChange'")
      doFirst       = arguments[0];
      doAfterChange = arguments[1];
    }

    // Recorder context
    const invalidator = createInvalidator(description, doAfterChange)
    enterContext(invalidator);
    invalidator.returnValue = doFirst( invalidator );
    leaveContext(invalidator);

    return invalidator;
  }



  /**********************************
   *
   *   Repetition
   *
   **********************************/


  function defaultCreateRepeater(description, repeaterAction, repeaterNonRecordingAction, options) {
    return {
      type: "repeater", 
      id: observerId++,
      description: description,
      sources : [],
      nextToNotify: null,
      repeaterAction : modifyRepeaterAction(repeaterAction, options),
      nonRecordedAction: repeaterNonRecordingAction,
      options: options ? options : {},
      restart() {
        this.invalidateAction();
      },
      invalidateAction() {
        removeAllSources(this);
        repeaterDirty(this);
        this.disposeChildren();
      },
      dispose() {
        detatchRepeater(this);
        removeAllSources(this);
        this.disposeChildren();
      },
      disposeChildren() {
        if (this.children) {
          this.children.forEach(child => child.dispose());
          this.children = null; 
        }        
      },
      addChild(child) {
        if (!this.children) this.children = [];
        this.children.push(child);
      },
      nextDirty : null,
      previousDirty : null,
      lastRepeatTime: 0,
      children: null
    }
  }

  function clearRepeaterLists() {
    observerId = 0;
    firstDirtyRepeater = null;
    lastDirtyRepeater = null;
  }

  function detatchRepeater(repeater) {
    if (lastDirtyRepeater === repeater) {
      lastDirtyRepeater = repeater.previousDirty;
    }
    if (firstDirtyRepeater === repeater) {
      firstDirtyRepeater = repeater.nextDirty;
    }
    if (repeater.nextDirty) {
      repeater.nextDirty.previousDirty = repeater.previousDirty;
    }
    if (repeater.previousDirty) {
      repeater.previousDirty.nextDirty = repeater.nextDirty;
    }
  }

  function modifyRepeaterAction(repeaterAction, {throttle=0, debounce=0}) {
    if (throttle > 0) {
      return function(repeater) {
        let time = Date.now();
        const timeSinceLastRepeat = time - repeater.lastRepeatTime;
        if (throttle > timeSinceLastRepeat) {
          const waiting = throttle - timeSinceLastRepeat
          setTimeout(() => { repeater.restart() }, waiting);
        } else {
          repeater.lastRepeatTime = time;
          return repeaterAction();
        }
      }
    } 

    if (debounce > 0) {
      // TODO
    }

    return repeaterAction;
  }

  function repeatOnChange() { // description(optional), action
    // Arguments
    let description = '';
    let repeaterAction;
    let repeaterNonRecordingAction = null;
    let options;

    const args = (arguments.length === 1 ?
                  [arguments[0]] :
                  Array.apply(null, arguments));
    
    if (typeof(args[0]) === 'string') {
      description = args.shift();
    } else if (requireRepeaterName) {
      throw new Error("Every repeater has to be given a name as first argument. Note: This requirement can be removed in the configuration.");
    }

    if (typeof(args[0]) === 'function') {
      repeaterAction = args.shift();
    }

    if (typeof(args[0]) === 'function' || args[0] === null) {
      repeaterNonRecordingAction = args.shift();
    }
    
    if (typeof(args[0]) === 'object') {
      options = args.shift();
    }
    if (!options) options = {};

    // Activate!
    const repeater = createRepeater(description, repeaterAction, repeaterNonRecordingAction, options);
    if (options.dependentOnParent && context.type === "repeater") {
      context.addChild(repeater);
    }
    return refreshRepeater(repeater);
  }

  function refreshRepeater(repeater) {
    const options = repeater.options;
    if (options.onRefresh) options.onRefresh(repeater);
        
    // Recorded action
    const activeContext = enterContext(repeater);
    repeater.returnValue = repeater.repeaterAction(repeater)

    // Non recorded action
    if (repeater.nonRecordedAction !== null) {
      repeater.nonRecordedAction( repeater.returnValue );
    }

    // Finish rebuilding
    if (repeater.newlyCreated) {
      if (options.onStartBuildUpdate) options.onStartBuildUpdate();
      
      const newIdMap = {}
      repeater.newlyCreated.forEach((created) => {
        newIdMap[created[objectMetaProperty].buildId] = created;
        if (created[objectMetaForwardToProperty] !== null) {
          // Push changes to established object.
          let forwardTo = created[objectMetaForwardToProperty];
          created[objectMetaForwardToProperty] = null;
          mergeInto(created, forwardTo);
        } else {
          // Send create on build message
          if (typeof(created.onReBuildCreate) === "function") created.onReBuildCreate();
        }
      });
      repeater.newlyCreated = [];

      // Send on build remove messages
      for (let id in repeater.buildIdObjectMap) {
        if (typeof(newIdMap[id]) === "undefined") {
          const object = repeater.buildIdObjectMap[id];
          if (typeof(object.onReBuildRemove) === "function") object.onReBuildRemove();
        }
      }

      // Set new map
      repeater.buildIdObjectMap = newIdMap;
      
      if (options.onEndBuildUpdate) options.onEndBuildUpdate();
    }

    leaveContext( activeContext );
    return repeater;
  }

  function repeaterDirty(repeater) { // TODO: Add update block on this stage?
    repeater.dispose();
    // disposeChildContexts(repeater);
    // disposeSingleChildContext(repeater);

    if (lastDirtyRepeater === null) {
      lastDirtyRepeater = repeater;
      firstDirtyRepeater = repeater;
    } else {
      lastDirtyRepeater.nextDirty = repeater;
      repeater.previousDirty = lastDirtyRepeater;
      lastDirtyRepeater = repeater;
    }

    refreshAllDirtyRepeaters();
  }

  function refreshAllDirtyRepeaters() {
    if (!refreshingAllDirtyRepeaters) {
      if (firstDirtyRepeater !== null) {
        refreshingAllDirtyRepeaters = true;
        while (firstDirtyRepeater !== null) {
          let repeater = firstDirtyRepeater;
          detatchRepeater(repeater);
          refreshRepeater(repeater);
        }

        refreshingAllDirtyRepeaters = false;
      }
    }
  }

  /***************************************************************
   *
   *  Debugging
   *
   ***************************************************************/
   
  function log(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    // objectlog.log(entity, pattern);
    console.log(entity, pattern);
    state.recordingPaused--;  
    updateContextState();
  }
  
  function logGroup(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    objectlog.group(entity, pattern);
    state.recordingPaused--;
    updateContextState();
  } 
  
  function logUngroup() {
    objectlog.groupEnd(); 
  } 

  function logToString(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    let result = objectlog.logToString(entity, pattern);
    state.recordingPaused--;
    updateContextState();
    return result;
  }
}
  
let instances = {};

export function instance(configuration) {
  if(!configuration) configuration = {};
  const signature = configSignature(configuration);
  
  if (typeof(instances[signature]) === 'undefined') {
    instances[signature] = createInstance(configuration);
  }
  return instances[signature];
}                                                                   