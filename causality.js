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
	
	let objectlog = require('./objectlog.js');
	let log = objectlog.log;
	
	let causalityCoreIdentity = {};

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

	let mirror = require('./mirror.js');
	
	let getSpecifier = mirror.getSpecifier; 
	

    /***************************************************************
     *
     *  Array const
     *
     ***************************************************************/

	 
	function createAndRemoveMirrorRelations(proxy, index, removed, added) {
		// console.log("createAndRemoveMirrorRelations " + mirrorRelations);
		if (mirrorRelations) {     
			// console.log("inside");
			// Get refering object 
            let referringObject = proxy;
			// console.log("heref");
            let referringRelation = "[]";
            while (typeof(referringObject._mirror_index_parent) !==  'undefined') {
				// console.log(looping);
                referringRelation = referringObject._mirror_index_parent_relation;
                referringObject = referringObject._mirror_index_parent;
            }
			// console.log("??");
			// console.log(referringObject.const._mirror_is_reflected);
			if (typeof(referringObject.const._mirror_is_reflected) !== 'undefined') {
				// Create mirror relations for added
				let addedAdjusted = [];
				added.forEach(function(addedElement) {
					if (isObject(addedElement) && addedElement.const._mirror_reflects) {
						// console.log("and here");
						let referencedValue;
						if (configuration.mirrorStructuresAsCausalityObjects) {
							referencedValue = mirror.setupMirrorReference(referringObject, referringObject.const.id, referringRelation, addedElement, create);
						} else {
							referencedValue = mirror.setupMirrorReference(referringObject, referringObject.const.id, referringRelation, addedElement);
						}
						if (typeof(referencedValue._incoming) !== 'undefined' && typeof(referencedValue._incoming[referringRelation]) !== 'undefined') {
							notifyChangeObservers(referencedValue._incoming[referringRelation]);
						}
						addedAdjusted.push(referencedValue);
					} else {
						addedAdjusted.push(addedElement);
					}						
				});
				
				// Remove mirror relations for removed
				if (removed !== null) {
					removed.forEach(function(removedElement) {
						if (isObject(removedElement) && removedElement.const._mirror_reflects) {
							mirror.removeMirrorStructure(proxy.const.id, removedElement);
							notifyChangeObservers(removedElement._incoming[referringRelation]);
						}					
					});					
				}
				return addedAdjusted;
			}
		}
		return added;
	} 

	
    let constArrayOverrides = {
        pop : function() {
            if (!canWrite(this.const.object)) return;
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
            if (!canWrite(this.const.object)) return;
            inPulse++;

            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
			
			let removed = null;
			let added = argumentsArray;
			
			if (mirrorRelations) {
				added = createAndRemoveMirrorRelations(this.const.object, index, removed, added); // TODO: implement for other array manipulators as well. 
			}
			
            observerNotificationNullified++;
            this.target.push.apply(this.target, argumentsArray);
            observerNotificationNullified--;
            if (this._arrayObservers !== null) {
                notifyChangeObservers(this._arrayObservers);
            }
            emitSpliceEvent(this, index, removed, added);
            if (--inPulse === 0) postPulseCleanup();
            return this.target.length;
        },

        shift : function() {
            if (!canWrite(this.const.object)) return;
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
            if (!canWrite(this.const.object)) return;
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
            if (!canWrite(this.const.object)) return;
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
            if (!canWrite(this.const.object)) return;
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
        constArrayOverrides[functionName] = function() {
            if (!canWrite(this.const.object)) return;
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

	let constArrayOverridesOptimized = {};
	for(functionName in constArrayOverrides) {
		constArrayOverridesOptimized[functionName] = constArrayOverrides[functionName];
	}
	Object.assign(constArrayOverridesOptimized, {
		push : function() {
			if (!canWrite(this.const.object)) return;
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
		}	
	});
	
	
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
	 
	/*
    function getHandlerArrayOptimized(target, key) {
        if (this.const.forwardsTo !== null && key !== 'nonForwardStatic') { //  && (typeof(overlayBypass[key]) === 'undefined')
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (constArrayOverridesOptimized[key]) {
            return constArrayOverridesOptimized[key].bind(this);
        } else if (typeof(this.const[key]) !== 'undefined') {
            return this.const[key];
        } else {
            if (inActiveRecording) {
                registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));//object
            }
            return target[key];
        }
    }
	*/
	
    function getHandlerArray(target, key) {
        if (this.const.forwardsTo !== null && key !== 'nonForwardStatic') { // && (typeof(overlayBypass[key]) === 'undefined')
			// console.log(this.const.forwardsTo);
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
		if (key === "const" || key === "nonForwardStatic") {
			return this.const;
		} else if (constArrayOverrides[key]) {
            return constArrayOverrides[key].bind(this);
        } else if (configuration.directStaticAccess && typeof(this.const[key]) !== 'undefined') {
            return this.const[key];
        } else {
            if (inActiveRecording) {
                registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));//object
            }
            return target[key];
        }
    }

    function setHandlerArray(target, key, value) {
        if (this.const.forwardsTo !== null) {
            if (key === "forwardsTo") {
                this.const.forwardsTo = value;
                return true;
            } else {
                let overlayHandler = this.const.forwardsTo.const.handler;
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
        if (configuration.cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
            return true;
        }
        if (!canWrite(this.const.object)) return;
        inPulse++;
		observerNotificationPostponed++; // TODO: Do this for backwards references from arrays as well...


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

        observerNotificationPostponed--;
        proceedWithPostponedNotifications();
        if (--inPulse === 0) postPulseCleanup();

        if( target[key] !== value && !(Number.isNaN(target[key]) && Number.isNaN(value)) ) return false; // Write protected?
		return true;
    }

    function deletePropertyHandlerArray(target, key) {
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
        }
        if (!(key in target)) {
            return true;
        }
        if (!canWrite(this.const.object)) return true;
		
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
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
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
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.has.apply(overlayHandler, [target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_arrayObservers"));
        }
        return key in target;
    }

    function definePropertyHandlerArray(target, key, oDesc) {
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key, oDesc]);
        }
        if (!canWrite(this.const.object)) return;
		
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
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
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
/*
    function getHandlerObjectOptimized(target, key) {
        key = key.toString();

        if (this.const.forwardsTo !== null && key !== "nonForwardStatic") {
            let overlayHandler = this.const.forwardsTo.const.handler;
            let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
            return result;
        }
				
        if (key === 'const') {
            return this.const;
        } else {
            if (typeof(key) !== 'undefined') {
                let scan = target;
                while ( scan !== null && typeof(scan) !== 'undefined' ) {
                    let descriptor = Object.getOwnPropertyDescriptor(scan, key);
                    if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
                        return descriptor.get.bind(this.const.object)();
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
				return target[key];
            }
        }
    }
*/
	
    function getHandlerObject(target, key) {
		if (configuration.objectActivityList) registerActivity(this);
        key = key.toString();
		// if (key instanceof 'Symbol') {
			// throw "foobar";
		// }
        if (this.const.forwardsTo !== null && key !== "nonForwardStatic") {
            let overlayHandler = this.const.forwardsTo.const.handler;
            let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
            return result;
        }
		
		ensureInitialized(this, target);
				
        if (key === "const" || key === "nonForwardStatic") {
			return this.const;
		} else if (configuration.directStaticAccess && typeof(this.const[key]) !== 'undefined') { // TODO: implement directStaticAccess for other readers. 
            // console.log(key);
			return this.const[key];
        } else {
            if (typeof(key) !== 'undefined') {
                let scan = target;
                while ( scan !== null && typeof(scan) !== 'undefined' ) {
                    let descriptor = Object.getOwnPropertyDescriptor(scan, key);
                    if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
                        return descriptor.get.bind(this.const.object)();
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
				if (keyInTarget && !exposeMirrorRelationIntermediary && typeof(this.const._mirror_is_reflected) !== 'undefined') {
					// console.log("causality.getHandlerObject:");
					// console.log(key);
					return mirror.getProperty(target, key);
				} else {
					return target[key];
				}
            }
        }
    }
	
	function setupMirrorRelation(proxy, key, value, previousValue) {
		// console.log("setup mirror relation");
		// Get refering object 
        let referringObject = proxy;
        let referringRelation = key;
        while (typeof(referringObject._mirror_index_parent) !==  'undefined') {
            referringRelation = referringObject._mirror_index_parent_relation;
            referringObject = referringObject._mirror_index_parent;
        }
		
		// console.log("here too");
		if (typeof(referringObject.const._mirror_is_reflected) !== 'undefined') {
			if (isObject(previousValue) && previousValue.const._mirror_reflects) {
				mirror.removeMirrorStructure(referringObject.const.id, previousValue);
				notifyChangeObservers(previousValue._incoming[referringRelation]);
			}
			// console.log("here");
			if (isObject(value) && value.const._mirror_reflects) {
				// console.log("Setup mirror relation")
				let referencedValue = mirror.setupMirrorReference(referringObject, referringObject.const.id, referringRelation, value);
				if (typeof(referencedValue._incoming) !== 'undefined' && typeof(referencedValue._incoming[referringRelation]) !== 'undefined') {
					notifyChangeObservers(referencedValue._incoming[referringRelation]);
				}
				value = referencedValue;
			}
		}
		return value;
	}
	
	/*
    function setHandlerObjectOptimized(target, key, value) {		
		// Overlays
        if (this.const.forwardsTo !== null) {
			let overlayHandler = this.const.forwardsTo.const.handler;
			return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
        }
		
        // Writeprotection
		if (postPulseProcess) {
			return;
		}
		if (writeRestriction !== null && typeof(writeRestriction[object.const.id]) === 'undefined') {
			return;
		}
		
		let previousValue = target[key];
		
		// If same value as already set, do nothing.
        if (key in target) {
            if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
                return true;
            }
        }
		
		// Pulse start
        inPulse++;
		// observerNotificationPostponed++;
        let undefinedKey = !(key in target);
		
		// Perform assignment with regards to mirror structures.
		target[key] = value;

		
		// If assignment was successful, notify change
		if (undefinedKey) {
			if (typeof(this._enumerateObservers) !== 'undefined') {
				notifyChangeObservers(this._enumerateObservers);
			}
		} else {
			if (typeof(this._propertyObservers) !== 'undefined' && typeof(this._propertyObservers[key]) !== 'undefined') {
				notifyChangeObservers(this._propertyObservers[key]);
			}
		}

		// Emit event
		emitSetEvent(this, key, value, previousValue);
		
		// End pulse 
		// observerNotificationPostponed--;
        // proceedWithPostponedNotifications();
        if (--inPulse === 0) postPulseCleanup();
		return true;
    }
	*/

    function setHandlerObject(target, key, value) {
		if (configuration.objectActivityList) registerActivity(this);
				
		// Overlays
        if (this.const.forwardsTo !== null) {
			let overlayHandler = this.const.forwardsTo.const.handler;
			return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
        }
		
        // Writeprotection
		if (!canWrite(this.const.object)) return;
		
		// Ensure initialized
		ensureInitialized(this, target);
		
		// Get previous value		// Get previous value
		let previousValue;
		let previousMirrorStructure;
		if (mirrorRelations && typeof(this.const._mirror_is_reflected) !== 'undefined') {
			// console.log("causality.getHandlerObject:");
			// console.log(key);
			previousMirrorStructure = target[key];
			previousValue = mirror.getProperty(target, key);
		} else {
			previousValue = target[key]; 
		}
        
		// If same value as already set, do nothing.
        if (key in target) {
            if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
                return true;
            }
        }
		
        // If cumulative assignment, inside recorder and value is undefined, no assignment.
        if (configuration.cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
            return true;
        }
		
		// Pulse start
        inPulse++;
		observerNotificationPostponed++;
        let undefinedKey = !(key in target);
		
		// Perform assignment with regards to mirror structures.
		let mirrorStructureValue;
		if (mirrorRelations) {
			mirrorStructureValue = setupMirrorRelation(this['const'].object, key, value, previousValue);
			target[key] = mirrorStructureValue; 
		} else {
			target[key] = value;
		}
		
		// If assignment was successful, notify change
		if (undefinedKey) {
			if (typeof(this._enumerateObservers) !== 'undefined') {
				notifyChangeObservers(this._enumerateObservers);
			}
		} else {
			if (typeof(this._propertyObservers) !== 'undefined' && typeof(this._propertyObservers[key]) !== 'undefined') {
				notifyChangeObservers(this._propertyObservers[key]);
			}
		}

		// Emit event
		if (exposeMirrorRelationIntermediary) {
			previousValue = previousMirrorStructure;
			value = mirrorStructureValue;
		}
		emitSetEvent(this, key, value, previousValue);
		
		// End pulse 
		observerNotificationPostponed--;
        proceedWithPostponedNotifications();
        if (--inPulse === 0) postPulseCleanup();
		return true;
    }

    function deletePropertyHandlerObject(target, key) {
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
            return true;
        }

        if (!canWrite(this.const.object)) return true;
		
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
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.ownKeys.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_enumerateObservers"));
        }
        let keys = Object.keys(target);
        return keys;
    }

    function hasHandlerObject(target, key) {
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.has.apply(overlayHandler, [overlayHandler.target, key]);
        }
		
		ensureInitialized(this, target);
		
        if (inActiveRecording) {
            registerAnyChangeObserver(getSpecifier(this, "_enumerateObservers"));
        }
        return (key in target);
    }

    function definePropertyHandlerObject(target, key, descriptor) {
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
            return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key]);
        }
				
        if (!canWrite(this.const.object)) return;

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
        if (this.const.forwardsTo !== null) {
            let overlayHandler = this.const.forwardsTo.const.handler;
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
	 
	function createImmutable(initial) {
		inPulse++;
		initial.const = {id : nextId++};
		emitImmutableCreationEvent(initial);
		if (--inPulse === 0) postPulseCleanup();
		return initial;
	} 
	 
    function create(createdTarget, cacheId) {
		inPulse++;
		let id = nextId++;
		
		let initializer = null;
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
				id : id, // TODO: remove?
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
						// Optimization
			// if (!configuration.activateSpecialFeatures) {
				// handler.get = getHandlerArrayOptimized;
			// }
        } else {
            // let _propertyObservers = {};
            // for (property in createdTarget) {
            //     _propertyObservers[property] = {};
            // }
            handler = {
				id : id, // TODO: remove?
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
			// Optimization
			// if (!configuration.activateSpecialFeatures) {
				// handler.set = setHandlerObjectOptimized;
				// handler.get = getHandlerObjectOptimized;
			// }
        }

        handler.target = createdTarget;
		
		// createdTarget.const.id = id; // TODO ??? 
				
        let proxy = new Proxy(createdTarget, handler);
		
        handler.const = {
			initializer : initializer,
			causalityInstanceIdentity : causalityCoreIdentity,
            id: id,
            cacheId : cacheId,
            forwardsTo : null,
            target: createdTarget,
            handler : handler,
            object : proxy,
			 
			// __mirror_is_reflected : false,
			// __mirror_reflects : false,

            // This inside these functions will be the Proxy. Change to handler?
            repeat : genericRepeatMethod.bind(proxy),
            tryStopRepeat : genericStopRepeatFunction.bind(proxy),

            observe: genericObserveFunction.bind(proxy),

            cached : genericCallAndCacheFunction.bind(proxy),
            cachedInCache : genericCallAndCacheInCacheFunction.bind(proxy),
            reCached : genericReCacheFunction.bind(proxy),
            reCachedInCache : genericReCacheInCacheFunction.bind(proxy),
            tryUncache : genericUnCacheFunction.bind(proxy),

            // reCache aliases
            project : genericReCacheFunction.bind(proxy),
            projectInProjectionOrCache : genericReCacheInCacheFunction.bind(proxy),

            // Identity and state
            mergeFrom : genericMergeFrom.bind(proxy),
            forwardTo : genericForwarder.bind(proxy),
            removeForwarding : genericRemoveForwarding.bind(proxy),
            mergeAndRemoveForwarding: genericMergeAndRemoveForwarding.bind(proxy)
        };
		handler.const.const = handler.const;
		handler.const.nonForwardStatic = handler.const;

        if (inReCache()) {
            if (cacheId !== null &&  typeof(context.cacheIdObjectMap[cacheId]) !== 'undefined') {
                // Overlay previously created
                let infusionTarget = context.cacheIdObjectMap[cacheId];
                infusionTarget.const.handler.const.forwardsTo = proxy;
                context.newlyCreated.push(infusionTarget);
                return infusionTarget;   // Borrow identity of infusion target.
            } else {
                // Newly created in this reCache cycle. Including overlaid ones.
                context.newlyCreated.push(proxy);
            }
        }

        if (writeRestriction !== null) {
            writeRestriction[proxy.const.id] = true;
        }
		
		emitCreationEvent(handler);
		if (--inPulse === 0) postPulseCleanup();
        return proxy;
    }

	function isObject(entity) {
		return typeof(entity) === 'object' && entity !== null && typeof(entity.const) !== 'undefined' && entity.const.causalityInstanceIdentity === causalityCoreIdentity;
	}
	
    /**********************************
     *
     * Initialization
     *
     **********************************/
	 
	function ensureInitialized(handler, target) {
		if (handler.const.initializer !== null) {
			let initializer = handler.const.initializer;
			initializer(target);
			handler.const.initializer = null;
		}
	}
	 
	// function purge(object) {
		// object.target.
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
		if (writeRestriction !== null && typeof(writeRestriction[object.const.id]) === 'undefined') {
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
        action();
        if (--inPulse === 0) postPulseCleanup();
    }

    let transaction = postponeObserverNotification;

    function postponeObserverNotification(action) {
        inPulse++;
        observerNotificationPostponed++;
        action();
        observerNotificationPostponed--;
        proceedWithPostponedNotifications();
        if (--inPulse === 0) postPulseCleanup();
    }

    let contextsScheduledForPossibleDestruction = [];

    function postPulseCleanup() {
		postPulseProcess = true; // Blocks any model writing during post pulse cleanup
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
		pulseEvents = [];
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
	
	function emitImmutableCreationEvent(object) {
        if (recordPulseEvents) {
			let event = { type: 'creation', object: object }
			if (recordPulseEvents) {
				pulseEvents.push(event);
			}
		}		
	} 
	
	function emitCreationEvent(handler) {
        if (recordPulseEvents) {
			emitEvent(handler, { type: 'creation' });
		}		
	} 
	 
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
        // event.objectId = handler.const.id;
		event.object = handler.const.object; 
		if (recordPulseEvents) {
			pulseEvents.push(event);
		}
        if (typeof(handler.observers) !== 'undefined') {
            handler.observers.forEach(function(observerFunction) {
                observerFunction(event);
            });
        }
    }
	
	function emitUnobservableEvent(event) {
		if (recordPulseEvents) {
			pulseEvents.push(event);
		}
	}

    function observeAll(array, callback) {
        array.forEach(function(element) {
            element.const.observe(callback);
        });
    }

    function genericObserveFunction(observerFunction) {
        let handler = this.const.handler;
        if (typeof(handler.observers) === 'undefined') {
            handler.observers = [];
        }
        handler.observers.push(observerFunction);
    }


    /**********************************
     *  Actions
     *
     **********************************/
	 
	/**
	* Forms: 
	* 
	* createAction(function)
	* createAction(functionName, arglist)
	* createAction(functionPath, arglist)
	* createAction(object, methodName, arglist)
	*/
	function createAction() {
		arguments = argumentsToArray(arguments);
		let argumentsLength = arguments.length;
        if (argumentsLength === 1) {
            return arguments[0];
        } else if (argumentsLength === 2){
			if (arguments[0] instanceof Array) {
				return createImmutable({
					functionPath : createImmutable(arguments.unshift()),
					arguments : createImmutable(arguments) 
				});
			} else {
				return createImmutable({
					functionName : arguments.unshift(),
					arguments : createImmutable(arguments)
				});
			}
        } else if (argumentsLength === 3) {
			return createImmutable({
				object : arguments.unshift(),
				methodName : arguments.unshift(),
				arguments : createImmutable(arguments)
			});
		}
	}
	
	function performAction(action) {
		if (typeof(action) === 'function') {
			return action();
		} else {
			if (typeof(action.object) === 'undefined') {
				if (typeof(action.functionPath) === 'undefined') {
					// TODO: use window also...
					return global[action.methodName].apply(null, action.arglist);
				} else {
					let tmpFunction = null;
					action.functionPath.forEach(function(name) {
						if (tmpFunction === null) {
							tmpFunction = global[action.methodName];
						} else {
							tmpFunction = tmpFunction[name]; 
						}
					});
					return tmpFunction.apply(null, action.arglist);
				}
			} else {
				return action.object[action.methodName].apply(action.object, action.arglist);
			}
		}
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
		let context = createImmutable({
            nextToNotify: null,
            description: description,
            uponChangeAction: doAfterChange,
            remove : function() {
                // Clear out previous observations
				mirror.clearArray(this.sources);
            }
        });
		// context.sources = [];
		// context.sources._mirror_outgoing_parent = context;
		mirror.createArrayIndex(context, "sources");
		
        enterContext('recording', context);
        let returnValue = performAction(doFirst);
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
                performAction(recorder.uponChangeAction);
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
                performAction(observer.uponChangeAction);
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
        return refreshRepeater(createImmutable({
            description: description,
            action: repeaterAction,
            remove: function() {
                // console.log("removeRepeater: " + repeater.const.id + "." + repeater.description);
                removeChildContexts(this);
                detatchRepeater(this);
                this.micro.remove(); // Remove recorder!
            },
            nextDirty : null,
            previousDirty : null
        }));
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
		// object = object.const.handler;
		// let functionCaches = getMap(object, cacheStoreName, functionName);
        if (typeof(object[cacheStoreName]) === 'undefined') {
            object[cacheStoreName] = createImmutable({}); // TODO: These are actually not immutable, more like unobservable. They can change, but changes needs to register manually.... 
        }
        if (typeof(object[cacheStoreName][functionName]) === 'undefined') {
            object[cacheStoreName][functionName] = createImmutable({});
        }
		return object[cacheStoreName][functionName];
	}
	
    // Get cache(s) for this argument hash
	// function caches has to be a full object.
    function getFunctionCacher(functionCaches, argumentList) {
        let uniqueHash = true;
        function makeArgumentHash(argumentList) {
            let hash  = "";
            let first = true;
            argumentList.forEach(function (argument) {
                if (!first) {
                    hash += ",";
                }

                if (isObject(argument)) { //typeof(argument) === 'object' &&
                    hash += "{id=" + argument.const.id + "}";
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
					emitUnobservableEvent({object: functionCaches, type: 'delete', oldValue: result});
                    return result;
                } else {
					let cacheBucket = functionCaches[argumentsHash];					
                    for (let i = 0; i < cacheBucket.length; i++) {
                        if (compareArraysShallow(cacheBucket[i].functionArguments, functionArguments)) {
                            let result = cacheBucket[i];
                            cacheBucket.splice(i, 1);
							emitUnobservableEvent({object: functionCaches, type: 'splice', index: 1, added: [], removed: [result]});
                            return result;
                        }
                    }
                }
            },

            getExistingRecord : function() {
                if (uniqueHash) {
                    return functionCaches[argumentsHash]
                } else {
                    let cacheBucket = functionCaches[argumentsHash]
                    for (let i = 0; i < cacheBucket.length; i++) {
                        if (compareArraysShallow(cacheBucket[i].functionArguments, functionArguments)) {
                            return cacheBucket[i];
                        }
                    }
                }
            },
			
            createNewRecord : function() {
                if (uniqueHash) {
					let newCacheRecord = createImmutable({});
					functionCaches[argumentsHash] = newCacheRecord;
					emitUnobservableEvent({object: functionCaches, type: 'set', property: argumentsHash, oldValueUndefined: true , value: newCacheRecord});
                    return functionCaches[argumentsHash];
                } else {
                    if (typeof(functionCaches[argumentsHash]) === 'undefined') {
						let cacheBucket = createImmutable([]);
                        functionCaches[argumentsHash] = cacheBucket;
						emitUnobservableEvent({object: functionCaches, type: 'set', property: argumentsHash , oldValueUndefined: true , value: cacheBucket});
                    }
                    let hashBucket = functionCaches[argumentsHash];
                    let newCacheRecord = createImmutable({});
                    hashBucket.push(newCacheRecord);
					emitUnobservableEvent({object: hashBucket, type: 'splice', index: "foo", removed: null , added: [newCacheRecord]});
                    return newCacheRecord;
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
                return this[functionName].apply(this, argumentsList);
            }.bind(this)
		);
    }

	// function repeatForUniqueCall(repeatedFunction, argumentLists) {
		// if (typeof(repeatedFunction.__call_repeat_cache) === 'undefined') {
			// repeatedFunction.__call_repeat_cache = {};
		// }
		// let cache = repeatedFunction.__call_repeat_cache;
		// repeatForUniqueArgumentLists(
			// cache, 
			// argumentList, 
			// function() {
                // return repeatedFunction.apply(null, argumentsList); // Will this work if this is already bound?
            // }
		// );
	// }
	
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
            return this.const.cached.apply(this, argumentsArray);
        } else {
            let functionName = argumentsArray.shift();
            return this[functionName].apply(this, argumentsArray);
        }
    }
	
    function genericCallAndCacheFunction() {
		// Split arguments
        let argumentsList = argumentsToArray(arguments);
        let functionName = argumentsList.shift();
		
		return callAndCacheForUniqueArgumentLists(
			getObjectAttatchedCache(this, "_cachedCalls", functionName), 
			argumentsList,
			function() {
                return this[functionName].apply(this, argumentsList);
            }.bind(this)
		);
    }
	
	function callAndCacheForUniqueArgumentLists(cache, argumentsList, callAction) {
        let functionCacher = getFunctionCacher(cache, argumentsList);

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
                    returnValue = callAction();
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
	
	/*
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
*/

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

    // let overlayBypass = {  // maybe useful when direct const access?
        // 'forwardsTo' : true,
        // 'removeForwarding' : true,
        // 'mergeAndRemoveForwarding' : true
    // };

    function mergeInto(source, target) {
		// console.log("merge into!!");
        if (source instanceof Array) {
            let splices = differentialSplices(target.const.target, source.const.target);
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
        let overlay = object.nonForwardStatic.forwardsTo;
        object.nonForwardStatic.forwardsTo = null;
        mergeInto(overlay, object);
    }

    function genericMergeFrom(otherObject) {
        return mergeInto(otherObject, this);
    }

    function genericForwarder(otherObject) {
        this.const.forwardsTo = otherObject;
    }

    function genericRemoveForwarding() {
        this.nonForwardStatic.forwardsTo = null;
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
            return this.const.reCached.apply(this, argumentsArray);
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
                            if (created.nonForwardStatic.forwardsTo !== null) {
                                // console.log("Has overlay, merge!!!!");
                                mergeOverlayIntoObject(created);
                            } else {
                                // console.log("Infusion id of newly created:");
                                // console.log(created.const.cacheId);
                                if (created.const.cacheId !== null) {

                                    cacheRecord.cacheIdObjectMap[created.const.cacheId] = created;
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
     *  For all incoming
     *
     ************************************************************************/

	function forAllIncoming(object, property, callback) {
		registerAnyChangeObserver(getSpecifier(getSpecifier(object, "_incoming"), property));
		withoutRecording(function() { // This is needed for setups where incoming structures are made out of causality objects. 
			mirror.forAllIncoming(object, property, callback);
		});
 	}
	 
    /************************************************************************
     *
     *   Object activity list
     *
     ************************************************************************/
	 
	let activityListFirst = null; 
	let activityListLast = null; 

	function getActivityListLast() {
		return activityListLast.const.object;
	}

	function getActivityListFirst() {
		return activityListFirst.const.object;
	}

	function removeFromActivityList(proxy) {
		removeFromActivityListHandler(proxy.const.handler);
	}
	
	function registerActivity(handler) {
		// Init if not initialized
		if (typeof(handler.activityListNext) === 'undefined') {
			handler.activityListNext = null;
			handler.activityListPrevious = null;
		}
		
		// Remove from wherever it is in the structure
		removeFromActivityListHandler(handler);

		// Add first
		handler.activityListPrevious = null;
		if (activityListFirst !== null) {
			activityListFirst.activityListPrevious = handler;
			handler.activityListNext = activityListFirst;
		} else {
			activityListLast = handler;
		}
		activityListFirst = handler;
	}
	
	function removeFromActivityListHandler(handler) {
		// Remove from wherever it is in the structure
		if (handler.activityListNext !== null) {
			handler.activityListNext.previous = handler.activityListPrevious;
		}
		if (handler.activityListPrevious !== null) {
			handler.activityListPrevious.next = handler.activityListNext;
		}
		if (activityListLast === handler) {
			activityListLast = handler.activityListPrevious;
		}
		if (activityListFirst === handler) {
			activityListFirst = handler.activityListNext;
		}
		handler.activityListNext = null;
		handler.activityListPrevious = null;
	}
	 
    /************************************************************************
     *
     *  Module installation and configuration
     *
     ************************************************************************/

	let configuration;
	
	let mirrorRelations;
	let exposeMirrorRelationIntermediary;
	let mirrorStructuresAsCausalityObjects;
	
	function getConfiguration() {
		return configuration;
	}

	let defaultConfiguration = {
		// Main feature switch, turn off for performance! This property will be set automatically depending on the other settings.
		activateSpecialFeatures : false, 
		
		// Special features
		mirrorRelations : false,
		exposeMirrorRelationIntermediary : false,
		mirrorStructuresAsCausalityObjects: false,
		
		cumulativeAssignment : false,
		directStaticAccess : false,
		objectActivityList : false,
		recordPulseEvents : false
	}
	 	
	function setConfiguration(newConfiguration) {
		// Find existing configuration
		let existingConfiguration = null;
		if (typeof(configuration) === 'undefined') {
			existingConfiguration = defaultConfiguration;
		} else {
			existingConfiguration = configuration;
		}
		
		// Merge
		Object.assign(existingConfiguration, newConfiguration);
		configuration = existingConfiguration;
		let anySet = false;
		for (property in configuration) {
			anySet = configuration[property] || anySet;
		}
		if (anySet) {
			configuration.activateSpecialFeatures = true;
		}
		
		// Assign optimized variables (reduce one object indexing)
		recordPulseEvents = configuration.recordPulseEvents;
		mirrorRelations = configuration.mirrorRelations;
		exposeMirrorRelationIntermediary = configuration.exposeMirrorRelationIntermediary;
		mirrorStructuresAsCausalityObjects = configuration.mirrorStructuresAsCausalityObjects;
	}
	setConfiguration({});
	
    function setCumulativeAssignment(value) {
		setConfiguration({cumulativeAssignment : value}); 
    }
	 

	// Language extensions
	let languageExtensions = {
		// Object creation and identification
		create : create,
        c : create,
		isObject: isObject,
		
		// Reactive primitives
        uponChangeDo : uponChangeDo,
        repeatOnChange : repeatOnChange,
		repeat: repeatOnChange,
		
		// Global modifiers
        withoutSideEffects : withoutSideEffects,
        withoutRecording : withoutRecording,
        withoutNotifyChange : nullifyObserverNotification,
		
		// Pulses and transactions
        pulse : pulse, // A sequence of transactions, end with cleanup.
        transaction: transaction, // Single transaction, end with cleanup. 	
		forAllIncoming : forAllIncoming,
	}
	
	// Debugging and testing
	let debuggingAndTesting = {
		observeAll : observeAll,
        cachedCallCount : cachedCallCount,
        clearRepeaterLists : clearRepeaterLists,
        resetObjectIds : resetObjectIds,
		logPattern : logPattern
	}
		
    /**
     *  Module installation
     * @param target
     */
    function install(target, configuration) {
        if (typeof(target) === 'undefined') {
            target = (typeof(global) !== 'undefined') ? global : window;
        } else {
			if (typeof(configuration) !== 'undefined') {
				setConfiguration(configuration);
			}			
		}

		Object.assign(target, languageExtensions);
		Object.assign(target, debuggingAndTesting);
        return target;
    }

	let module = {
		install : install,
		
		// Framework setup (usually not used by application code)
        setConfiguration : setConfiguration,
		getConfiguration : getConfiguration,
		setCumulativeAssignment : setCumulativeAssignment,
		
		// Setup & Configuration
        addPostPulseAction : addPostPulseAction,
		setCustomCanRead : setCustomCanRead,
		setCustomCanWrite : setCustomCanWrite,

		// Framework interface
		getActivityListLast : getActivityListLast,
		getActivityListFirst : getActivityListFirst,
		removeFromActivityList : removeFromActivityList
	}
	Object.assign(module, languageExtensions);
    return module;
}));
