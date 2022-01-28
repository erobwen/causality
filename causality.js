import { argumentsToArray, configSignature, mergeInto } from "./lib/utility.js";
import { objectlog } from "./lib/objectlog.js";
import { createCachingFunction } from "./lib/caching.js";
import { defaultDependencyInterfaceCreator } from "./lib/defaultDependencyInterface.js";
const defaultObjectlog = objectlog;


/***************************************************************
 *
 *  Default coonfiguration
 *
 ***************************************************************/


const defaultConfiguration = {
  requireRepeaterName: false,
  requireInvalidatorName: false,
  warnOnNestedRepeater: true,
  alwaysDependOnParentRepeater: false,

  objectMetaProperty: "causality",

  useNonObservablesAsValues: false, 
  valueComparisonDepthLimit: 5, 

  sendEventsToObjects: true,
    // Reserved properties that you can override on observables IF sendEventsToObjects is set to true. 
    // onChange
    // onBuildCreate
    // onBuildRemove
  onEventGlobal: null,
  emitReBuildEvents: false,

  // allowNonObservableReferences: true, // Allow observables to refer to non referables. TODO?
  
  onWriteGlobal: null, 
  onReadGlobal: null, 
  cannotReadPropertyValue: null,

  customObjectlog: null,
  customDependencyInterfaceCreator: null, //{recordDependencyOnArray, recordDependencyOnEnumeration, recordDependencyOnProperty, recordDependency}
  customCreateInvalidator: null, 
  customCreateRepeater: null,
}


