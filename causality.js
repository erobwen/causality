'use strict';
// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        if( !root && typeof window != 'undefined' ) root = window;
        root.causality = factory(); // Support browser global
    }
}(this, function () {
    function values(obj) {
        var vals = [];
        for( var key in obj ) {
            if ( obj.hasOwnProperty(key) ) {
                vals.push(obj[key]);
            }
        }
        return vals;
    }

    // Helper to quickly get a child object (this function was a great idea, but caused performance issues in stress-tests)
    function getMap() {
        let argumentList = argumentsToArray(arguments);
        let object = argumentList.shift();
        while (argumentList.length > 0) {
            let key = argumentList.shift();
            if (typeof(object[key]) === 'undefined') {
                object[key] = {};
            }
            object = object[key];
        }
        return object;
    }

    // Helper to quickly get a child array
    function getArray() {
        var argumentList = argumentsToArray(arguments);
        var object = argumentList.shift();
        while (argumentList.length > 0) {
            var key = argumentList.shift();
            if (typeof(object[key]) === 'undefined') {
                if (argumentList.length === 0) {
                    object[key] = [];
                } else {
                    object[key] = {};
                }
            }
            object = object[key];
        }
        return object;
    }
    
    function isDefined(object, property) {
        return (typeof(object[property]) !== 'undefined');
    }

    function setIfNotDefined(object, property, value) {
        if (typeof(object[property]) === 'undefined') {
            object[property] = value;
        }
    }

    let lastOfArray = function(array) {
        return array[array.length - 1];
    };

    function removeFromArray(object, array) {
        for (let i = 0; i < array.length; i++) {
            if (array[i] === object) {
                array.splice(i, 1);
                break;
            }
        }
    }

    let argumentsToArray = function(argumentList) {
        return Array.prototype.slice.call(argumentList);
    };


    /***************************************************************
     *
     *  Array overrides
     *
     ***************************************************************/

    let staticArrayOverrides = {
        pop : function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            let index = this.target.length - 1;
            observerNotificationNullified++;
            let result = this.target.pop();
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, index, [result], null);
            if (--inPulse === 0) postPulseCleanup();
            return result;
        },

        push : function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            observerNotificationNullified++;
            this.target.push.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, index, null, argumentsArray);
            if (--inPulse === 0) postPulseCleanup();
            return this.target.length;
        },

        shift : function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            observerNotificationNullified++;
            let result = this.target.shift();
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, 0, [result], null);
            if (--inPulse === 0) postPulseCleanup();
            return result;

        },

        unshift : function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            observerNotificationNullified++;
            this.target.unshift.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, 0, null, argumentsArray);
            if (--inPulse === 0) postPulseCleanup();
            return this.target.length;
        },

        splice : function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            let argumentsArray = argumentsToArray(arguments);
            let index = argumentsArray[0];
            let removedCount = argumentsArray[1];
            if( typeof argumentsArray[1] === 'undefined' )
                removedCount = this.target.length - index;
            let added = argumentsArray.slice(2);
            let removed = this.target.slice(index, index + removedCount);
            observerNotificationNullified++;
            let result = this.target.splice.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, index, removed, added);
            if (--inPulse === 0) postPulseCleanup();
            return result; // equivalent to removed
        },

        copyWithin: function(target, start, end) {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            if (target < 0) { start = this.target.length - target; }
            if (start < 0) { start = this.target.length - start; }
            if (end < 0) { start = this.target.length - end; }
            end = Math.min(end, this.target.length);
            start = Math.min(start, this.target.length);
            if (start >= end) {
                return;
            }
            let removed = this.target.slice(index, index + end - start);
            let added = this.target.slice(start, end);

            observerNotificationNullified++;
            let result = this.target.copyWithin(target, start, end);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }

            emitSpliceEvent(this, target, added, removed);
            if (--inPulse === 0) postPulseCleanup();
            return result;
        }
    };

    ['reverse', 'sort', 'fill'].forEach(function(functionName) {
        staticArrayOverrides[functionName] = function() {
            if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
            inPulse++;

            let argumentsArray = argumentsToArray(arguments);
            let removed = this.target.slice(0);

            observerNotificationNullified++;
            let result = this.target[functionName].apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
            emitSpliceEvent(this, 0, removed, this.target.slice(0));
            if (--inPulse === 0) postPulseCleanup();
            return result;
        };
    });

    // Cumulative assignment settings.
    let cumulativeAssignment = false;
    function setCumulativeAssignment(value) {
        cumulativeAssignment = value;
    }

    let collecting = [];
    function collect(array, action) {
        collecting.push(array);
        action();
        collecting.pop();
    }

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
        if (this.overrides.__overlay !== null && (typeof(overlayBypass[key]) === 'undefined')) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
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
                registerAnyChangeObserver("_arrayObservers", this._arrayObservers);//object
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
                return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
            }
        }

        let previousValue = target[key];

        // If same value as already set, do nothing.
        if (key in target) {
            if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
                return true;
            }
        }

        // If cumulative assignment, inside recorder and value is undefined, no assignment.
        if (cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
            return true;
        }
        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
        inPulse++;

        if (!isNaN(key)) {
            // Number index
            if (typeof(key) === 'string') {
                key = parseInt(key);
            }
            target[key] = value;

            if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
                emitSpliceReplaceEvent(this, key, value, previousValue);
                if (this._arrayObservers !== null) {
                    notifyChangeObservers("_arrayObservers", this._arrayObservers);
                }
            }
        } else {
            // String index
            target[key] = value;
            if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
                emitSetEvent(this, key, value, previousValue);
                if (this._arrayObservers !== null) {
                    notifyChangeObservers("_arrayObservers", this._arrayObservers);
                }
            }
        }

        if (--inPulse === 0) postPulseCleanup();

        if( target[key] !== value && !(Number.isNaN(target[key]) && Number.isNaN(value)) ) return false; // Write protected?
        return true;
    }

    function deletePropertyHandlerArray(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
        }
        if (!(key in target)) {
            return true;
        }
        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return true;
        inPulse++;

        let previousValue = target[key];
        delete target[key];
        if(!( key in target )) { // Write protected?
            emitDeleteEvent(this, key, previousValue);
            if (this._arrayObservers !== null) {
                notifyChangeObservers("_arrayObservers", this._arrayObservers);
            }
        }
        if (--inPulse === 0) postPulseCleanup();
        if( key in target ) return false; // Write protected?
        return true;
    }

    function ownKeysHandlerArray(target) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.ownKeys.apply(overlayHandler, [overlayHandler.target]);
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
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key, oDesc]);
        }
        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
        inPulse++;

        if (this._arrayObservers !== null) {
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
        }
        if (--inPulse === 0) postPulseCleanup();
        return target;
    }

    function getOwnPropertyDescriptorHandlerArray(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
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
        if (this.overrides.__overlay !== null && key !== "__overlay" && (typeof(overlayBypass[key]) === 'undefined')) {
            let overlayHandler = this.overrides.__overlay.__handler;
            let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
            return result;
        }

        if (typeof(this.overrides[key]) !== 'undefined') {
            return this.overrides[key];
        } else {
            if (typeof(key) !== 'undefined') {
                if (inActiveRecording) {
                    if (key in target) {
                        if (typeof(this._propertyObservers) ===  'undefined') {
                            this._propertyObservers = {};
                        }
                        if (typeof(this._propertyObservers[key]) ===  'undefined') {
                            this._propertyObservers[key] = {};
                        }
                        registerAnyChangeObserver("_propertyObservers." + key, this._propertyObservers[key]);
                    } else {
                        if (typeof(this._enumerateObservers) ===  'undefined') {
                            this._enumerateObservers = {};
                        }
                        registerAnyChangeObserver("_enumerateObservers." + key, this._enumerateObservers);
                    }
                }

                let scan = target;
                while ( scan !== null && typeof(scan) !== 'undefined' ) {
                    let descriptor = Object.getOwnPropertyDescriptor(scan, key);
                    if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
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
                this.overrides.__overlay = value; // Setting a new overlay, should not be possible?
                return true;
            } else {
                let overlayHandler = this.overrides.__overlay.__handler;
                return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
            }
        }
        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;

        let previousValue = target[key];

        // If same value as already set, do nothing.
        if (key in target) {
            if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
                return true;
            }
        }

        // If cumulative assignment, inside recorder and value is undefined, no assignment.
        if (cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
            return true;
        }
        inPulse++;

        let undefinedKey = !(key in target);
        target[key]      = value;
        let resultValue  = target[key];
        if( resultValue === value || (Number.isNaN(resultValue) && Number.isNaN(value)) ) { // Write protected?
            if (undefinedKey) {
                if (typeof(this._enumerateObservers) !== 'undefined') {
                    notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
                }
            } else {
                if (typeof(this._propertyObservers) !== 'undefined' && typeof(this._propertyObservers[key]) !== 'undefined') {
                    notifyChangeObservers("_propertyObservers." + key, this._propertyObservers[key]);
                }
            }
            emitSetEvent(this, key, value, previousValue);
        }
        if (--inPulse === 0) postPulseCleanup();
        if( resultValue !== value  && !(Number.isNaN(resultValue) && Number.isNaN(value))) return false; // Write protected?
        return true;
    }

    function deletePropertyHandlerObject(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
            return true;
        }

        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return true;

        if (!(key in target)) {
            return true;
        } else {
            inPulse++;
            let previousValue = target[key];
            delete target[key];
            if(!( key in target )) { // Write protected?
                emitDeleteEvent(this, key, previousValue);
                if (typeof(this._enumerateObservers) !== 'undefined') {
                    notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
                }
            }
            if (--inPulse === 0) postPulseCleanup();
            if( key in target ) return false; // Write protected?
            return true;
        }
    }

    function ownKeysHandlerObject(target, key) { // Not inherited?
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.ownKeys.apply(overlayHandler, [overlayHandler.target, key]);
        }

        if (inActiveRecording) {
            if (typeof(this._enumerateObservers) === 'undefined') {
                this._enumerateObservers = {};
            }
            registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
        }
        let keys = Object.keys(target);
        // keys.push('__id');
        return keys;
    }

    function hasHandlerObject(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.has.apply(overlayHandler, [overlayHandler.target, key]);
        }

        if (inActiveRecording) {
            if (typeof(this._enumerateObservers) === 'undefined') {
                this._enumerateObservers = {};
            }
            registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
        }
        return key in target;
    }

    function definePropertyHandlerObject(target, key, descriptor) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key]);
        }

        if (writeRestriction !== null && typeof(writeRestriction[this.overrides.__id]) === 'undefined') return;
        inPulse++;

        if (typeof(this._enumerateObservers) !== 'undefined') {
            notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
        }
        if (--inPulse === 0) postPulseCleanup();
        return Reflect.defineProperty(target, key, descriptor);
    }

    function getOwnPropertyDescriptorHandlerObject(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
        }

        if (inActiveRecording) {
            if (typeof(this._enumerateObservers) === 'undefined') {
                this._enumerateObservers = {};
            }
            registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
        }
        return Object.getOwnPropertyDescriptor(target, key);
    }


    /***************************************************************
     *
     *  Create
     *
     ***************************************************************/

    function create(createdTarget, cacheId) {
		inPulse++;
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

        handler.target = createdTarget;

        let proxy = new Proxy(createdTarget, handler);

        handler.overrides = {
            __id: nextId++,
            __cacheId : cacheId,
            __overlay : null,
            __target: createdTarget,
            __handler : handler,
            __proxy : proxy,

            // This inside these functions will be the Proxy. Change to handler?
            repeat : genericRepeatFunction,
            tryStopRepeat : genericStopRepeatFunction,

            observe: genericObserveFunction,

            cached : genericCallAndCacheFunction,
            cachedInCache : genericCallAndCacheInCacheFunction,
            reCached : genericReCacheFunction,
            reCachedInCache : genericReCacheInCacheFunction,
            tryUncache : genericUnCacheFunction,

            // reCache aliases
            project : genericReCacheFunction,
            projectInProjectionOrCache : genericReCacheInCacheFunction,

            // Identity and state
            mergeFrom : genericMergeFrom,
            forwardTo : genericForwarder,
            removeForwarding : genericRemoveForwarding,
            mergeAndRemoveForwarding: genericMergeAndRemoveForwarding
        };

        if (inReCache()) {
            if (cacheId !== null &&  typeof(context.cacheIdObjectMap[cacheId]) !== 'undefined') {
                // Overlay previously created
                let infusionTarget = context.cacheIdObjectMap[cacheId];
                infusionTarget.__handler.overrides.__overlay = proxy;
                context.newlyCreated.push(infusionTarget);
                return infusionTarget;   // Borrow identity of infusion target.
            } else {
                // Newly created in this reCache cycle. Including overlaid ones.
                context.newlyCreated.push(proxy);
            }
        }

        if (writeRestriction !== null) {
            writeRestriction[proxy.__id] = true;
        }

		emitCreationEvent(handler);
		if (--inPulse === 0) postPulseCleanup();
        return proxy;
    }



    /**********************************
     *
     *   Causality Global stack
     *
     **********************************/

    let causalityStack = [];
    let context = null;
    let microContext = null;

    let nextIsMicroContext = false;

    function inCachedCall() {
        if (context === null) {
            return false;
        } else {
            return context.type === "cached_call";
        }
    }

    function inReCache() {
        if (context === null) {
            return false;
        } else {
            return context.type === "reCache";
        }
    }

    function noContext() {
        return context === null;
    }


    let inActiveRecording = false;

    function updateInActiveRecording() {
        inActiveRecording = (microContext === null) ? false : ((microContext.type === "recording") && recordingPaused === 0);
    }

    function getActiveRecording() {
        if ((microContext === null) ? false : ((microContext.type === "recording") && recordingPaused === 0)) {
            return microContext;
        } else {
            return null;
        }
    }

    function inActiveRepetition() {
        return (microContext === null) ? false : ((microContext.type === "repeater") && recordingPaused === 0);
    }

    function getActiveRepeater() {
        if ((microContext === null) ? false : ((microContext.type === "repeater") && recordingPaused === 0)) {
            return microContext;
        } else {
            return null;
        }
    }


    function enterContextAndExpectMicroContext(type, enteredContext) {
        nextIsMicroContext = true;
        enterContext(type, enteredContext);
    }


    function removeChildContexts(context) {
        if (typeof(context.children) !== 'undefined' && context.children.length > 0) {
            context.children.forEach(function (child) {
                child.remove();
            });
            context.children = [];
        }
    }

    // occuring types: recording, repeater_refreshing, cached_call, reCache, block_side_effects
    function enterContext(type, enteredContext) {
        if (typeof(enteredContext.initialized) === 'undefined') {
            // Enter new context
            enteredContext.type = type;
            enteredContext.macro = null;

            enteredContext.directlyInvokedByApplication = (context === null);
            if (nextIsMicroContext) {
                // Build a micro context
                enteredContext.macro = microContext;
                microContext.micro = enteredContext;
                nextIsMicroContext = false;
            } else {
                // Build a new macro context
                enteredContext.children = [];

                if (context !== null && typeof(enteredContext.independent) === 'undefined') {
                    context.children.push(enteredContext);
                }
                context = enteredContext;
            }
            microContext = enteredContext;

            enteredContext.initialized = true;
        } else {
            // Re-enter context
            let primaryContext = enteredContext;
            while (primaryContext.macro !== null) {
                primaryContext = primaryContext.macro
            }
            context = primaryContext;

            microContext = enteredContext;
        }

        // Debug printout of macro hierarchy
        // let macros = [enteredContext];
        // let macro =  enteredContext.macro;
        // while(macro !== null) {
        //     macros.unshift(macro);
        //     macro = macro.macro;
        // }
        // console.log("====== enterContext ======== " + causalityStack.length + " =" + macros.map((context) => { return context.type; }).join("->"));
        updateInActiveRecording();
        causalityStack.push(enteredContext);
        return enteredContext;
    }


    function leaveContext() {
        let leftContext = causalityStack.pop();
        if (causalityStack.length > 0) {
            microContext = causalityStack[causalityStack.length - 1];
            let scannedContext = microContext;
            while (scannedContext.macro !== null) {
                scannedContext = scannedContext.macro;
            }
            context = scannedContext;
        } else {
            context = null;
            microContext = null;
        }
        updateInActiveRecording();
        // console.log("====== leaveContext ========" + leftContext.type);
    }


    /**********************************
     *  Pulse & Transactions
     *
     *  Upon change do
     **********************************/

    let inPulse = 0;

    function pulse(action) {
        inPulse++;
        callback();
        if (--inPulse === 0) postPulseCleanup();
    }

    let transaction = postponeObserverNotification;

    function postponeObserverNotification(callback) {
        inPulse++;
        observerNotificationPostponed++;
        callback();
        observerNotificationPostponed--;
        proceedWithPostponedNotifications();
        if (--inPulse === 0) postPulseCleanup();
    }

    let contextsScheduledForPossibleDestruction = [];

    function postPulseCleanup() {
        // console.log("post pulse cleanup");
        contextsScheduledForPossibleDestruction.forEach(function(context) {
            if (!context.directlyInvokedByApplication) {
                if (emptyObserverSet(context.contextObservers)) {
                    context.remove();
                }
            }
        });
        contextsScheduledForPossibleDestruction = [];
        postPulseHooks.forEach(function(callback) {
            callback(events);
        });
		if (recordEvents) events = [];
    }

    let postPulseHooks = [];
    function addPostPulseAction(callback) {
        postPulseHooks.push(callback);
    }
	
    function removeAllPostPulseActions() {
		postPulseHooks = [];
	}
	

    /**********************************
     *  Observe
     *
     *
     **********************************/

	let recordEvents = false;
	function setRecordEvents(value) {
		recordEvents = value; 
	} 
	 
    function emitSpliceEvent(handler, index, removed, added) {
        if (recordEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, {type: 'splice', index: index, removed: removed, added: added});
        }
    }

    function emitSpliceReplaceEvent(handler, key, value, previousValue) {
        if (recordEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, {type: 'splice', index: key, removed: [previousValue], added: [value] });
        }
    }

    function emitSetEvent(handler, key, value, previousValue) {
        if (recordEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, {type: 'set', property: key, newValue: value, oldValue: previousValue});
        }
    }

    function emitDeleteEvent(handler, key, previousValue) {
        if (recordEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, {type: 'delete', property: key, deletedValue: previousValue});
        }
    }
	
	// TODO: Remove this!!!! This is just to defer updates of some tests that do not expect creation events. 
	let newEventStyle = false;
	function setNewEventStyle(value) { 
		newEventStyle = value;
	} 
	
	function emitCreationEvent(handler) {
		if (newEventStyle && recordEvents) {
			emitEvent(handler, {type: 'create'})
		}
	}
	
	let events = [];

    function emitEvent(handler, event) {
		if (newEventStyle) {
			event.object = handler.overrides.__proxy;			
		} 
		if (recordEvents) {
			events.push(event);
		}
		
        // console.log(event);
        event.objectId = handler.overrides.__id;
        if (typeof(handler.observers) !== 'undefined') {
            for (let id in handler.observers)  {
                handler.observers[id](event);
            }
        }
    }

    function observeAll(array, callback) {
        array.forEach(function(element) {
            element.observe(callback);
        });
    }

	let nextObserverId = 0; 
    function genericObserveFunction(observerFunction) {
        let handler = this.__handler;
		let observer = {
			id : nextObserverId++,
			handler : handler,
			remove : function() {
				delete this.handler.observers[this.id];
			}
			// observerFunction : observerFunction, // not needed... 
		}
		enterContext("observe", observer);
        if (typeof(handler.observers) === 'undefined') {
            handler.observers = {};
        }
        handler.observers[observer.id] = observerFunction;
		leaveContext();
    }


    /**********************************
     *  Dependency recording
     *
     *  Upon change do
     **********************************/

    let recorderId = 0;

    function uponChangeDo() { // description(optional), doFirst, doAfterChange. doAfterChange cannot modify model, if needed, use a repeater instead. (for guaranteed consistency)
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
        enterContext('recording', {
            nextToNotify: null,
            id: recorderId++,
            description: description,
            sources: [],
            uponChangeAction: doAfterChange,
            remove : function() {
                // Clear out previous observations
                this.sources.forEach(function(observerSet) { // From observed object
                    // let observerSetContents = getMap(observerSet, 'contents');
                    // if (typeof(observerSet['contents'])) { // Should not be needed
                    //     observerSet['contents'] = {};
                    // }
                    let observerSetContents = observerSet['contents'];
                    delete observerSetContents[this.id];
                    let noMoreObservers = false;
                    observerSet.contentsCounter--;
                    if (observerSet.contentsCounter == 0) {
                        if (observerSet.isRoot) {
                            if (observerSet.first === null && observerSet.last === null) {
                                noMoreObservers = true;
                            }
                        } else {
                            if (observerSet.parent.first === observerSet) {
                                observerSet.parent.first === observerSet.next;
                            }

                            if (observerSet.parent.last === observerSet) {
                                observerSet.parent.last === observerSet.previous;
                            }

                            if (observerSet.next !== null) {
                                observerSet.next.previous = observerSet.previous;
                            }

                            if (observerSet.previous !== null) {
                                observerSet.previous.next = observerSet.next;
                            }

                            observerSet.previous = null;
                            observerSet.next = null;

                            if (observerSet.parent.first === null && observerSet.parent.last === null) {
                                noMoreObservers = true;
                            }
                        }

                        if (noMoreObservers && typeof(observerSet.noMoreObserversCallback) !== 'undefined') {
                            observerSet.noMoreObserversCallback();
                        }
                    }
                }.bind(this));
                this.sources.lenght = 0;  // From repeater itself.
            }
        });
        let returnValue = doFirst();
        leaveContext();

        return returnValue;
    }

    let recordingPaused = 0;

    function withoutRecording(action) {
        recordingPaused++;
        updateInActiveRecording();
        action();
        recordingPaused--;
        updateInActiveRecording();
    }

    function emptyObserverSet(observerSet) {
        return observerSet.contentsCounter === 0 && observerSet.first === null;
    }

    let sourcesObserverSetChunkSize = 500;
    function registerAnyChangeObserver(description, observerSet) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
        let activeRecorder = getActiveRecording();
        if (activeRecorder !== null) {
            // console.log(activeRecorder);
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

            if (observerSet.contentsCounter === sourcesObserverSetChunkSize && observerSet.last !== null) {
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

            // Add repeater on object beeing observed, if not already added before
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

    let observersToNotifyChange = [];
    let nextObserverToNotifyChange = null;
    let lastObserverToNotifyChange = null;

    let observerNotificationPostponed = 0;
    let observerNotificationNullified = 0;

    function proceedWithPostponedNotifications() {
        if (observerNotificationPostponed == 0) {
            while (nextObserverToNotifyChange !== null) {
                let recorder = nextObserverToNotifyChange;
                nextObserverToNotifyChange = nextObserverToNotifyChange.nextToNotify;
                // blockSideEffects(function() {
                recorder.uponChangeAction();
                // });
            }
            lastObserverToNotifyChange = null;
        }
    }

    function nullifyObserverNotification(callback) {
        observerNotificationNullified++;
        callback();
        observerNotificationNullified--;
    }


    // Recorders is a map from id => recorder
    function notifyChangeObservers(description, observers) {
        if (typeof(observers.initialized) !== 'undefined') {
            if (observerNotificationNullified > 0) {
                return;
            }

            let contents = observers.contents;
            for (let id in contents) {
                notifyChangeObserver(contents[id]);
            }

            if (typeof(observers.first) !== 'undefined') {
                let chainedObserverChunk = observers.first;
                while(chainedObserverChunk !== null) {
                    let contents = chainedObserverChunk.contents;
                    for (id in contents) {
                        notifyChangeObserver(contents[id]);
                    }
                    chainedObserverChunk = chainedObserverChunk.next;
                }
            }
        }
    }

    function notifyChangeObserver(observer) {
        if (observer != microContext) {
            observer.remove(); // Cannot be any more dirty than it already is!
            if (observerNotificationPostponed > 0) {
                if (lastObserverToNotifyChange !== null) {
                    lastObserverToNotifyChange.nextToNotify = observer;
                } else {
                    nextObserverToNotifyChange = observer;
                }
                lastObserverToNotifyChange = observer;
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
        let firstDirtyRepeater = null;
        let lastDirtyRepeater = null;
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
        let repeaterAction;
        let description = '';
        if (arguments.length > 1) {
            description    = arguments[0];
            repeaterAction = arguments[1];
        } else {
            repeaterAction = arguments[0];
        }

        // Activate!
        return refreshRepeater({
            id: repeaterId++,
            description: description,
            action: repeaterAction,
            remove: function() {
                // console.log("removeRepeater: " + repeater.id + "." + repeater.description);
                removeChildContexts(this);
                detatchRepeater(this);
                this.micro.remove(); // Remove recorder!
            },
            nextDirty : null,
            previousDirty : null
        });
    }

    function refreshRepeater(repeater) {
        enterContext('repeater_refreshing', repeater);
        // console.log("parent context type: " + repeater.parent.type);
        // console.log("context type: " + repeater.type);
        nextIsMicroContext = true;
        repeater.returnValue = uponChangeDo(
            repeater.action,
            function () {
                // unlockSideEffects(function() {
                repeaterDirty(repeater);
                // });
            }
        );
        leaveContext();
        return repeater;
    }

    function repeaterDirty(repeater) { // TODO: Add update block on this stage?
        removeChildContexts(repeater);

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
     *                    Cached method signatures
     *
     *          (reused by cache, repeat and project)
     ************************************************************************/

    function compareArraysShallow(a, b) {
        if( typeof a !== typeof b )
            return false;
        
        if (a.length === b.length) {
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    function isCachedInBucket(functionArgumentHashCaches, functionArguments) {
        if (functionArgumentHashCaches.length === 0) {
            return false;
        } else {
            // Search in the bucket!
            for (let i = 0; i < functionArgumentHashCaches.length; i++) {
                if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                    return true;
                }
            }
            return false;
        }
    }

    let cachedCalls = 0;

    function cachedCallCount() {
        return cachedCalls;
    }

    // Get cache(s) for this argument hash
    function getFunctionCacher(object, cacheStoreName, functionName, functionArguments) {
        let uniqueHash = true;
        function makeArgumentHash(argumentList) {
            let hash  = "";
            let first = true;
            argumentList.forEach(function (argument) {
                if (!first) {
                    hash += ",";
                }

                if (typeof(argument.__id) !== 'undefined') { //typeof(argument) === 'object' &&
                    hash += "{id=" + argument.__id + "}";
                } else if (typeof(argument) === 'number' || typeof(argument) === 'string') { // String or integer
                    hash += argument;
                } else {
                    uniqueHash = false;
                    hash += "{}"; // Non-identifiable, we have to rely on the hash-bucket.
                }
            });
            return "(" + hash + ")";
        }
        let argumentsHash = makeArgumentHash(functionArguments);

        // let functionCaches = getMap(object, cacheStoreName, functionName);
        if (typeof(object[cacheStoreName]) === 'undefined') {
            object[cacheStoreName] = {};
        }
        if (typeof(object[cacheStoreName][functionName]) === 'undefined') {
            object[cacheStoreName][functionName] = {};
        }
        let functionCaches = object[cacheStoreName][functionName];
        let functionCache = null;

        return {
            cacheRecordExists : function() {
                // Figure out if we have a chache or not
                let result = null;
                if (uniqueHash) {
                    result = typeof(functionCaches[argumentsHash]) !== 'undefined';
                } else {
                    let functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    result = isCachedInBucket(functionArgumentHashCaches, functionArguments);
                }
                return result;
            },

            deleteExistingRecord : function() {
                if (uniqueHash) {
                    let result = functionCaches[argumentsHash];
                    delete functionCaches[argumentsHash];
                    return result;
                } else {
                    let functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    for (let i = 0; i < functionArgumentHashCaches.length; i++) {
                        if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                            let result = functionArgumentHashCaches[i];
                            functionArgumentHashCaches.splice(i, 1);
                            return result;
                        }
                    }
                }
            },

            getExistingRecord : function() {
                if (uniqueHash) {
                    return functionCaches[argumentsHash]
                } else {
                    let functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    for (let i = 0; i < functionArgumentHashCaches.length; i++) {
                        if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                            return functionArgumentHashCaches[i];
                        }
                    }
                }
            },

            createNewRecord : function() {
                if (uniqueHash) {
                    if (typeof(functionCaches[argumentsHash]) === 'undefined') {
                        functionCaches[argumentsHash] = {};
                    }
                    return functionCaches[argumentsHash];
                    // return getMap(functionCaches, argumentsHash)
                } else {
                    let functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets", argumentsHash);
                    let record = {};
                    functionArgumentHashCaches.push(record);
                    return record;
                }
            }
        };
    }


    /************************************************************************
     *
     *                    Generic repeat function
     *
     ************************************************************************/


    function genericRepeatFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
        let functionCacher = getFunctionCacher(this.__handler, "_repeaters", functionName, argumentsList);

        if (!functionCacher.cacheRecordExists()) {
            // Never encountered these arguments before, make a new cache
            let cacheRecord = functionCacher.createNewRecord();
            cacheRecord.independent = true; // Do not delete together with parent
            cacheRecord.remove = function() {
                functionCacher.deleteExistingRecord();
                cacheRecord.micro.remove();
            };
            cacheRecord.contextObservers = {
                noMoreObserversCallback : function() {
                    contextsScheduledForPossibleDestruction.push(cacheRecord);
                }
            };
            enterContext('cached_repeater', cacheRecord);
            nextIsMicroContext = true;

            // cacheRecord.remove = function() {}; // Never removed directly, only when no observers & no direct application call
            cacheRecord.repeaterHandle = repeatOnChange(function() {
                return this[functionName].apply(this, argumentsList);
            }.bind(this));
            leaveContext();

            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return cacheRecord.repeaterHandle; // return something else...
        } else {
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return functionCacher.getExistingRecord().repeaterHandle;
        }
    }

    function genericStopRepeatFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
        let functionCacher = getFunctionCacher(this, "_repeaters", functionName, argumentsList);

        if (functionCacher.cacheRecordExists()) {
            let cacheRecord = functionCacher.getExistingRecord();
            if (emptyObserverSet(cacheRecord.contextObservers)) {
                functionCacher.deleteExistingRecord();
            }
        }
    }


    /************************************************************************
     *  Cached methods
     *
     * A cached method will not reevaluate for the same arguments, unless
     * some of the data it has read for such a call has changed. If there
     * is a parent cached method, it will be notified upon change.
     * (even if the parent does not actually use/read any return value)
     ************************************************************************/

    function genericCallAndCacheInCacheFunction() {
        let argumentsArray = argumentsToArray(arguments);
        if (inCachedCall() > 0) {
            return this.cached.apply(this, argumentsArray);
        } else {
            let functionName = argumentsArray.shift();
            return this[functionName].apply(this, argumentsArray);
        }
    }

    function genericCallAndCacheFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
        let functionCacher = getFunctionCacher(this, "_cachedCalls", functionName, argumentsList); // wierd, does not work with this inestead of handler...

        if (!functionCacher.cacheRecordExists()) {
            let cacheRecord = functionCacher.createNewRecord();
            cacheRecord.independent = true; // Do not delete together with parent

            // Is this call non-automatic
            cacheRecord.remove = function() {
                functionCacher.deleteExistingRecord();
                cacheRecord.micro.remove(); // Remove recorder
            };

            cachedCalls++;
            enterContext('cached_call', cacheRecord);
            nextIsMicroContext = true;
            // Never encountered these arguments before, make a new cache
            let returnValue = uponChangeDo(
                function () {
                    let returnValue;
                    // blockSideEffects(function() {
                    returnValue = this[functionName].apply(this, argumentsList);
                    // }.bind(this));
                    return returnValue;
                }.bind(this),
                function () {
                    // Delete function cache and notify
                    let cacheRecord = functionCacher.deleteExistingRecord();
                    notifyChangeObservers("functionCache.contextObservers", cacheRecord.contextObservers);
                }.bind(this));
            leaveContext();
            cacheRecord.returnValue = returnValue;
            cacheRecord.contextObservers = {
                noMoreObserversCallback : function() {
                    contextsScheduledForPossibleDestruction.push(cacheRecord);
                }
            };
            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return returnValue;
        } else {
            // Encountered these arguments before, reuse previous repeater
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return cacheRecord.returnValue;
        }
    }

    function genericUnCacheFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();

        // Cached
        let functionCacher = getFunctionCacher(this.__handler, "_cachedCalls", functionName, argumentsList);

        if (functionCacher.cacheRecordExists()) {
            let cacheRecord = functionCacher.getExistingRecord();
            cacheRecord.directlyInvokedByApplication = false;
            contextsScheduledForPossibleDestruction.push(cacheRecord);
        }

        // Re cached
        functionCacher = getFunctionCacher(this.__handler, "_reCachedCalls", functionName, argumentsList);

        if (functionCacher.cacheRecordExists()) {
            let cacheRecord = functionCacher.getExistingRecord();
            cacheRecord.directlyInvokedByApplication = false;
            contextsScheduledForPossibleDestruction.push(cacheRecord);
        }
    }

    /************************************************************************
     *
     *  Splices
     *
     ************************************************************************/

    function differentialSplices(previous, array) {
        let done = false;
        let splices = [];

        let previousIndex = 0;
        let newIndex = 0;

        let addedRemovedLength = 0;

        let removed;
        let added;

        function add(sequence) {
            let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: [], added: added};
            addedRemovedLength += added.length;
            splices.push(splice);
        }

        function remove(sequence) {
            let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: removed, added: [] };
            addedRemovedLength -= removed.length;
            splices.push(splice);
        }

        function removeAdd(removed, added) {
            let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: removed, added: added};
            addedRemovedLength -= removed.length;
            addedRemovedLength += added.length;
            splices.push(splice);
        }

        while (!done) {
            while(
            previousIndex < previous.length
            && newIndex < array.length
            && previous[previousIndex] === array[newIndex]) {
                previousIndex++;
                newIndex++;
            }

            if (previousIndex === previous.length && newIndex === array.length) {
                done = true;
            } else if (newIndex === array.length) {
                // New array is finished
                removed = [];
                let index = previousIndex;
                while(index < previous.length) {
                    removed.push(previous[index++]);
                }
                remove(removed);
                done = true;
            } else if (previousIndex === previous.length) {
                // Previous array is finished.
                added = [];
                while(newIndex < array.length) {
                    added.push(array[newIndex++]);
                }
                add(added);
                done = true;
            } else {
                // Found mid-area of missmatch.
                let previousScanIndex = previousIndex;
                let newScanIndex = newIndex;
                let foundMatchAgain = false;

                while(previousScanIndex < previous.length && !foundMatchAgain) {
                    newScanIndex = newIndex;
                    while(newScanIndex < array.length && !foundMatchAgain) {
                        if (previous[previousScanIndex] === array[newScanIndex]) {
                            foundMatchAgain = true;
                        }
                        if (!foundMatchAgain) newScanIndex++;
                    }
                    if (!foundMatchAgain) previousScanIndex++;
                }
                removeAdd(previous.slice(previousIndex, previousScanIndex), array.slice(newIndex, newScanIndex));
                previousIndex = previousScanIndex;
                newIndex = newScanIndex;
            }
        }

        return splices;
    }


    /************************************************************************
     *
     *  Merge into & forwarding/overlay
     *
     ************************************************************************/

    let overlayBypass = {
        '__overlay' : true,
        'removeForwarding' : true,
        'mergeAndRemoveForwarding' : true
    };

    function mergeInto(source, target) {
        if (source instanceof Array) {
            let splices = differentialSplices(target.__target, source.__target);
            splices.forEach(function(splice) {
                let spliceArguments = [];
                spliceArguments.push(splice.index, splice.removed.length);
                spliceArguments.push.apply(spliceArguments, splice.added); //.map(mapValue))
                target.splice.apply(target, spliceArguments);
            });
            for (let property in source) {
                if (isNaN(property)) {
                    target[property] = source[property];
                }
            }
        } else {
            for (let property in source) {
                target[property] = source[property];
            }
        }
        return target;
    }

    function mergeOverlayIntoObject(object) {
        let overlay = object.__overlay;
        object.__overlay = null;
        mergeInto(overlay, object);
    }

    function genericMergeFrom(otherObject) {
        return mergeInto(otherObject, this);
    }

    function genericForwarder(otherObject) {
        this.__overlay = otherObject;
    }

    function genericRemoveForwarding() {
        this.__overlay = null;
    }

    function genericMergeAndRemoveForwarding() {
        mergeOverlayIntoObject(this);
    }

    /************************************************************************
     *
     *  Projection (continous creation and infusion)
     *
     ************************************************************************/

    function genericReCacheInCacheFunction() {
        let argumentsArray = argumentsToArray(arguments);
        if (inReCache() > 0) {
            return this.reCached.apply(this, argumentsArray);
        } else {
            let functionName = argumentsArray.shift();
            return this[functionName].apply(this, argumentsArray);
        }
    }

    function genericReCacheFunction() {
        // console.log("call reCache");
        // Split argumentsp
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
        let functionCacher = getFunctionCacher(this.__handler, "_reCachedCalls", functionName, argumentsList);

        if (!functionCacher.cacheRecordExists()) {
            // console.log("init reCache ");
            let cacheRecord = functionCacher.createNewRecord();
            cacheRecord.independent = true; // Do not delete together with parent

            cacheRecord.cacheIdObjectMap = {};
            cacheRecord.remove = function() {
                functionCacher.deleteExistingRecord();
                cacheRecord.micro.remove(); // Remove recorder
            };

            // Is this call non-automatic
            cacheRecord.directlyInvokedByApplication = noContext();

            // Never encountered these arguments before, make a new cache
            enterContext('reCache', cacheRecord);
            nextIsMicroContext = true;
            cacheRecord.contextObservers = {
                noMoreObserversCallback : function() {
                    contextsScheduledForPossibleDestruction.push(cacheRecord);
                }
            };
            cacheRecord.repeaterHandler = repeatOnChange(
                function () {
                    cacheRecord.newlyCreated = [];
                    let newReturnValue;
                    // console.log("better be true");
                    // console.log(inReCache());
                    newReturnValue = this[functionName].apply(this, argumentsList);
                    // console.log(cacheRecord.newlyCreated);

                    // console.log("Assimilating:");
                    withoutRecording(function() { // Do not observe reads from the overlays
                        cacheRecord.newlyCreated.forEach(function(created) {
                            if (created.__overlay !== null) {
                                // console.log("Has overlay!");
                                // console.log(created.__overlay);
                                mergeOverlayIntoObject(created);
                            } else {
                                // console.log("Infusion id of newly created:");
                                // console.log(created.__cacheId);
                                if (created.__cacheId !== null) {

                                    cacheRecord.cacheIdObjectMap[created.__cacheId] = created;
                                }
                            }
                        });
                    }.bind(this));

                    // See if we need to trigger event on return value
                    if (newReturnValue !== cacheRecord.returnValue) {
                        cacheRecord.returnValue = newReturnValue;
                        notifyChangeObservers("functionCache.contextObservers", cacheRecord.contextObservers);
                    }
                }.bind(this)
            );
            leaveContext();
            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return cacheRecord.returnValue;
        } else {
            // Encountered these arguments before, reuse previous repeater
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver("functionCache.contextObservers", cacheRecord.contextObservers);
            return cacheRecord.returnValue;
        }
    }


    /************************************************************************
     *
     *  Block side effects
     *
     ************************************************************************/


    let throwErrorUponSideEffect = false;
    let writeRestriction = null;
    let sideEffectBlockStack = [];

    /**
     * Block side effects
     */
    function withoutSideEffects(action) {
        // enterContext('block_side_effects', {
        //    createdObjects : {}
        // });
        let restriction = {};
        sideEffectBlockStack.push({});
        writeRestriction = restriction
        let returnValue = action();
        // leaveContext();
        sideEffectBlockStack.pop();
        if (sideEffectBlockStack.length > 0) {
            writeRestriction = sideEffectBlockStack[sideEffectBlockStack.length - 1];
        }
        return returnValue;
    }

    /************************************************************************
     *
     *  Module installation
     *
     ************************************************************************/

    /**
     *  Module installation
     * @param target
     */
    function install(target) {
        if (typeof(target) === 'undefined') {
            target = (typeof(global) !== 'undefined') ? global : window;
        }

        // Main API
        target['create']                  = create;
        target['c']                       = create;
        target['uponChangeDo']            = uponChangeDo;
        target['repeatOnChange']          = repeatOnChange;
        target['repeat']                  = repeatOnChange;
        target['withoutSideEffects']      = withoutSideEffects;

        // Modifiers
        target['withoutRecording']        = withoutRecording;
        target['withoutNotifyChange']     = nullifyObserverNotification;

        // Pulse
        target['pulse']                   = pulse; // A sequence of transactions, end with cleanup.
        target['transaction']             = transaction;  // Single transaction, end with cleanup.
        target['addPostPulseAction']      = addPostPulseAction;

        // Experimental
        target['setCumulativeAssignment'] = setCumulativeAssignment;

        // Debugging and testing
        target['observeAll'] = observeAll;
        target['cachedCallCount'] = cachedCallCount;
        target['clearRepeaterLists'] = clearRepeaterLists;
        target['resetObjectIds'] = resetObjectIds;
        return target;
    }

    return {
        install: install,
        
        create : create,
        c : create,
        uponChangeDo : uponChangeDo,
        repeatOnChange : repeatOnChange,
        repeat : repeatOnChange,
        withoutSideEffects : withoutSideEffects,
        withoutRecording : withoutRecording,
        withoutNotifyChange : nullifyObserverNotification,
        pulse : pulse,
        transaction: transaction,
        addPostPulseAction : addPostPulseAction, 
		removeAllPostPulseActions : removeAllPostPulseActions, 
		setRecordEvents : setRecordEvents,
        resetObjectIds : resetObjectIds,
		setNewEventStyle : setNewEventStyle // TEMPORARY... to be removed... 
    };
}));
