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
    nextTempObjectId: 1,
  
    // Stack
    context: null,

    // Observers
    observerId: 0,
    inActiveRecording: false,
    nextObserverToInvalidate: null,
    lastObserverToInvalidate: null,

    // Repeaters
    inRepeater: null,
    dirtyRepeaters: [
      // 8 priority levels
      {first: null, last: null}, 
      {first: null, last: null}, 
      {first: null, last: null}, 
      {first: null, last: null}, 
      {first: null, last: null}, 
      {first: null, last: null},
      {first: null, last: null},
      {first: null, last: null}
    ],
    refreshingAllDirtyRepeaters: false,
  };


  /************************************************************************
   *
   *  Instance
   *
   ************************************************************************/

  const world = {
    name: configuration.name,
    sameAsPreviousDeep,
    
    // Main API
    observable,
    isObservable,
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
    state.inActiveRecording = state.context !== null && state.context.isRecording && state.recordingPaused === 0;
    state.inRepeater = (state.context && state.context.type === "repeater") ? state.context: null;
  }

  // function stackDescription() {
  //   const descriptions = [];
  //   let context = state.context;
  //   while (context) {
  //     descriptions.unshift(context.description);
  //     context = context.parent;
  //   }
  //   return descriptions.join(" | ");
  // }

  function enterContext(enteredContext) {
    // console.log("stack: [" + stackDescription() + "]");
    enteredContext.parent = state.context;
    state.context = enteredContext;
    updateContextState();
    return enteredContext;
  }

  function leaveContext( activeContext ) {
    // console.log("stack: [" + stackDescription() + "]");
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

        invalidateArrayObservers(this, "pop");
        if (emitEvents) emitSpliceEvent(this, index, [result], null);

        return result;
      },

      push : function() {
        let index = this.target.length;
        let argumentsArray = argumentsToArray(arguments);
        this.target.push.apply(this.target, argumentsArray);

        invalidateArrayObservers(this, "push");
        if (emitEvents) emitSpliceEvent(this, index, null, argumentsArray);

        return this.target.length;
      },

      shift : function() {
        let result = this.target.shift();
        
        invalidateArrayObservers(this, "shift");
        if (emitEvents) emitSpliceEvent(this, 0, [result], null);

        return result;

      },

      unshift : function() {
        let argumentsArray = argumentsToArray(arguments);
        this.target.unshift.apply(this.target, argumentsArray);

        invalidateArrayObservers(this, "unshift");
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

        invalidateArrayObservers(this, "splice");
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

        invalidateArrayObservers(this, "copyWithin");
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

        invalidateArrayObservers(this, functionName);
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
    if (typeof(valueComparisonDepthLimit) === "undefined") valueComparisonDepthLimit = 8;
    if (previousValue === null && newValue === null) return true;
    if ((previousValue === newValue || Number.isNaN(previousValue) && Number.isNaN(newValue))) return true;
    if (valueComparisonDepthLimit === 0) return false; // Cannot go further, cannot guarantee that they are the same.  
    if (typeof(previousValue) !== typeof(newValue)) return false; 
    if (typeof(previousValue) !== "object") return false;
    if ((previousValue === null) || (newValue === null)) return false; 
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
        invalidateArrayObservers(this, key);
        emitSpliceReplaceEvent(this, key, value, previousValue);
      }
    } else {
      // String index
      target[key] = value;
      if( target[key] === value || (Number.isNaN(target[key]) &&
                                    Number.isNaN(value)) ) {
        invalidateArrayObservers(this, key);
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
      invalidateArrayObservers(this, "delete");
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

    invalidateArrayObservers(this, key);
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
      // use? && (typeof(target[key]) === "undefined" || Object.prototype.hasOwnProperty.call(target, key))

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
      if (undefinedKey) invalidateEnumerateObservers(this, key);
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
        invalidateEnumerateObservers(this, key);
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
 
    invalidateEnumerateObservers(this, "define property");
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
    return entity !== null && typeof(entity) === "object" && typeof(entity[objectMetaProperty]) === "object" && entity[objectMetaProperty].world === world; 
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
      id: "not yet", // Wait for rebuild analysis
      buildId : buildId,
      forwardTo : null,
      target: createdTarget,
      handler : handler,
      proxy : proxy,

      // Here to avoid prevent events being sent to objects being rebuilt. 
      isBeingRebuilt: false, 
    };

    if (state.inRepeater !== null) {
      const repeater = state.inRepeater;
      if (buildId !== null) {
        if (!repeater.newBuildIdObjectMap) repeater.newBuildIdObjectMap = {};
        if (repeater.buildIdObjectMap && typeof(repeater.buildIdObjectMap[buildId]) !== 'undefined') {
          // Build identity previously created
          handler.meta.isBeingRebuilt = true;
          let establishedObject = repeater.buildIdObjectMap[buildId];
          establishedObject[objectMetaProperty].forwardTo = proxy;
          if (repeater.options.rebuildShapeAnalysis) handler.meta.copyTo = establishedObject;
          
          handler.meta.id = "temp-" + state.nextTempObjectId++;
          repeater.newBuildIdObjectMap[buildId] = establishedObject;
          proxy = establishedObject;
          handler = proxy[objectMetaProperty].handler;
          emitReCreationEvent(establishedObject[objectMetaProperty].handler);
        } else {
          // Create a new one with build identity
          handler.meta.id = state.nextObjectId++;
          handler.meta.pendingOnEstablishCall = true; 
          repeater.newBuildIdObjectMap[buildId] = proxy;

          emitCreationEvent(handler);
        }
        if (repeater.options.rebuildShapeAnalysis) {
          if (!repeater.newIdObjectShapeMap) repeater.newIdObjectShapeMap = {};
          repeater.newIdObjectShapeMap[handler.meta.id] = proxy
        }
      } else if (repeater.options.rebuildShapeAnalysis){
        // No build identity but with shape analysis turned on. Could be a creation or recreation, so we have to postpone any event! 
        handler.meta.id = state.nextObjectId++;
        handler.meta.pendingCreationEvent = true; 
        if (!repeater.newIdObjectShapeMap) repeater.newIdObjectShapeMap = {};
        repeater.newIdObjectShapeMap[handler.meta.id] = proxy
      } else {
        // No build identity and no shape analysis! As a normal creation! 
        handler.meta.id = state.nextObjectId++;
        emitCreationEvent(handler);  
      }
    } else {
      handler.meta.id = state.nextObjectId++;
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

  function emitReCreationEvent(handler) {
    if (emitEvents) {
      emitEvent(handler, {type: 'reCreate'})
    }
  }

  function emitCreationEvent(handler) {
    if (emitEvents) {
      emitEvent(handler, {type: 'create'})
    }
  }
  
  function emitDisposeEvent(handler) {
    if (emitEvents) {
      emitEvent(handler, {type: 'dispose'})
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

  function invalidateObserver(observer, proxy, key) {
    let observerActive = false
    let scannedContext = state.context;
    while(scannedContext) {
      if (scannedContext === observer) {
        observerActive = true;
        break;
      }
      scannedContext = scannedContext.parent;
    } 

    if (!observerActive) {
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
      
      observer.invalidatedInContext = state.context;
      observer.invalidatedByKey = key;
      observer.invalidatedByObject = proxy;
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
        observer.invalidateAction(key);
        // });
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
      createdCount:0,
      createdTemporaryCount:0,
      removedCount:0,
      isRecording: true,  
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
      createdCount:0,
      createdTemporaryCount:0,
      removedCount:0,
      isRecording: true,  
      type: "repeater", 
      id: state.observerId++,
      firstTime: true, 
      description: description,
      sources : [],
      nextToNotify: null,
      repeaterAction : modifyRepeaterAction(repeaterAction, options),
      nonRecordedAction: repeaterNonRecordingAction,
      options: options ? options : {},
      finishRebuilding() {
          finishRebuilding(this);
      },
      priority() {
        return typeof(this.options.priority) !== "undefined" ? this.options.priority : 0; 
      },
      causalityString() {
        const context = this.invalidatedInContext;
        const object = this.invalidatedByObject;
        if (!object) return "Repeater started: " + this.description 
        const key = this.invalidatedByKey; 
        // let objectClassName;
        // withoutRecording(() => {
        //   objectClassName = object.constructor.name;
        // });

        const contextString = (context ? context.description : "outside repeater/invalidator") 
        // const causeString = objectClassName + ":" + (object.causality.buildId ? object.causality.buildId : object.causality.id) + "." + key + " (modified)";
        const causeString = "  " + object.toString() + "." + key + "";
        const effectString = "" + this.description + "";

        return "(" + contextString + ")" + causeString + " --> " +  effectString;
      },
      creationString() {
        let result = "{";
        result += "created: " + this.createdCount + ", ";
        result += "createdTemporary:" + this.createdTemporaryCount + ", ";
        result += "removed:" + this.removedCount + "}";
        return result;
      },
      sourcesString() {
        let result = "";
        for (let source of this.sources) {
          while (source.parent) source = source.parent;
          result += source.handler.proxy.toString() + "." + source.key + "\n";
        }
        return result;
      },
      restart() {
        this.invalidateAction();
      },
      invalidateAction() {
        removeAllSources(this);
        repeaterDirty(this);
        this.disposeChildren();
      },
      dispose() {
        // Dispose all created objects? 
        // if(this.buildIdObjectMap) {
        //   for (let key in this.buildIdObjectMap) {
        //     const object = this.buildIdObjectMap[key]; 
        //     if (typeof(object.onDispose) === "function") object.onDispose();
        //   }
        // }
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
        
        repeater.finishedRebuilding = false; 
        repeater.createdCount = 0;
        repeater.createdTemporaryCount = 0;
        repeater.removedCount = 0; 

        // Recorded action (cause and/or effect)
        repeater.isRecording = true; 
        const activeContext = enterContext(repeater);
        repeater.returnValue = repeater.repeaterAction(repeater);
        repeater.isRecording = false; 
        updateContextState()

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
        finishRebuilding(this);

        this.firstTime = false; 
        leaveContext( activeContext );
        return repeater;
      }
    }
  }

  function clearRepeaterLists() {
    state.observerId = 0;
    state.dirtyRepeaters.map(list => {list.first = null; list.last = null;});
  }

  function detatchRepeater(repeater) {
    const priority = repeater.priority(); // repeater
    const list = state.dirtyRepeaters[priority];
    if (list.last === repeater) {
      list.last = repeater.previousDirty;
    }
    if (list.first === repeater) {
      list.first = repeater.nextDirty;
    }
    if (repeater.nextDirty) {
      repeater.nextDirty.previousDirty = repeater.previousDirty;
    }
    if (repeater.previousDirty) {
      repeater.previousDirty.nextDirty = repeater.nextDirty;
    }
    repeater.nextDirty = null;
    repeater.previousDirty = null;
  }

  function reBuildShapeAnalysis(repeater, shapeAnalysis) {
    let visited = {};
    
    function setAsMatch(newObject, establishedObject) {
      establishedObject[objectMetaProperty].forwardTo = newObject;
      newObject[objectMetaProperty].copyTo = establishedObject;
      if (newObject[objectMetaProperty].pendingCreationEvent) {
        delete newObject[objectMetaProperty].pendingCreationEvent;
        establishedObject[objectMetaProperty].pendingCreationEvent = true;
      } 
      delete repeater.newIdObjectShapeMap[newObject[objectMetaProperty].id];
      repeater.newIdObjectShapeMap[establishedObject[objectMetaProperty].id] = establishedObject;
    }

    function canMatchAny(entity) {
      return isObservable(entity) && !entity[objectMetaProperty].buildId;
    }

    function matchInEquivalentSlot(newObject, establishedObject) {
      if (!isObservable(newObject)) return; 
      // if (newObject.buildId)
      const newObjectId = newObject[objectMetaProperty].id;
      
      if (!repeater.newIdObjectShapeMap[newObjectId]) return; // Limit search! otherwise we could go off road!
      if (visited[newObjectId]) return; // Already done!
      visited[newObjectId] = 1; // Visited, but no recursive analysis

      if (!establishedObject) {
        // Continue to search new data for a non finalized buildId matched object where we can once again find an established data structure.
        for (let slots of shapeAnalysis.slotsIterator(newObject[objectMetaProperty].target, null, canMatchAny)) {
          matchInEquivalentSlot(slots.newSlot, null);
        }
      } else if (newObject !== establishedObject) {
        // Different in same slot
        if (!isObservable(newObject)
          || newObject[objectMetaProperty].buildId
          || !isObservable(establishedObject)
          || establishedObject[objectMetaProperty].buildId) {
          return; 
        }
        
        if (!shapeAnalysis.canMatch(newObject, establishedObject)) return;
        setAsMatch(newObject, establishedObject);

        for (let slots of shapeAnalysis.slotsIterator(newObject[objectMetaProperty].target, establishedObject[objectMetaProperty].target, canMatchAny)) {
          matchInEquivalentSlot(slots.newSlot, slots.establishedSlot);
        }
      } else {
        // Same in same slot, or no established, a buildId must have been used.
        const temporaryObject = newObject[objectMetaProperty].forwardTo; 
        if (temporaryObject) {
          // Not finalized, there is still an established state to compare to
          for (let slots of shapeAnalysis.slotsIterator(temporaryObject[objectMetaProperty].target, newObject[objectMetaProperty].target, canMatchAny)) {
            matchInEquivalentSlot(slots.newSlot, slots.establishedSlot);
          }
        } else {
          // Is finalized already, no established state available.
          for (let slots of shapeAnalysis.slotsIterator(newObject[objectMetaProperty].target, null, canMatchAny)) {
            matchInEquivalentSlot(slots.newSlot, null);
          }
        }
      }
    }
    
    const shapeRoot = shapeAnalysis.shapeRoot();
    matchInEquivalentSlot(shapeRoot, repeater.establishedShapeRoot);
  }

  function finishRebuilding(repeater) {
    if (repeater.finishedRebuilding) return; 
    
    const options = repeater.options;
    if (options.onStartBuildUpdate) options.onStartBuildUpdate();
    
    function translateReference(reference) {
      if (isObservable(reference)) {
        if (reference.causality.copyTo) {
          return reference.causality.copyTo;
        }
      }
      return reference;
    }

    // Do shape analysis to find additional matches. 
    if (repeater.options.rebuildShapeAnalysis) {
      reBuildShapeAnalysis(repeater, repeater.options.rebuildShapeAnalysis);

      // Translate references
      for(let id in repeater.newIdObjectShapeMap) {
        let object = repeater.newIdObjectShapeMap[id];
        let target;
        const temporaryObject = object[objectMetaProperty].forwardTo; 
        if (temporaryObject) {
          target = temporaryObject[objectMetaProperty].target;
        } else {
          target = object[objectMetaProperty].target;
        }
        if (repeater.options.rebuildShapeAnalysis.translateReferences) {
          repeater.options.rebuildShapeAnalysis.translateReferences(target, translateReference);
        } else {
          for (let property in target) {
            target[property] = translateReference(target[property])
          }
        }
      }

      // Save translated root for next run
      repeater.establishedShapeRoot = translateReference(repeater.options.rebuildShapeAnalysis.shapeRoot())

      // Merge those set for mergeing
      for(let id in repeater.newIdObjectShapeMap) {
        let object = repeater.newIdObjectShapeMap[id];
        const temporaryObject = object[objectMetaProperty].forwardTo;
        if (temporaryObject) {
          temporaryObject[objectMetaProperty].copyTo = null;
          object[objectMetaProperty].forwardTo = null;
          mergeInto(object, temporaryObject[objectMetaProperty].target);

          // Send recreate event
          if (object[objectMetaProperty].pendingCreationEvent) {
            delete object[objectMetaProperty].pendingCreationEvent;
            emitReCreationEvent(object[objectMetaProperty].handler);
          }
        } else {
          // Send create event
          if (object[objectMetaProperty].pendingCreationEvent) {
            delete object[objectMetaProperty].pendingCreationEvent;
            emitCreationEvent(object[objectMetaProperty].handler);
          }
          if (typeof(object[objectMetaProperty].target.onEstablish) === "function") object.onEstablish();
        }
      }

      // Send dispose event
      if (repeater.idObjectShapeMap) {
        for (let id in repeater.idObjectShapeMap) {
          if (typeof(repeater.newIdObjectShapeMap[id]) === "undefined") {
            const object = repeater.idObjectShapeMap[id];
            const objectTarget = object[objectMetaProperty].target;
            // console.log("Dispose object: " + objectTarget.constructor.name + "." + object[objectMetaProperty].id)
            emitDisposeEvent(object[objectMetaProperty].handler);
            if (typeof(objectTarget.onDispose) === "function") object.onDispose();
          }
        }
      }
    } else {
      // Merge those with build ids. 
      for (let buildId in repeater.newBuildIdObjectMap) {
        let created = repeater.newBuildIdObjectMap[buildId];
        const temporaryObject = created[objectMetaProperty].forwardTo;
        if (temporaryObject !== null) {
          // Push changes to established object.
          created[objectMetaProperty].forwardTo = null;
          // created[objectMetaProperty].isBeingRebuilt = false; // Consider? Should this be done on 
          temporaryObject[objectMetaProperty].isBeingRebuilt = false; 
          mergeInto(created, temporaryObject[objectMetaProperty].target);
        } else {
          // Send create on build message
          if (typeof(created.onEstablish) === "function") created.onEstablish();
        }
      }

      // Send on build remove messages
      if (repeater.buildIdObjectMap) {
        for (let buildId in repeater.buildIdObjectMap) {
          if (typeof(repeater.newBuildIdObjectMap[buildId]) === "undefined") {
            const object = repeater.buildIdObjectMap[buildId];
            const objectTarget = object[objectMetaProperty].target;
            // console.log("Dispose object: " + objectTarget.constructor.name + "." + object[objectMetaProperty].id)
            emitDisposeEvent(object[objectMetaProperty].handler);
            if (typeof(objectTarget.onDispose) === "function") objectTarget.onDispose();
          }
        }
      }
    }
    
    // Set new buildId map
    repeater.buildIdObjectMap = repeater.newBuildIdObjectMap;
    repeater.newBuildIdObjectMap = {};

    // Set new id map
    repeater.idObjectShapeMap = repeater.newIdObjectShapeMap;
    repeater.newIdObjectShapeMap = {};
    
    repeater.finishedRebuilding = true;
    if (options.onEndBuildUpdate) options.onEndBuildUpdate();
  }

  function finishRebuildInAdvance(object) {
    const temporaryObject = object[objectMetaProperty].forwardTo;
    if (!temporaryObject) return object; 
    if (!state.inRepeater) throw Error ("Trying to finish rebuild in advance while not being in a repeater!");
    if (!object[objectMetaProperty].buildId) throw Error("Trying to finish rebuild in advance for an object without a buildId. A build id is required for this to work.");
    if (temporaryObject !== null) {
      // Push changes to established object.
      object[objectMetaProperty].forwardTo = null;
      temporaryObject[objectMetaProperty].isBeingRebuilt = false; 
      mergeInto(object, temporaryObject[objectMetaProperty].target);
    } else {
      // Send create on build message
      const objectMeta = object[objectMetaProperty];
      if (objectMeta.pendingOnEstablishCall) {
        delete objectMeta.pendingOnEstablishCall;
        if (typeof(object.onEstablish) === "function") object.onEstablish(); // use object not target to get correct this in function call?
      }
    }

    return object; 
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

    const priorityList = state.dirtyRepeaters; 
    const index = repeater.priority(); 
    const list = priorityList[index];
    if (list.last === null) {
      list.last = repeater;
      list.first = repeater;
    } else {
      list.last.nextDirty = repeater;
      repeater.previousDirty = list.last;
      list.last = repeater;
    }

    refreshAllDirtyRepeaters();
  }

  function anyDirtyRepeater() {
    const priorityList = state.dirtyRepeaters; 
    return priorityList[0].first !== null
      || priorityList[1].first !== null
      || priorityList[2].first !== null
      || priorityList[3].first !== null
      || priorityList[4].first !== null
      || priorityList[5].first !== null
      || priorityList[6].first !== null
      || priorityList[7].first !== null;
  }

  function firstDirtyRepeater() {
    const priorityList = state.dirtyRepeaters; 
    let index = 0; 
    while (index < priorityList.length) {
      if (priorityList[index].first) {
        return priorityList[index].first;
      }
    }
    return null; 
  }

  function refreshAllDirtyRepeaters() {
    if (!state.refreshingAllDirtyRepeaters) {
      if (anyDirtyRepeater()) {
        state.refreshingAllDirtyRepeaters = true;
        while (anyDirtyRepeater()) {
          let repeater = firstDirtyRepeater();
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