// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
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

    let argumentsToArray = function(arguments) {
        return Array.prototype.slice.call(arguments);
    };
	
	function indentString(level) {
		let string = "";
		while (level-- > 0) {
			string = string + "  ";
		}
		return string;
	};
 
	function logPattern(entity, pattern, indentLevel) {
		if (typeof(entity) !== 'object') {
			let entityString = "";
			if (typeof(entity) === 'function') {
				entityString = "function( ... ) { ... }";				
			} else {
				entityString = entity;				
			}
			process.stdout.write(entityString + "\n"); 
		} else {
			if (pattern === undefined) {
				process.stdout.write("{...}\n"); 
			} else {
				if (typeof(indentLevel) === 'undefined') {
					indentLevel = 0;
				}
				let indent = indentString(indentLevel);

				console.log(indent + "{");
				for (p in entity) {
					process.stdout.write(indent + "   " + p + " : "); 
					logPattern(entity[p], pattern[p], indentLevel + 1);
				}
				console.log(indent + "}");
			}
		}
	}


    /***************************************************************
     *
     *  Mirror setup
     *
     ***************************************************************/

	let mirror = require('./mirror');
	
	let getSpecifier = mirror.getSpecifier; 
	
	let useMirror = false;
	
	function setUseMirror(value) {
		useMirror = value;
	}
	

    /***************************************************************
     *
     *  Array overrides
     *
     ***************************************************************/

    let staticArrayOverrides = {
        pop : function() {
            if (!canWrite(this.overrides.__proxy)) return;
            inPulse++;

            let index = this.target.length - 1;
            observerNotificationNullified++;
            let result = this.target.pop();
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, index, [result], null);
            if (--inPulse === 0) postPulseCleanup();
            return result;
        },

        push : function() {
            if (!canWrite(this.overrides.__proxy)) return;
            inPulse++;

            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            observerNotificationNullified++;
            this.target.push.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, index, null, argumentsArray);
            if (--inPulse === 0) postPulseCleanup();
            return this.target.length;
        },

        shift : function() {
            if (!canWrite(this.overrides.__proxy)) return;
            inPulse++;

            observerNotificationNullified++;
            let result = this.target.shift();
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, 0, [result], null);
            if (--inPulse === 0) postPulseCleanup();
            return result;

        },

        unshift : function() {
            if (!canWrite(this.overrides.__proxy)) return;
            inPulse++;

            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            observerNotificationNullified++;
            this.target.unshift.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, 0, null, argumentsArray);
            if (--inPulse === 0) postPulseCleanup();
            return this.target.length;
        },

        splice : function() {
            if (!canWrite(this.overrides.__proxy)) return;
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
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, index, removed, added);
            if (--inPulse === 0) postPulseCleanup();
            return result; // equivalent to removed
        },

        copyWithin: function(target, start, end) {
            if (!canWrite(this.overrides.__proxy)) return;
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
                notifyChangeObservers(this._arrayObservers);
            }

            emitSpliceEvent(this, target, added, removed);
            if (--inPulse === 0) postPulseCleanup();
            return result;
        }
    };

    ['reverse', 'sort', 'fill'].forEach(function(functionName) {
        staticArrayOverrides[functionName] = function() {
            if (!canWrite(this.overrides.__proxy)) return;
            inPulse++;

            let argumentsArray = argumentsToArray(arguments);
            let removed = this.target.slice(0);

            observerNotificationNullified++;
            let result = this.target[functionName].apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
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
		
		ensureInitialized(this, target);
		
        if (staticArrayOverrides[key]) {
            return staticArrayOverrides[key].bind(this);
        } else if (typeof(this.overrides[key]) !== 'undefined') {
            return this.overrides[key];
        } else {
            if (inActiveRecording) {
                registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));//object
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

		ensureInitialized(this, target);
		
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
        if (!canWrite(this.overrides.__proxy)) return;
        inPulse++;
		observerNotificationPostponed++;


        if (!isNaN(key)) {
            // Number index
            if (typeof(key) === 'string') {
                key = parseInt(key);
            }
            target[key] = value;
            if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
                emitSpliceReplaceEvent(this, key, value, previousValue);
                if (this._arrayObservers !== null) {
                    notifyChangeObservers(this._arrayObservers);
                }
            }
        } else {
            // String index
            target[key] = value;
            if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
                emitSetEvent(this, key, value, previousValue);
                if (this._arrayObservers !== null) {
                    notifyChangeObservers(this._arrayObservers);
                }
            }
        }

        if (--inPulse === 0) postPulseCleanup();

        if( target[key] !== value && !(Number.isNaN(target[key]) && Number.isNaN(value)) ) return false; // Write protected?
        observerNotificationPostponed--;
        proceedWithPostponedNotifications();
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
        if (!canWrite(this.overrides.__proxy)) return true;
		
		ensureInitialized(this, target);
		
        inPulse++;

        let previousValue = target[key];
        delete target[key];
        if(!( key in target )) { // Write protected?
            emitDeleteEvent(this, key, previousValue);
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
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

		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));
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
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));
        }
        return key in target;
    }

    function definePropertyHandlerArray(target, key, oDesc) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key, oDesc]);
        }
        if (!canWrite(this.overrides.__proxy)) return;
		
		ensureInitialized(this, target);
		
        inPulse++;
		// TODO: Elaborate here?
        if (this._arrayObservers !== null) {
            notifyChangeObservers(this._arrayObservers);
        }
        if (--inPulse === 0) postPulseCleanup();
        return target;
    }

    function getOwnPropertyDescriptorHandlerArray(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
        }

		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));
        }
        return Object.getOwnPropertyDescriptor(target, key);
    }


    /***************************************************************
     *
     *  Object Handlers
     *
     ***************************************************************/

    function getHandlerObject(target, key) {
		// console.log("");
		// console.log(this.overrides.__id);
        key = key.toString();
		// if (key instanceof 'Symbol') {
			// throw "foobar";
		// }
        if (this.overrides.__overlay !== null && key !== "__overlay" && (typeof(overlayBypass[key]) === 'undefined')) {
            let overlayHandler = this.overrides.__overlay.__handler;
            let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
            return result;
        }
		
		ensureInitialized(this, target);
				
        if (typeof(this.overrides[key]) !== 'undefined') {
            return this.overrides[key];
        } else {
            if (typeof(key) !== 'undefined') {
                let scan = target;
                while ( scan !== null && typeof(scan) !== 'undefined' ) {
                    let descriptor = Object.getOwnPropertyDescriptor(scan, key);
                    if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
                        return descriptor.get.bind(this.overrides.__proxy)();
                    }
                    scan = Object.getPrototypeOf( scan );
                }
				let keyInTarget = key in target;
				if (inActiveRecording) {
                    if (keyInTarget) {
                        registerAnyChangeObserver(getSpecifier(getSpecifier(this, "_propertyObservers"), key));
                    } else {
                        registerAnyChangeObserver(getSpecifier(this, "_enumerateObservers"));
                    }
                }
				if (keyInTarget && typeof(target._mirror_is_reflected) !== 'undefined') {
					// console.log("causality.getHandlerObject:");
					// console.log(key);
					return mirror.getProperty(target, key);
				} else {
					return target[key];
				}
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

        if (!canWrite(this.overrides.__proxy)) return;
		
		ensureInitialized(this, target);
		
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
		let resultValue;
		if (typeof(target._mirror_is_reflected) !== 'undefined') {
			// target.__id = this.overrides.__id;
			if (typeof(previousValue) === 'object') mirror.removeMirrorStructure(this.overrides.__id, previousValue);
			let referencedValue = mirror.setupMirrorReference(this.overrides.__proxy, key, value, create);
			resultValue = (target[key] = referencedValue);
		} else {
			resultValue = (target[key] = value);
		}
        if( resultValue === value || (Number.isNaN(resultValue) && Number.isNaN(value)) ) { // Write protected?
            if (undefinedKey) {
                if (typeof(this._enumerateObservers) !== 'undefined') {
                    notifyChangeObservers(this._enumerateObservers);
                }
            } else {
                if (typeof(this._propertyObservers) !== 'undefined' && typeof(this._propertyObservers[key]) !== 'undefined') {
                    notifyChangeObservers(this._propertyObservers[key]);
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

        if (!canWrite(this.overrides.__proxy)) return true;
		
		ensureInitialized(this, target);
		
        if (!(key in target)) {
            return true;
        } else {
            inPulse++;
            let previousValue = target[key];
            delete target[key];
            if(!( key in target )) { // Write protected?
                emitDeleteEvent(this, key, previousValue);
                if (typeof(this._enumerateObservers) !== 'undefined') {
                    notifyChangeObservers(this._enumerateObservers);
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
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_enumerateObservers"));
        }
        let keys = Object.keys(target);
        keys.unshift('__id');
        return keys;
    }

    function hasHandlerObject(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.has.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_enumerateObservers"));
        }
        return (key in target) || key === "__id";
    }

    function definePropertyHandlerObject(target, key, descriptor) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key]);
        }
				
        if (!canWrite(this.overrides.__proxy)) return;

		ensureInitialized(this, target);
		
        inPulse++;
		let returnValue = Reflect.defineProperty(target, key, descriptor);
		// TODO: emitEvent here?

        if (typeof(this._enumerateObservers) !== 'undefined') {
            notifyChangeObservers(this._enumerateObservers);
        }
        if (--inPulse === 0) postPulseCleanup();
        return returnValue;
    }

    function getOwnPropertyDescriptorHandlerObject(target, key) {
        if (this.overrides.__overlay !== null) {
            let overlayHandler = this.overrides.__overlay.__handler;
            return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, '_enumerateObservers'));
        }
        return Object.getOwnPropertyDescriptor(target, key);
    }


    /***************************************************************
     *
     *  Create
     *
     ***************************************************************/
	let nextHandlerId = 1;
	 
    function create(createdTarget, cacheId) {
		let __id = nextId++;
		
		let = initializer = null;
        if (typeof(createdTarget) === 'undefined') {
            createdTarget = {};
        } else if (typeof(createdTarget) === 'function') {
			initializer = createdTarget; 
            createdTarget = {};
		}
        if (typeof(cacheId) === 'undefined') {
            cacheId = null;
        }

        let handler;
        if (createdTarget instanceof Array) {
            handler = {
				__id : __id,
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
				__id : __id,
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
		
		// createdTarget.__id = __id; // TODO ??? 
		
		handler.initializer = initializer;
		
        let proxy = new Proxy(createdTarget, handler);
		
        handler.overrides = {
            __id: __id,
            __cacheId : cacheId,
            __overlay : null,
            __target: createdTarget,
            __handler : handler,
            __proxy : proxy,

            // This inside these functions will be the Proxy. Change to handler?
            repeat : genericRepeatMethod,
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

        return proxy;
    }


    /**********************************
     *
     * Initialization
     *
     **********************************/
	 
	function ensureInitialized(handler, target) {
		if (handler.initializer !== null) {
			handler.initializer(target);
			handler.initializer = null;
		}		 
	}
	 
	// function purge(object) {
		// object.__target.
	// } 
	 
		
    /**********************************
     *
     * Security and Write restrictions
     *
     **********************************/

	let customCanWrite = null; 
	
	function setCustomCanWrite(value) {
		customCanWrite = value;
	}
	 
	function canWrite(object) {
		if (postPulseProcess) {
			return false;
		}
		if (writeRestriction !== null && typeof(writeRestriction[object.__id]) === 'undefined') {
			return false;
		}
		if (customCanWrite !== null) {
			return customCanWrite(object);
		}
		return true;
	} 
	 
	let customCanRead = null; 

	function setCustomCanRead(value) {
		customCanRead = value;
	}

	function canRead(object) {
		if (customCanRead !== null) {
			return customCanRead(object);
		}
		return true;
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
	
	let postPulseProcess = false;
 
	let pulseEvents = [];
	
	let recordPulseEvents = false;
	
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
		postPulseProcess = true; // Blocks any model writing during post pulse cleanup
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
            callback(pulseEvents);
        });
		pulseEvents.length = 0;
		postPulseProcess = false;
    }

    let postPulseHooks = [];
    function addPostPulseAction(callback) {
        postPulseHooks.push(callback);
    }


    /**********************************
     *  Observe
     *
     *
     **********************************/

    function emitSpliceEvent(handler, index, removed, added) {
        if (recordPulseEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, { type: 'splice', index: index, removed: removed, added: added});
        }
    }

    function emitSpliceReplaceEvent(handler, key, value, previousValue) {
        if (recordPulseEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, { type: 'splice', index: key, removed: [previousValue], added: [value] });
        }
    }

    function emitSetEvent(handler, key, value, previousValue) {
		if (recordPulseEvents || typeof(handler.observers) !== 'undefined') {
			emitEvent(handler, {type: 'set', property: key, newValue: value, oldValue: previousValue});
        }
    }

    function emitDeleteEvent(handler, key, previousValue) {
        if (recordPulseEvents || typeof(handler.observers) !== 'undefined') {
            emitEvent(handler, {type: 'delete', property: key, deletedValue: previousValue});
        }
    }

    function emitEvent(handler, event) {
        // console.log(event);
        // event.objectId = handler.overrides.__id;
		event.object = handler.overrides.__proxy; 
		if (recordPulseEvents) {
			pulseEvents.push(event);
		}
        if (typeof(handler.observers) !== 'undefined') {
            handler.observers.forEach(function(observerFunction) {
                observerFunction(event);
            });
        }
    }

    function observeAll(array, callback) {
        array.forEach(function(element) {
            element.observe(callback);
        });
    }

    function genericObserveFunction(observerFunction) {
        let handler = this.__handler;
        if (typeof(handler.observers) === 'undefined') {
            handler.observers = [];
        }
        handler.observers.push(observerFunction);
    }


    /**********************************
     *  Dependency recording
     *
     *  Upon change do
     **********************************/

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
		let context = {
            nextToNotify: null,
            __id: nextId++,
            description: description,
            uponChangeAction: doAfterChange,
            remove : function() {
                // Clear out previous observations
				mirror.clearArray(this.sources);
            }
        }
		// context.sources = [];
		// context.sources._mirror_outgoing_parent = context;
		mirror.createArrayIndex(context, "sources");
		
        enterContext('recording', context);
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

    function registerAnyChangeObserver(observerSet) { // instance can be a cached method if observing its return value, object
		let activeRecorder = getActiveRecording();
        if (activeRecorder !== null) {
			mirror.addInArray(activeRecorder.sources, observerSet);
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
    function notifyChangeObservers(observers) {
        if (typeof(observers.initialized) !== 'undefined') {
            if (observerNotificationNullified > 0) {
                return;
            }

            let contents = observers.contents;
            for (id in contents) {
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
            __id: nextId++,
            description: description,
            action: repeaterAction,
            remove: function() {
                // console.log("removeRepeater: " + repeater.__id + "." + repeater.description);
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

	function getObjectAttatchedCache(object, cacheStoreName, functionName) {
		// object = object.__handler;
		// let functionCaches = getMap(object, cacheStoreName, functionName);
        if (typeof(object[cacheStoreName]) === 'undefined') {
            object[cacheStoreName] = {};
        }
        if (typeof(object[cacheStoreName][functionName]) === 'undefined') {
            object[cacheStoreName][functionName] = {};
        }
		return object[cacheStoreName][functionName];
	}
	
    // Get cache(s) for this argument hash
    function getFunctionCacher(functionCaches, argumentList) {
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
        let argumentsHash = makeArgumentHash(argumentList);

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

    function genericRepeatMethod() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
		
		repeatForUniqueArgumentLists(
			getObjectAttatchedCache(this, "_repeaters", functionName), 
			argumentsList,
			function() {
                returnValue = this[functionName].apply(this, argumentsList);
            }.bind(this)
		);
    }

	function repeatForUniqueCall(repeatedFunction, argumentLists) {
		if (typeof(repeatedFunction.__call_repeat_cache) === 'undefined') {
			repeatedFunction.__call_repeat_cache = {};
		}
		let cache = repeatedFunction.__call_repeat_cache;
		repeatForUniqueArgumentLists(
			cache, 
			argumentList, 
			function() {
                returnValue = repeatedFunction.apply(null, argumentsList);
            }
		);
	}
	
	function repeatForUniqueArgumentLists(cache, argumentsList, repeatedFunction) {
		let functionCacher = getFunctionCacher(cache, argumentsList);
		
        if (!functionCacher.cacheRecordExists()) {
            // Never encountered these arguments before, make a new cache
            let cacheRecord = functionCacher.createNewRecord();
            cacheRecord.independent = true; // Do not delete together with parent
            cacheRecord.remove = function() {
                functionCacher.deleteExistingRecord();
                cacheRecord.micro.remove();
            };
            getSpecifier(cacheRecord, "contextObservers").noMoreObserversCallback = function() {
                contextsScheduledForPossibleDestruction.push(cacheRecord);
            };
            enterContext('cached_repeater', cacheRecord);
            nextIsMicroContext = true;

            // cacheRecord.remove = function() {}; // Never removed directly, only when no observers & no direct application call
            cacheRecord.repeaterHandle = repeatOnChange(repeatedFunction);
            leaveContext();

            registerAnyChangeObserver(cacheRecord.contextObservers);
            return cacheRecord.repeaterHandle; // return something else...
        } else {
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver(cacheRecord.contextObservers);
            return functionCacher.getExistingRecord().repeaterHandle;
        }
	}

    function genericStopRepeatFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
		
		let cache = getObjectAttatchedCache(this, "_repeaters", functionName);
        let functionCacher = getFunctionCacher(cache, argumentsList);

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
		let cache = getObjectAttatchedCache(this, "_cachedCalls", functionName);
        let functionCacher = getFunctionCacher(cache, argumentsList); // wierd, does not work with this inestead of handler...

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
                    notifyChangeObservers(cacheRecord.contextObservers);
                }.bind(this));
            leaveContext();
            cacheRecord.returnValue = returnValue;
            getSpecifier(cacheRecord, "contextObservers").noMoreObserversCallback = function() {
                contextsScheduledForPossibleDestruction.push(cacheRecord);
            };
            registerAnyChangeObserver(cacheRecord.contextObservers);
            return returnValue;
        } else {
            // Encountered these arguments before, reuse previous repeater
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver(cacheRecord.contextObservers);
            return cacheRecord.returnValue;
        }
    }

    function genericUnCacheFunction() {
        // Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();

        // Cached
		let cache = getObjectAttatchedCache(this, "_cachedCalls", functionName);
        let functionCacher = getFunctionCacher(cache, argumentsList);

        if (functionCacher.cacheRecordExists()) {
            let cacheRecord = functionCacher.getExistingRecord();
            cacheRecord.directlyInvokedByApplication = false;
            contextsScheduledForPossibleDestruction.push(cacheRecord);
        }

        // Re cached
		cache = getObjectAttatchedCache(this, "_reCachedCalls", functionName);
        functionCacher = getFunctionCacher(cache, argumentsList);

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
            for (property in source) {
                if (isNaN(property)) {
                    target[property] = source[property];
                }
            }
        } else {
            for (property in source) {
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
		let cache = getObjectAttatchedCache(this, "_reCachedCalls", functionName);
        let functionCacher = getFunctionCacher(cache, argumentsList);

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
			getSpecifier(cacheRecord, 'contextObservers').noMoreObserversCallback = function() {
				contextsScheduledForPossibleDestruction.push(cacheRecord);
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
                        notifyChangeObservers(cacheRecord.contextObservers);
                    }
                }.bind(this)
            );
            leaveContext();
            registerAnyChangeObserver(cacheRecord.contextObservers);
            return cacheRecord.returnValue;
        } else {
            // Encountered these arguments before, reuse previous repeater
            let cacheRecord = functionCacher.getExistingRecord();
            registerAnyChangeObserver(cacheRecord.contextObservers);
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
		target['logPattern'] = logPattern;
        return target;
    }

    return {
        install: install,
        
        create : create,
        c : create,
        uponChangeDo : uponChangeDo,
        repeatOnChange : repeatOnChange,
        withoutSideEffects : withoutSideEffects,
        withoutRecording : withoutRecording,
        withoutNotifyChange : nullifyObserverNotification,
        pulse : pulse,
        transaction: transaction,
        addPostPulseAction : addPostPulseAction,

		setCustomCanRead : setCustomCanRead,
		setCustomCanWrite : setCustomCanWrite,
		
		setUseMirror : setUseMirror
    };
}));
