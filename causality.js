'use strict'; 
// require = require("esm")(module);
const { argumentsToArray, configSignature } = require("./lib/utility.js");


function createInstance(configuration) {

  const {
    objectCallbacks = true,
    emitEvents,
    onChangeGlobal,
    requireRepeaterName = false,
  } = configuration; 

  /***************************************************************
   *
   *  State
   *
   ***************************************************************/

  const state = {
    recordingPaused : 0,
    observerNotificationNullified : 0,
    observerNotificationPostponed : 0
  };


  /***************************************************************
   *
   *  Array overrides
   *
   ***************************************************************/

  let staticArrayOverrides = {
    pop : function() {
      let index = this.target.length - 1;
      state.observerNotificationNullified++;
      let result = this.target.pop();
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, index, [result], null);
      return result;
    },

    push : function() {
      let index = this.target.length;
      let argumentsArray = argumentsToArray(arguments);
      state.observerNotificationNullified++;
      this.target.push.apply(this.target, argumentsArray);
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, index, null, argumentsArray);
      return this.target.length;
    },

    shift : function() {
      state.observerNotificationNullified++;
      let result = this.target.shift();
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, 0, [result], null);
      return result;

    },

    unshift : function() {
      let argumentsArray = argumentsToArray(arguments);
      state.observerNotificationNullified++;
      this.target.unshift.apply(this.target, argumentsArray);
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, 0, null, argumentsArray);
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
      state.observerNotificationNullified++;
      let result = this.target.splice.apply(this.target, argumentsArray);
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, index, removed, added);
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

      state.observerNotificationNullified++;
      let result = this.target.copyWithin(target, start, end);
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }

      emitSpliceEvent(this, target, added, removed);
      return result;
    }
  };

  ['reverse', 'sort', 'fill'].forEach(function(functionName) {
    staticArrayOverrides[functionName] = function() {

      let argumentsArray = argumentsToArray(arguments);
      let removed = this.target.slice(0);

      state.observerNotificationNullified++;
      let result = this.target[functionName]
          .apply(this.target, argumentsArray);
      state.observerNotificationNullified--;
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
      emitSpliceEvent(this, 0, removed, this.target.slice(0));
      return result;
    };
  });

  let nextId = 1;
  function resetObjectIds() {
    nextId = 1;
  }


  /***************************************************************
   *
   *  Array Handlers
   *
   ***************************************************************/

  function getHandlerArray(target, key) {
    if (this.overrides.__overlay !== null &&
        (typeof(overlayBypass[key]) === 'undefined')) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.get.apply(overlayHandler,
                                      [overlayHandler.target, key]);
    }

    if (staticArrayOverrides[key]) {
      return staticArrayOverrides[key].bind(this);
    } else if (typeof(this.overrides[key]) !== 'undefined') {
      return this.overrides[key];
    } else {
      if (inActiveRecording) {
        if (this._arrayObservers === null) {
          this._arrayObservers = {};
        }
        registerAnyChangeObserver("_arrayObservers",
                                  this._arrayObservers);//object
      }
      return target[key];
    }
  }

  function setHandlerArray(target, key, value) {
    if (this.overrides.__overlay !== null) {
      if (key === "__overlay") {
        this.overrides.__overlay = value;
        return true;
      } else {
        let overlayHandler = this.overrides.__overlay.__handler;
        return overlayHandler.set.apply(
          overlayHandler, [overlayHandler.target, key, value]);
      }
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
        // Write protected?
        emitSpliceReplaceEvent(this, key, value, previousValue);
        if (this._arrayObservers !== null) {
          invalidateObservers("_arrayObservers",
                                this._arrayObservers);
        }
      }
    } else {
      // String index
      target[key] = value;
      if( target[key] === value || (Number.isNaN(target[key]) &&
                                    Number.isNaN(value)) ) {
        // Write protected?
        emitSetEvent(this, key, value, previousValue);
        if (this._arrayObservers !== null) {
          invalidateObservers("_arrayObservers",
                                this._arrayObservers);
        }
      }
    }

    if( target[key] !== value && !(Number.isNaN(target[key]) &&
                                   Number.isNaN(value)) )
      return false; // Write protected?
    return true;
  }

  function deletePropertyHandlerArray(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.deleteProperty.apply(
        overlayHandler, [overlayHandler.target, key]);
    }
    if (!(key in target)) {
      return true;
    }

    let previousValue = target[key];
    delete target[key];
    if(!( key in target )) { // Write protected?
      emitDeleteEvent(this, key, previousValue);
      if (this._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", this._arrayObservers);
      }
    }
    if( key in target ) return false; // Write protected?
    return true;
  }

  function ownKeysHandlerArray(target) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.ownKeys.apply(
        overlayHandler, [overlayHandler.target]);
    }

    if (inActiveRecording) {
      if (this._arrayObservers === null) {
        this._arrayObservers = {};
      }
      registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
    }
    let result   = Object.keys(target);
    result.push('length');
    return result;
  }

  function hasHandlerArray(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.has.apply(overlayHandler, [target, key]);
    }
    if (inActiveRecording) {
      if (this._arrayObservers === null) {
        this._arrayObservers = {};
      }
      registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
    }
    return key in target;
  }

  function definePropertyHandlerArray(target, key, oDesc) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.defineProperty.apply(
        overlayHandler, [overlayHandler.target, key, oDesc]);
    }

    if (this._arrayObservers !== null) {
      invalidateObservers("_arrayObservers", this._arrayObservers);
    }
    return target;
  }

  function getOwnPropertyDescriptorHandlerArray(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.getOwnPropertyDescriptor.apply(
        overlayHandler, [overlayHandler.target, key]);
    }

    if (inActiveRecording) {
      if (this._arrayObservers === null) {
        this._arrayObservers = {};
      }
      registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
    }
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Object Handlers
   *
   ***************************************************************/

  function getHandlerObject(target, key) {
    key = key.toString();
    if (this.overrides.__overlay !== null && key !== "__overlay" &&
        (typeof(overlayBypass[key]) === 'undefined')) {
      let overlayHandler = this.overrides.__overlay.__handler;
      let result = overlayHandler.get.apply(
        overlayHandler, [overlayHandler.target, key]);
      return result;
    }

    if (typeof(this.overrides[key]) !== 'undefined') {
      return this.overrides[key];
    } else {
      if (typeof(key) !== 'undefined') {
        if (inActiveRecording) {
          if (typeof(this._propertyObservers) ===  'undefined') {
            this._propertyObservers = {};
          }
          if (typeof(this._propertyObservers[key]) ===  'undefined') {
            this._propertyObservers[key] = {};
          }
          registerAnyChangeObserver("_propertyObservers." + key,
                                    this._propertyObservers[key]);
        }

        let scan = target;
        while ( scan !== null && typeof(scan) !== 'undefined' ) {
          let descriptor = Object.getOwnPropertyDescriptor(scan, key);
          if (typeof(descriptor) !== 'undefined' &&
              typeof(descriptor.get) !== 'undefined') {
            return descriptor.get.bind(this.overrides.__proxy)();
          }
          scan = Object.getPrototypeOf( scan );
        }
        return target[key];
      }
    }
  }

  function setHandlerObject(target, key, value) {
    if (this.overrides.__overlay !== null) {
      if (key === "__overlay") {
        this.overrides.__overlay = value;
        // Setting a new overlay, should not be possible?
        return true;
      } else {
        let overlayHandler = this.overrides.__overlay.__handler;
        return overlayHandler.set.apply(
          overlayHandler, [overlayHandler.target, key, value]);
      }
    }

    let previousValue = target[key];

    // If same value as already set, do nothing.
    if (key in target) {
      if (previousValue === value || (Number.isNaN(previousValue) &&
                                      Number.isNaN(value)) ) {
        return true;
      }
    }

    let undefinedKey = !(key in target);
    target[key]      = value;
    let resultValue  = target[key];
    if( resultValue === value || (Number.isNaN(resultValue) &&
                                  Number.isNaN(value)) ) {
      // Write protected?
      if (typeof(this._propertyObservers) !== 'undefined' &&
          typeof(this._propertyObservers[key]) !== 'undefined') {
        invalidateObservers("_propertyObservers." + key,
                              this._propertyObservers[key]);
      }
      if (undefinedKey) {
        if (typeof(this._enumerateObservers) !== 'undefined') {
          invalidateObservers("_enumerateObservers",
                                this._enumerateObservers);
        }
      }
      emitSetEvent(this, key, value, previousValue);
    }

    if( resultValue !== value  && !(Number.isNaN(resultValue) &&
                                    Number.isNaN(value))) return false;
    // Write protected?
    return true;
  }

  function deletePropertyHandlerObject(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      overlayHandler.deleteProperty.apply(
        overlayHandler, [overlayHandler.target, key]);
      return true;
    }

    if (!(key in target)) {
      return true;
    } else {
      let previousValue = target[key];
      delete target[key];
      if(!( key in target )) { // Write protected?
        emitDeleteEvent(this, key, previousValue);
        if (typeof(this._enumerateObservers) !== 'undefined') {
          invalidateObservers("_enumerateObservers",
                                this._enumerateObservers);
        }
      }
      if( key in target ) return false; // Write protected?
      return true;
    }
  }

  function ownKeysHandlerObject(target, key) { // Not inherited?
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.ownKeys.apply(
        overlayHandler, [overlayHandler.target, key]);
    }

    if (inActiveRecording) {
      if (typeof(this._enumerateObservers) === 'undefined') {
        this._enumerateObservers = {};
      }
      registerAnyChangeObserver("_enumerateObservers",
                                this._enumerateObservers);
    }
    let keys = Object.keys(target);
    // keys.push('__id');
    return keys;
  }

  function hasHandlerObject(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.has.apply(
        overlayHandler, [overlayHandler.target, key]);
    }

    if (inActiveRecording) {
      if (typeof(this._enumerateObservers) === 'undefined') {
        this._enumerateObservers = {};
      }
      registerAnyChangeObserver("_enumerateObservers",
                                this._enumerateObservers);
    }
    return key in target;
  }

  function definePropertyHandlerObject(target, key, descriptor) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.defineProperty.apply(
        overlayHandler, [overlayHandler.target, key]);
    }

    if (typeof(this._enumerateObservers) !== 'undefined') {
      invalidateObservers("_enumerateObservers",
                            this._enumerateObservers);
    }
    return Reflect.defineProperty(target, key, descriptor);
  }

  function getOwnPropertyDescriptorHandlerObject(target, key) {
    if (this.overrides.__overlay !== null) {
      let overlayHandler = this.overrides.__overlay.__handler;
      return overlayHandler.getOwnPropertyDescriptor
        .apply(overlayHandler, [overlayHandler.target, key]);
    }

    if (inActiveRecording) {
      if (typeof(this._enumerateObservers) === 'undefined') {
        this._enumerateObservers = {};
      }
      registerAnyChangeObserver("_enumerateObservers",
                                this._enumerateObservers);
    }
    return Object.getOwnPropertyDescriptor(target, key);
  }


  /***************************************************************
   *
   *  Create
   *
   ***************************************************************/

  function create(createdTarget, cacheId) {
    if (typeof(createdTarget) === 'undefined') {
      createdTarget = {};
    }
    if (typeof(cacheId) === 'undefined') {
      cacheId = null;
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
      // let _propertyObservers = {};
      // for (property in createdTarget) {
      //     _propertyObservers[property] = {};
      // }
      handler = {
        // getPrototypeOf: function () {},
        // setPrototypeOf: function () {},
        // isExtensible: function () {},
        // preventExtensions: function () {},
        // apply: function () {},
        // construct: function () {},
        // _enumerateObservers : {},
        // _propertyObservers: _propertyObservers,
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

    handler.overrides = {
      __id: nextId++,
      __buildId : cacheId,
      __overlay : null,
      __target: createdTarget,
      __handler : handler,
      __proxy : proxy,

      // Reserved properties that you can override
      // onChange
      // onBuildChange // Only responds to changes during build / rebuild.
      // onBuildCreate
      // onBuildRemove
    };

    if (inReCache !== null) {
      if (cacheId !== null &&  typeof(inReCache.cacheIdObjectMap[cacheId]) !== 'undefined') {
        // Overlay previously created
        let infusionTarget = inReCache.cacheIdObjectMap[cacheId];
        infusionTarget.__handler.overrides.__overlay = proxy;
        inReCache.newlyCreated.push(infusionTarget);
        return infusionTarget;   // Borrow identity of infusion target.
      } else {
        // Newly created in this reCache cycle. Including overlaid ones.
        inReCache.newlyCreated.push(proxy);
      }
    }


    emitCreationEvent(handler);
    return proxy;
  }



  /**********************************
   *
   *   Causality Global stacklets
   *
   **********************************/

  let independentContext = null;
  let context = null;

  let inActiveRecording = false;
  let activeRecorder = null;

  let inCachedCall = {value: null};
  let inReCache = null;

  function updateContextState() {
    inActiveRecording = (context !== null) ? ((context.type === "recording") && state.recordingPaused === 0) : false;
    activeRecorder = (inActiveRecording) ? context : null;
    
    inCachedCall.value = null;
    inReCache = null;
    if (independentContext !== null) {
      inCachedCall.value = (independentContext.type === "cached_call") ? independentContext : null; 
      inReCache = (independentContext.type === "reCache") ? independentContext : null;
    }
  }

  function removeChildContexts(context) {
    //console.warn("removeChildContexts " + context.type, context.id||'');//DEBUG
    // trace.context && logGroup(`removeChildContexts: ${context.type} ${context.id}`);
    if (context.child !== null && !context.child.independent) {
      context.child.removeContextsRecursivley();
    }
    context.child = null; // always remove
    if (context.children !== null) {
      context.children.forEach(function (child) {
        if (!child.independent) {
          child.removeContextsRecursivley();
        }
      });
    }
    context.children = []; // always clear
    // trace.context && logUngroup();
  }


  function removeContextsRecursivley() {
    // trace.context && logGroup(`removeContextsRecursivley ${this.id}`);
    this.remove();
    this.isRemoved = true;
    removeChildContexts(this);
    // trace.context && logUngroup();
  }

  // Optimization, do not create array if not needed.
  function addChild(context, child) {
    if (context.child === null && context.children === null) {
      context.child = child;
    } else if (context.children === null) {
      context.children = [context.child, child];
      context.child = null;
    } else {
      context.children.push(child);
    }
  }

  // occuring types: recording, repeater_refreshing,
  // cached_call, reCache, block_side_effects
  function enterContext(type, enteredContext) {
    // logGroup(`enterContext: ${type} ${enteredContext.id} ${enteredContext.description}`);
    if (typeof(enteredContext.initialized) === 'undefined') {
      // Initialize context
      enteredContext.removeContextsRecursivley
        = removeContextsRecursivley;
      enteredContext.parent = null;
      enteredContext.independentParent = independentContext;
      enteredContext.type = type;
      enteredContext.child = null;
      enteredContext.children = null;
      enteredContext.directlyInvokedByApplication = (context === null);

      // Connect with parent
      if (context !== null) {
        addChild(context, enteredContext)
        enteredContext.parent = context;
        // Even a shared context like a cached call only has
        // the first callee as its parent. Others will just observe it.
      } else {
        enteredContext.independent = true;
      }
      // console.log(enteredContext)
      if (enteredContext.independent) {
        independentContext = enteredContext;
      }

      enteredContext.initialized = true;
    } else {
      if (enteredContext.independent) {
        independentContext = enteredContext;
      } else {
        independentContext = enteredContext.independentParent;
      }
    }
    
    // if (!enteredContext.independent)
    // if (!enteredContext.independent)
    if (independentContext === null && !enteredContext.independent) {
      throw new Error("should be!!");
    }

    context = enteredContext;
    updateContextState();
    // logUngroup();
    return enteredContext;
  }


  function leaveContext( activeContext ) {
    // DEBUG
    if( context && activeContext && (context !== activeContext) && !context.independent ){
      // console.trace("leaveContext mismatch " + activeContext.type, activeContext.id||'');
      if( !context ) console.log('current context null');
      else {
        // console.log("current context " + context.type, context.id||'');
        if( context.parent ){
          console.log("parent context " + context.parent.type, context.parent.id||'');
        }
      }
    }
    
    
    if( context && activeContext === context ) {
      //console.log("leaveContext " + activeContext.type, activeContext.id||'', "to", context.parent ? context.parent.id : 'null');//DEBUG
      if (context.independent) {
        independentContext = context.independentParent;
      }
      context = context.parent;
    }
    updateContextState();
  }


  function enterIndependentContext() {
    return enterContext("independently", {
      independent : true,
      remove : () => {}
    });
  }

  function leaveIndependentContext( activeContext ) {
    leaveContext( activeContext );
  }

  function independently(action) {
    const activeContext = enterContext("independently", {
      independent : true,
      remove : () => {}
    });
    action();
    leaveContext( activeContext );
  }

  /* exists as a fallback for async recording without active
   * contexts. Used when not in recording context.
   */
  function emptyContext(){
    return {
      record( action ){
        return action()
      }
    }
  }

  /**********************************
   *
   *  Postpone reactions / Transactions
   *
   **********************************/

  function postponeReactions(callback) {
    state.postponeReactions++;
    callback();
    state.postponeReactions--;
    proceedWithPostponedNotifications();
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

  let events = [];

  function emitEvent(handler, event) {
    event.object = handler.overrides.__proxy;
    event.objectId = handler.overrides.__id;

    if (emitEvents) {
      events.push(event);
    }

    if (onChangeGlobal) {
      onChangeGlobal(event);
    }

    if (objectCallbacks && typeof(handler.target.onChange) === 'function') { // Consider. Put on queue and fire on end of reaction? onReactionEnd onTransactionEnd 
      handler.target.onChange(event);
    }
  }


  /**********************************
   *  Dependency recording
   *
   *  invalidateOnChange.
   **********************************/

  let recorderId = 0;

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
      doFirst       = arguments[0];
      doAfterChange = arguments[1];
    }

    // Recorder context
    const enteredContext = enterContext('recording', {
      independent : false,
      nextToNotify: null,
      id: recorderId++,
      description: description,
      sources : [],
      uponChangeAction: doAfterChange,
      remove : function() {
        // trace.context && logGroup(`remove recording ${this.id}`);
        // Clear out previous observations
        this.sources.forEach(function(observerSet) {
          // From observed object
          // let observerSetContents = getMap(
          // observerSet, 'contents');
          // if (typeof(observerSet['contents'])) {
          ////! Should not be needed
          //     observerSet['contents'] = {};
          // }

          let observerSetContents = observerSet['contents'];
          delete observerSetContents[this.id];
          let noMoreObservers = false;
          observerSet.contentsCounter--;
          // trace.context && log(
          //     "observerSet.contentsCounter: " +
          //         observerSet.contentsCounter);
          if (observerSet.contentsCounter == 0) {
            if (observerSet.isRoot) {
              if (observerSet.first === null &&
                  observerSet.last === null) {
                noMoreObservers = true;
              }
            } else {
              if (observerSet.parent.first === observerSet) {
                observerSet.parent.first === observerSet.next;
              }

              if (observerSet.parent.last === observerSet) {
                observerSet.parent.last
                  === observerSet.previous;
              }

              if (observerSet.next !== null) {
                observerSet.next.previous =
                  observerSet.previous;
              }

              if (observerSet.previous !== null) {
                observerSet.previous.next = observerSet.next;
              }

              observerSet.previous = null;
              observerSet.next = null;

              if (observerSet.parent.first === null &&
                  observerSet.parent.last === null) {
                noMoreObservers = true;
              }
            }

            if (noMoreObservers &&
                typeof(observerSet.noMoreObserversCallback)
                !== 'undefined') {
              observerSet.noMoreObserversCallback();
            }
          }
        }.bind(this));
        this.sources.length = 0;  // From repeater itself.
        // trace.context && logUngroup();
      }
    });

    // Method for continue async in same context
    enteredContext.record = function( action ){
      if( context == enteredContext || enteredContext.isRemoved )
        return action();
      //console.log('enteredContext.record');//DEBUG
      const activeContext = enterContext(enteredContext.type, enteredContext);
      const value = action();
      leaveContext( activeContext );
      return value;
    }

    //console.log("doFirst in context " + enteredContext.type, enteredContext.id||'');//DEBUG
    let returnValue = doFirst( enteredContext );
    //if( context ) console.log("after doFirst context " + enteredContext.type, enteredContext.id||'');//DEBUG
    leaveContext( enteredContext );

    return returnValue;
  }

  function withoutRecording(action) {
    state.recordingPaused++;
    updateContextState();
    action();
    state.recordingPaused--;
    updateContextState();
  }


  let sourcesObserverSetChunkSize = 500;
  function registerAnyChangeObserver(description, observerSet) {
    // instance can be a cached method if observing its return value,
    // object & definition only needed for debugging.

    if (activeRecorder !== null) {
      if (typeof(observerSet.initialized) === 'undefined') {
        observerSet.description = description;
        observerSet.isRoot = true;
        observerSet.contents = {};
        observerSet.contentsCounter = 0;
        observerSet.initialized = true;
        observerSet.first = null;
        observerSet.last = null;
      }

      let recorderId = activeRecorder.id;

      if (typeof(observerSet.contents[recorderId]) !== 'undefined') {
        return;
      }

      if (observerSet.contentsCounter === sourcesObserverSetChunkSize &&
          observerSet.last !== null) {
        observerSet = observerSet.last;
        if (typeof(observerSet.contents[recorderId]) !== 'undefined') {
          return;
        }
      }
      if (observerSet.contentsCounter === sourcesObserverSetChunkSize) {
        let newChunk =
            {
              isRoot : false,
              contents: {},
              contentsCounter: 0,
              next: null,
              previous: null,
              parent: null
            };
        if (observerSet.isRoot) {
          newChunk.parent = observerSet;
          observerSet.first = newChunk;
          observerSet.last = newChunk;
        } else {
          observerSet.next = newChunk;
          newChunk.previous = observerSet;
          newChunk.parent = observerSet.parent;
          observerSet.parent.last = newChunk;
        }
        observerSet = newChunk;
      }

      // Add repeater on object beeing observed,
      // if not already added before
      let observerSetContents = observerSet.contents;
      if (typeof(observerSetContents[recorderId]) === 'undefined') {
        observerSet.contentsCounter = observerSet.contentsCounter + 1;
        observerSetContents[recorderId] = activeRecorder;

        // Note dependency in repeater itself (for cleaning up)
        activeRecorder.sources.push(observerSet);
      }
    }
  }


  /** -------------
   *  Upon change
   * -------------- */

  let nextObserverToInvalidate = null;
  let lastObserverToInvalidate = null;

  function proceedWithPostponedNotifications() {
    if (state.postponeReactions == 0) {
      while (nextObserverToInvalidate !== null) {
        let recorder = nextObserverToInvalidate;
        nextObserverToInvalidate =
          nextObserverToInvalidate.nextToNotify;
        // blockSideEffects(function() {
        recorder.uponChangeAction();
        // });
      }
      lastObserverToInvalidate = null;
    }
  }

  function nullifyObserverNotification(callback) {
    state.observerNotificationNullified++;
    callback();
    state.observerNotificationNullified--;
  }


  // Recorders is a map from id => recorder
  function invalidateObservers(description, observers) {
    if (typeof(observers.initialized) !== 'undefined') {
      if (state.observerNotificationNullified > 0) {
        return;
      }

      let contents = observers.contents;
      for (let id in contents) {
        invalidateObserver(contents[id]);
      }

      if (typeof(observers.first) !== 'undefined') {
        let chainedObserverChunk = observers.first;
        while(chainedObserverChunk !== null) {
          let contents = chainedObserverChunk.contents;
          for (let id in contents) {
            invalidateObserver(contents[id]);
          }
          chainedObserverChunk = chainedObserverChunk.next;
        }
      }
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
      
      observer.remove(); // Cannot be any more dirty than it already is!
      if (state.postponeReactions > 0) {
        if (lastObserverToInvalidate !== null) {
          lastObserverToInvalidate.nextToNotify = observer;
        } else {
          nextObserverToInvalidate = observer;
        }
        lastObserverToInvalidate = observer;
      } else {
        // blockSideEffects(function() {
        observer.uponChangeAction();
        // });
      }
    }
  }


  /**********************************
   *
   *   Repetition
   *
   **********************************/

  let firstDirtyRepeater = null;
  let lastDirtyRepeater = null;

  function clearRepeaterLists() {
    recorderId = 0;
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

  let repeaterId = 0;
  function repeatOnChange() { // description(optional), action
    // Arguments
    let description = '';
    let repeaterAction;
    let repeaterNonRecordingAction = null;
    let options = {};

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

    if (typeof(args[0]) === 'function') {
      repeaterNonRecordingAction = args.shift();
    }
    
    if (typeof(args[0]) === 'object') {
      options = args.shift();
    }

    // if( trace.nestedRepeater && inActiveRecording ){
    //   let parentDesc = activeRecorder.description;
    //   if( !parentDesc && activeRecorder.parent ) parentDesc = activeRecorder.parent.description;
    //   if( !parentDesc ) parentDesc = 'unnamed';
    //   console.warn(`repeater ${description||'unnamed'} inside active recording ${parentDesc}`);
    // }

    // Activate!
    return refreshRepeater({
      independent : false,
      id: repeaterId++,
      description: description,
      repeaterAction : repeaterAction,
      nonRecordedAction: repeaterNonRecordingAction,
      options: options,
      remove: function() {
        // log("remove repeater_refreshing");
        //" + this.id + "." + this.description);
        detatchRepeater(this);
        // removeSingleChildContext(this); // Remove recorder!
        // removeChildContexts(this);
      },
      nextDirty : null,
      previousDirty : null,
      lastRepeatTime: 0,
      lastCallTime: 0,
      lastInvokeTime: 0,
    });
  }

  function refreshRepeater(repeater) {
    let time = Date.now();
    if( !repeater.options ) repeater.options = {};
    const options = repeater.options;
    
    const timeSinceLastRepeat = time - repeater.lastRepeatTime;
    if( options.throttle && options.throttle > timeSinceLastRepeat ){
      const waiting = options.throttle - timeSinceLastRepeat;
      //console.log(`Delayed repeater for ${waiting}`);
      setTimeout(()=>refreshRepeater(repeater), waiting);
      return repeater; // come back later
    }
    
    const activeContext = enterContext('repeater_refreshing', repeater);
    repeater.returnValue = invalidateOnChange(
      repeater.repeaterAction,
      function () {
        // unlockSideEffects(function() {

        // Is this needed? Why not mark as dirty directly?  
        // if( context && !context.independent ){
        //   //console.log("deferring repeaterDirty", context.id);
        //   // defere repeater if we are in a nested context
        //   setTimeout(()=>{
        //     //console.log("deferred repeaterDirty", context.id);
        //     repeaterDirty(repeater);
        //   });
        // } else {
          repeaterDirty(repeater);
        // }
        // });
      }
    );

    if (repeater.lastTimerId){
      clearTimeout(repeater.lastTimerId);
      repeater.lastTimerId = null;
      //console.log(`Delayed NRA cancelled`);
    }
    
    if (repeater.nonRecordedAction !== null) {
      let waiting = 0;
      if( options.throttle || options.nonRecordedDebounce ){
        // const timeSinceLastRepeat = time - repeater.lastRepeatTime;
        const timeSinceLastCall = time - repeater.lastCallTime;
        const timeSinceLastInvoke = time - repeater.lastInvokeTime;
        const waitInvoke = options.nonRecordedDebounce || options.throttle * 2;
        //console.log(`lastRepeat ${timeSinceLastRepeat},
        //lastcall ${timeSinceLastCall}, lastInvoke ${timeSinceLastInvoke}`);
        if( options.nonRecordedThrottle &&
            timeSinceLastInvoke >= options.nonRecordedThrottle
          ){
          //console.log(`Max wait reached`);
        }
        else if( timeSinceLastCall < waitInvoke ){
          waiting = waitInvoke - timeSinceLastCall;

          if( options.nonRecordedThrottle ){
            const waitingMax =
                  options.nonRecordedThrottle - timeSinceLastInvoke;
            if( waitingMax < waiting ){
              waiting = waitingMax;
              //console.log(`override to delaying NRA ${waiting}`);
            }
          }
          
          //console.log(`Delaying NRA ${waiting}`);
          repeater.lastTimerId = setTimeout(()=>{
            //console.log(`Running NRA delayed`);
            const activeContext = enterIndependentContext();
            repeater.nonRecordedAction( repeater.returnValue );
            leaveIndependentContext( activeContext );
            repeater.lastInvokeTime = time;
          },waiting);
        }

        //console.log(`NRA lastCallTime updated`);
        repeater.lastCallTime = time;
      }

      if( !waiting ){
        //console.log(`Running NRA directly`);
        const activeContext = enterIndependentContext();
        repeater.nonRecordedAction( repeater.returnValue );
        leaveIndependentContext( activeContext );
        repeater.lastInvokeTime = time;
      }
    }
    leaveContext( activeContext );
    repeater.lastRepeatTime = time;

    return repeater;
  }

  function repeaterDirty(repeater) { // TODO: Add update block on this stage?
    removeChildContexts(repeater);
    // removeSingleChildContext(repeater);

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

  let refreshingAllDirtyRepeaters = false;

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


  /************************************************************************
   *
   *  Merge into & forwarding/overlay
   *
   ************************************************************************/

  let overlayBypass = {
    '__overlay' : true
  };


  /************************************************************************
   *
   *  Instance
   *
   ************************************************************************/


  const instance = {};
  Object.assign(instance, {
    // Main API
    create,
    c: create, 
    invalidateOnChange,
    repeatOnChange,
    repeat: repeatOnChange,

    // Modifiers
    withoutRecording,
    withoutNotifyChange: nullifyObserverNotification,

    // Transaction
    postponeReactions,
    transaction : postponeReactions,

    // Independently
    // enterIndependentContext,
    // leaveIndependentContext,
    independently,
    emptyContext,

    // Debugging and testing
    // observeAll,
    inCachedCall,
    clearRepeaterLists,
    resetObjectIds,
    
    // Logging
    // log,
    // logGroup,
    // logUngroup,
    // logToString,
    // trace,
    // objectlog,
    // setObjectlog,
    
    // Advanced (only if you know what you are doing)
    state,
    enterContext,
    leaveContext,
    registerAnyChangeObserver,
    invalidateObservers
  }); 

  Object.assign(instance, require("./lib/causalityObject.js").bindToInstance(instance));

  return instance;
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