function createWorld(configuration) {
  // console.log(usedObjectlog)

  /***************************************************************
   *
   *  State
   *
   ***************************************************************/

  // Public state, shareable with other modules. 
  const state = {
    recordingPaused : 0,
    blockInvalidation : 0,
    postponeInvalidation : 0,
  
    // Object creation
    nextObjectId: 1,
  
    // Stack
    context: null,

    // Observers
    observerId: 0,
    inActiveRecording: false,
    nextObserverToInvalidate: null,
    lastObserverToInvalidate: null,

    // Repeaters
    inRepeater: null,
    firstDirtyRepeater: null,
    lastDirtyRepeater: null,
    refreshingAllDirtyRepeaters: false,
  };


  /************************************************************************
   *
   *  Instance
   *
   ************************************************************************/

  const world = {
    name: configuration.name,

    // Main API
    observable,
    create: observable, // observable alias
    invalidateOnChange,
    repeat,
    finalize: finishRebuildInAdvance,

    // Modifiers
    withoutRecording,
    withoutReactions,

    // Transaction
    postponeReactions,
    transaction : postponeReactions,

    // Debugging and testing
    clearRepeaterLists,
    
    // Logging (these log commands do automatic withoutRecording to avoid your logs destroying your test-setup) 
    log,
    loge : (string) => { usedObjectlog.loge(string) }, // "event"
    logs : () => { usedObjectlog.logs() }, // "separator"
    logss : () => { usedObjectlog.logss() },
    logsss : () => { usedObjectlog.logss() },
    logGroup,
    logUngroup,
    logToString,
    
    // Advanced (only if you know what you are doing, typically used by plugins to causality)
    state,
    enterContext,
    leaveContext,
    invalidateObserver, 
    nextObserverId: () => { return state.observerId++ },

    // Libraries
    caching: createCachingFunction(observable)
  }; 


  /***************************************************************
   *
   *  Customize
   *
   ***************************************************************/

  // Custom observer creators
  const createRepeater = configuration.customCreateRepeater ? configuration.customCreateRepeater : defaultCreateRepeater;
  const createInvalidator = configuration.customCreateInvalidator ? configuration.customCreateInvalidator : defaultCreateInvalidator;

  // Dependency interface (plugin data structures connecting observer and observable)
  const dependencyInterface = configuration.customDependencyInterfaceCreator ? 
    configuration.customDependencyInterfaceCreator(world) 
    : 
    defaultDependencyInterfaceCreator(world);
  const recordDependencyOnArray = dependencyInterface.recordDependencyOnArray;
  const recordDependencyOnEnumeration = dependencyInterface.recordDependencyOnEnumeration;
  const recordDependencyOnProperty = dependencyInterface.recordDependencyOnProperty;
  const invalidateArrayObservers = dependencyInterface.invalidateArrayObservers;
  const invalidateEnumerateObservers = dependencyInterface.invalidateEnumerateObservers;
  const invalidatePropertyObservers = dependencyInterface.invalidatePropertyObservers;
  const removeAllSources = dependencyInterface.removeAllSources;

  // Object log
  const usedObjectlog = configuration.customObjectlog ? configuration.customObjectlog : defaultObjectlog;

  // Object.assign(world, require("./lib/causalityObject.js").bindToInstance(world));


  /***************************************************************
   *
   *  Constants
   *
   ***************************************************************/

  const staticArrayOverrides = createStaticArrayOverrides();



  /****************************************************
   *
   *          Deploy configuration
   *
   ****************************************************/

  const {
    requireRepeaterName,
    requireInvalidatorName,
    warnOnNestedRepeater,
    objectMetaProperty,
    sendEventsToObjects,
    onEventGlobal,
    emitReBuildEvents,
    onWriteGlobal, 
    onReadGlobal, 
    cannotReadPropertyValue
  } = configuration;  

  const emitEvents = !!onEventGlobal || sendEventsToObjects; 

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
    state.inActiveRecording = state.context !== null && state.recordingPaused === 0;
    state.inRepeater = (state.context && state.context.type === "repeater") ? state.context: null;
  }

  function enterContext(enteredContext) {
    enteredContext.parent = state.context;
    state.context = enteredContext;
    updateContextState();
    return enteredContext;
  }

  function leaveContext( activeContext ) {    
    if( state.context && activeContext === state.context ) {
      state.context = state.context.parent;
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

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, index, [result], null);

        return result;
      },

      push : function() {
        let index = this.target.length;
        let argumentsArray = argumentsToArray(arguments);
        this.target.push.apply(this.target, argumentsArray);

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, index, null, argumentsArray);

        return this.target.length;
      },

      shift : function() {
        let result = this.target.shift();
        
        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, 0, [result], null);

        return result;

      },

      unshift : function() {
        let argumentsArray = argumentsToArray(arguments);
        this.target.unshift.apply(this.target, argumentsArray);

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, 0, null, argumentsArray);

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

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, index, removed, added);

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

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, target, added, removed);

        return result;
      }
    };

    ['reverse', 'sort', 'fill'].forEach(function(functionName) {
      result[functionName] = function() {
        let argumentsArray = argumentsToArray(arguments);
        let removed = this.target.slice(0);
        let result = this.target[functionName]
            .apply(this.target, argumentsArray);

        invalidateArrayObservers(this);
        if (emitEvents) emitSpliceEvent(this, 0, removed, this.target.slice(0));

        return result;
      };
    });

    return result;
  }


  /***************************************************************
   *
   *  Non observables as value types
   *
   ***************************************************************/

  function sameAsPrevious(previousValue, newValue) {
    if (configuration.useNonObservablesAsValues) return sameAsPreviousDeep(previousValue, newValue, configuration.valueComparisonDepthLimit);
    return (previousValue === newValue || Number.isNaN(previousValue) && Number.isNaN(newValue));
  }

  function sameAsPreviousDeep(previousValue, newValue, valueComparisonDepthLimit) {
    if ((previousValue === newValue || Number.isNaN(previousValue) && Number.isNaN(newValue))) return true;
    if (valueComparisonDepthLimit === 0) return false; // Cannot go further, cannot guarantee that they are the same.  
    if (typeof(previousValue) !== typeof(newValue)) return false; 
    if (typeof(previousValue) !== "object") return false;
    if (isObservable(previousValue) || isObservable(newValue)) return false;
    if (Object.keys(previousValue).length !== Object.keys(newValue).length) return false; 
    for(let property in previousValue) {
      if (!sameAsPreviousDeep(previousValue[property], newValue[property], valueComparisonDepthLimit - 1)) {
        return false;
      }
    }
    return true;
  }


  /***************************************************************
   *
   *  Array Handlers
   *
   ***************************************************************/

  function getHandlerArray(target, key) {
    if (key === objectMetaProperty) {
      return this.meta;
    } else if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.get.apply(forwardToHandler, [forwardToHandler.target, key]);
    } 

    if (onReadGlobal && !onReadGlobal(this, target, key)) { 
      return cannotReadPropertyValue;
    }

    if (staticArrayOverrides[key]) {
      return staticArrayOverrides[key].bind(this);
    } else {
      if (state.inActiveRecording) recordDependencyOnArray(state.context, this);
      return target[key];
    }
  }

  function setHandlerArray(target, key, value) {
    if (key === objectMetaProperty) throw new Error("Cannot set the dedicated meta property '" + objectMetaProperty + "'");

    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.set.apply(forwardToHandler, [forwardToHandler.target, key, value]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
      return;
    } 

    let previousValue = target[key];

    // If same value as already set, do nothing.
    if (key in target) {
      if (sameAsPrevious(previousValue, value)) {
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
        invalidateArrayObservers(this);
        emitSpliceReplaceEvent(this, key, value, previousValue);
      }
    } else {
      // String index
      target[key] = value;
      if( target[key] === value || (Number.isNaN(target[key]) &&
                                    Number.isNaN(value)) ) {
        invalidateArrayObservers(this);
        emitSetEvent(this, key, value, previousValue);
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

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
      return;
    } 

    if (!(key in target)) {
      return true;
    }

    let previousValue = target[key];
    delete target[key];
    if(!( key in target )) { // Write protected?
      invalidateArrayObservers(this);
      emitDeleteEvent(this, key, previousValue);
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

    if (state.inActiveRecording) recordDependencyOnArray(state.context, this);
    let result   = Object.keys(target);
    result.push('length');
    return result;
  }

  function hasHandlerArray(target, key) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.has.apply(forwardToHandler, [target, key]);
    }

    if (onReadGlobal && !onReadGlobal(this, target, key)) { 
      return cannotReadPropertyValue;
    }

    if (state.inActiveRecording) recordDependencyOnArray(state.context, this);
    return key in target;
  }

  function definePropertyHandlerArray(target, key, oDesc) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.defineProperty.apply(
        forwardToHandler, [forwardToHandler.target, key, oDesc]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
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

    if (onReadGlobal && !onReadGlobal(this, target, key)) { 
      return cannotReadPropertyValue;
    }

    if (state.inActiveRecording) recordDependencyOnArray(state.context, this);
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Object Handlers
   *
   ***************************************************************/


  function getHandlerObject(target, key) {
    key = key.toString();

    if (key === objectMetaProperty) {
      return this.meta;
    } else if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      let result = forwardToHandler.get.apply(forwardToHandler, [forwardToHandler.target, key]);
      return result;
    }
       
    if (onReadGlobal && !onReadGlobal(this, target, key)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue; 
    }

    if (typeof(key) !== 'undefined') {
      if (state.inActiveRecording) recordDependencyOnProperty(state.context, this, key);

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

  function setHandlerObject(target, key, value) {
    if (key === objectMetaProperty) throw new Error("Cannot set the dedicated meta property '" + objectMetaProperty + "'");

    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.set.apply(forwardToHandler, [forwardToHandler.target, key, value]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
      return;
    } 

    let previousValue = target[key];

    // If same value as already set, do nothing.
    if (key in target) {
      if (sameAsPrevious(previousValue, value)) {
        return true;
      }
    } // TODO: It would be even safer if we write protected non observable data structures that are assigned, if we are using mode: useNonObservablesAsValues

    let undefinedKey = !(key in target);
    target[key]      = value;
    let resultValue  = target[key];
    if( resultValue === value || (Number.isNaN(resultValue) &&
                                  Number.isNaN(value)) ) {
      // Write protected?
      invalidatePropertyObservers(this, key);
      if (undefinedKey) invalidateEnumerateObservers(this);
    }

    emitSetEvent(this, key, value, previousValue);

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

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
      return;
    } 

    if (!(key in target)) {
      return true;
    } else {
      let previousValue = target[key];
      delete target[key];
      if(!( key in target )) { // Write protected?
        invalidatePropertyObservers(this, key);
        invalidateEnumerateObservers(this);
        emitDeleteEvent(this, key, previousValue);
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

    if (onReadGlobal && !onReadGlobal(this, target, key)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (state.inActiveRecording) recordDependencyOnEnumeration(state.context, this);

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

    if (onReadGlobal && !onReadGlobal(this, target, key)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (state.inActiveRecording) recordDependencyOnEnumeration(state.context, this)
    return key in target;
  }

  function definePropertyHandlerObject(target, key, descriptor) {
    if (this.meta.forwardTo !== null) {
      let forwardToHandler = this.meta.forwardTo[objectMetaProperty].handler;
      return forwardToHandler.defineProperty.apply(
        forwardToHandler, [forwardToHandler.target, key]);
    }

    if (onWriteGlobal && !onWriteGlobal(this, target, key)) {
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

    if (onReadGlobal && !onReadGlobal(this, target, key)) { //Used for ensureInitialized, registerActivity & canRead 
      return cannotReadPropertyValue;
    }
 
    if (state.inActiveRecording) recordDependencyOnEnumeration(state.context, this)
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Create
   *
   ***************************************************************/

  function isObservable(entity) {
    return typeof(entity) === "object" && typeof(entity[objectMetaProperty]) === "object" && entity[objectMetaProperty].world === world; 
  }


  function observable(createdTarget, buildId) {
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
      world: world,
      id: state.nextObjectId++,
      buildId : buildId,
      forwardTo : null,
      target: createdTarget,
      handler : handler,
      proxy : proxy,

      // Here to avoid prevent events being sent to objects being rebuilt. 
      isBeingRebuilt: false, 
    };

    if (state.inRepeater !== null && buildId !== null) {
      const repeater = state.inRepeater;
      if (!repeater.newBuildIdObjectMap) repeater.newBuildIdObjectMap = {};
      if (!repeater.newIdObjectMap) repeater.newIdObjectMap = {};
      
      if (repeater.buildIdObjectMap && typeof(repeater.buildIdObjectMap[buildId]) !== 'undefined') {
        // Object identity previously created
        handler.meta.isBeingRebuilt = true;
        let establishedObject = repeater.buildIdObjectMap[buildId];
        establishedObject[objectMetaProperty].forwardTo = proxy;

        repeater.newBuildIdObjectMap[buildId] = establishedObject;
        return establishedObject;
      } else {
        // Create a new one
        repeater.newBuildIdObjectMap[buildId] = proxy;
      }
    }
    emitCreationEvent(handler);
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

    if (!emitReBuildEvents && handler.meta.isBeingRebuilt) {
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
      while (state.nextObserverToInvalidate !== null) {
        let observer = state.nextObserverToInvalidate;
        state.nextObserverToInvalidate = state.nextObserverToInvalidate.nextToNotify;
        // blockSideEffects(function() {
        observer.invalidateAction();
        // });
      }
      state.lastObserverToInvalidate = null;
    }
  }

  function invalidateObserver(observer) {
    if (observer != state.context) {
      // if( trace.contextMismatch && state.context && state.context.id ){
      //   console.log("invalidateObserver mismatch " + observer.type, observer.id||'');
      //   if( !state.context ) console.log('current state.context null');
      //   else {
      //     console.log("current state.context " + state.context.type, state.context.id||'');
      //     if( state.context.parent ){
      //       console.log("parent state.context " + state.context.parent.type, state.context.parent.id||'');
      //     }
      //   }
      // }
      
      observer.dispose(); // Cannot be any more dirty than it already is!
      if (state.postponeInvalidation > 0) {
        if (state.lastObserverToInvalidate !== null) {
          state.lastObserverToInvalidate.nextToNotify = observer;
        } else {
          state.nextObserverToInvalidate = observer;
        }
        state.lastObserverToInvalidate = observer;
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
      id: state.observerId++,
      description: description,
      sources : [],
      nextToNotify: null,
      invalidateAction: doAfterChange,
      dispose : function() {
        removeAllSources(this);
      },
      record : function( action ){
        if( state.context == this || this.isRemoved ) return action();
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


  function defaultCreateRepeater(description, repeaterAction, repeaterNonRecordingAction, options, finishRebuilding) {
    return {
      type: "repeater", 
      id: state.observerId++,
      firstTime: true, 
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
      waitOnNonRecordedAction: 0,
      children: null,
      refresh() {
        const repeater = this; 
        const options = repeater.options;
        if (options.onRefresh) options.onRefresh(repeater);
            
        // Recorded action (cause and/or effect)
        const activeContext = enterContext(repeater);
        repeater.returnValue = repeater.repeaterAction(repeater)

        // Non recorded action (only effect)
        const { debounce=0, fireImmediately=true } = options; 
        if (repeater.nonRecordedAction !== null) {
          if (debounce === 0 || this.firstTime) {
            if (fireImmediately || !this.firstTime) repeater.nonRecordedAction( repeater.returnValue );
          } else {
            if (repeater.waitOnNonRecordedAction) clearTimeout(repeater.waitOnNonRecordedAction);
            repeater.waitOnNonRecordedAction = setTimeout(() => {
              repeater.nonRecordedAction( repeater.returnValue );
              repeater.waitOnNonRecordedAction = null;
            }, debounce);
          }
        } else if (debounce > 0) {
          throw new Error("Debounce has to be used together with a non-recorded action.");
        }

        // Finish rebuilding
        if (repeater.newBuildIdObjectMap && Object.keys(repeater.newBuildIdObjectMap).length > 0) finishRebuilding(this);

        leaveContext( activeContext );
        this.firstTime = false; 
        return repeater;
      }
    }
  }

  function clearRepeaterLists() {
    state.observerId = 0;
    state.firstDirtyRepeater = null;
    state.lastDirtyRepeater = null;
  }

  function detatchRepeater(repeater) {
    if (state.lastDirtyRepeater === repeater) {
      state.lastDirtyRepeater = repeater.previousDirty;
    }
    if (state.firstDirtyRepeater === repeater) {
      state.firstDirtyRepeater = repeater.nextDirty;
    }
    if (repeater.nextDirty) {
      repeater.nextDirty.previousDirty = repeater.previousDirty;
    }
    if (repeater.previousDirty) {
      repeater.previousDirty.nextDirty = repeater.nextDirty;
    }
  }

  function finishRebuilding(repeater) {
    const options = repeater.options;
    if (options.onStartBuildUpdate) options.onStartBuildUpdate();

    for (let buildId in repeater.newBuildIdObjectMap) {
      let created = repeater.newBuildIdObjectMap[buildId]; 
      const temporaryObject = created[objectMetaProperty].forwardTo;
      if (temporaryObject !== null) {
        // Push changes to established object.
        created[objectMetaProperty].forwardTo = null;
        // created[objectMetaProperty].isBeingRebuilt = false; // Consider? Should this be done on 
        temporaryObject[objectMetaProperty].isBeingRebuilt = false; 
        mergeInto(created, temporaryObject);
      } else {
        // Send create on build message
        if (typeof(created.onReBuildCreate) === "function") created.onReBuildCreate();
      }
    }

    // Send on build remove messages
    for (let buildId in repeater.buildIdObjectMap) {
      if (typeof(repeater.newBuildIdObjectMap[buildId]) === "undefined") {
        const object = repeater.buildIdObjectMap[buildId];
        if (typeof(object.onReBuildRemove) === "function") object.onReBuildRemove();
      }
    }
    
    // Set new map
    repeater.buildIdObjectMap = repeater.newBuildIdObjectMap;
    repeater.newBuildIdObjectMap = {};
    
    if (options.onEndBuildUpdate) options.onEndBuildUpdate();
  }

  function finishRebuildInAdvance(object) {
    if (!state.inRepeater) throw Error ("Trying to finish rebuild in advance while not being in a repeater!");
    if (!object[objectMetaProperty].buildId) throw Error("Trying to finish rebuild in advance for an object without a buildId. Perhaps it should have a build id? Add one as second argument in the call to observable");
    const temporaryObject = object[objectMetaProperty].forwardTo;
    if (temporaryObject !== null) {
      // Push changes to established object.
      object[objectMetaProperty].forwardTo = null;
      temporaryObject[objectMetaProperty].isBeingRebuilt = false; 
      mergeInto(object, temporaryObject);
    } else {
      // New object, nothing to merge.
    }
  }

  function modifyRepeaterAction(repeaterAction, {throttle=0}) {
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

    return repeaterAction;
  }

  function repeat() { // description(optional), action
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

    if( warnOnNestedRepeater && state.inActiveRecording ){
      let parentDesc = state.context.description;
      if( !parentDesc && state.context.parent ) parentDesc = state.context.parent.description;
      if( !parentDesc ){
        parentDesc = 'unnamed';
      }
      console.warn(Error(`repeater ${description||'unnamed'} inside active recording ${parentDesc}`));
    }
    
    // Activate!
    const repeater = createRepeater(description, repeaterAction, repeaterNonRecordingAction, options, finishRebuilding);
    if (state.context && state.context.type === "repeater" && (options.dependentOnParent || configuration.alwaysDependOnParentRepeater)) {
      state.context.addChild(repeater);
    }
    return repeater.refresh();
  }


  function repeaterDirty(repeater) { // TODO: Add update block on this stage?
    repeater.dispose();
    // disposeChildContexts(repeater);
    // disposeSingleChildContext(repeater);

    if (state.lastDirtyRepeater === null) {
      state.lastDirtyRepeater = repeater;
      state.firstDirtyRepeater = repeater;
    } else {
      state.lastDirtyRepeater.nextDirty = repeater;
      repeater.previousDirty = state.lastDirtyRepeater;
      state.lastDirtyRepeater = repeater;
    }

    refreshAllDirtyRepeaters();
  }

  function refreshAllDirtyRepeaters() {
    if (!state.refreshingAllDirtyRepeaters) {
      if (state.firstDirtyRepeater !== null) {
        state.refreshingAllDirtyRepeaters = true;
        while (state.firstDirtyRepeater !== null) {
          let repeater = state.firstDirtyRepeater;
          detatchRepeater(repeater);
          repeater.refresh();
        }

        state.refreshingAllDirtyRepeaters = false;
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
    usedObjectlog.log(entity, pattern);
    // console.log(entity, pattern);
    state.recordingPaused--;  
    updateContextState();
  }
  
  function logGroup(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    usedObjectlog.group(entity, pattern);
    state.recordingPaused--;
    updateContextState();
  } 
  
  function logUngroup() {
    usedObjectlog.groupEnd(); 
  } 

  function logToString(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    let result = usedObjectlog.logToString(entity, pattern);
    state.recordingPaused--;
    updateContextState();
    return result;
  }


  /************************************************************************
   *
   *  Return world
   *
   ************************************************************************/

  return world;
}
  
let worlds = {};

export function getWorld(configuration) {
  if(!configuration) configuration = {};
  configuration = {...defaultConfiguration, ...configuration};
  const signature = configSignature(configuration);
  
  if (typeof(worlds[signature]) === 'undefined') {
    worlds[signature] = createWorld(configuration);
  }
  return worlds[signature];
}

export default getWorld;