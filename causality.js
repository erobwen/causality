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

    function isDefined(object, property) {
        return (typeof(object[property]) !== 'undefined');
    }

    function setIfNotDefined(object, property, value) {
        if (typeof(object[property]) === 'undefined') {
            object[property] = value;
        }
    }

    let argumentsToArray = function(arguments) {
        return Array.prototype.slice.call(arguments);
    };

    let staticArrayOverrides = {
        pop : function() {
            let result;
            let index = this.target.length - 1;
            nullifyObserverNotification(function() {
                result = this.target.pop();
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: index, removed: [result], added: null});
            return result;
        },

        push : function() {
            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            nullifyObserverNotification(function() {
                this.target.push.apply(this.target, argumentsArray);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: index, removed: [], added: argumentsArray});
            return this.target.length;
        },

        shift : function() {
            let result;
            nullifyObserverNotification(function() {
                result = this.target.shift();
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: 0, removed: [result], added: null});
            return result;

        },

        unshift : function() {
            let index = this.target.length;
            let argumentsArray = argumentsToArray(arguments);
            nullifyObserverNotification(function() {
                this.target.unshift.apply(this.target, argumentsArray);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: 0, removed: [], added: argumentsArray});
            return this.target.length;
        },

        splice : function() {
            let argumentsArray = argumentsToArray(arguments);
            let index = argumentsArray[0];
            let removedCount = argumentsArray[1];
            let added = argumentsArray.slice(2);
            let removed = this.target.slice(index, index + removedCount);
            let result;
            nullifyObserverNotification(function() {
                result = this.target.splice.apply(this.target, argumentsArray);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: index, removed: removed, added: added});
            return result; // equivalent to removed
        },

        copyWithin: function(target, start, end) {
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

            let result;
            nullifyObserverNotification(function() {
                result = this.target.copyWithin(target, start, end);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);

            this.emitEvent({action: 'splice', index: target, added: added, removed: removed});
            return result;
        }
    };

    ['reverse', 'sort', 'fill'].forEach(function(functionName) {
        staticArrayOverrides[functionName] = function() {
            let argumentsArray = argumentsToArray(arguments);
            let removed = this.target.slice(0);

            let result;
            nullifyObserverNotification(function() {
                result = this.target[functionName].apply(this.target, argumentsArray);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", this._arrayObservers);
            this.emitEvent({type: 'splice', index: 0, removed: removed, added: this.target.slice(0)});
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
    function create(createdTarget) {
        if (typeof(createdTarget) === 'undefined') {
            createdTarget = {};
        }

        let handler;
        if (createdTarget instanceof Array) {
            handler = {
                _arrayObservers : {},

                // getPrototypeOf: function () {},
                // setPrototypeOf: function () {},
                // isExtensible: function () {},
                // preventExtensions: function () {},
                // apply: function () {},
                // construct: function () {},

                get: function (target, key) {
                    if (staticArrayOverrides[key]) {
                        return staticArrayOverrides[key].bind(this);
                    } else if (this.overrides[key]) {
                        return this.overrides[key];
                    } else {
                        registerAnyChangeObserver("_arrayObservers", this._arrayObservers);//object
                        return target[key];
                    }
                },

                set: function (target, key, value) {
                    // If same value as already set, do nothing.
                    // if (!!isNaN(key) && key in target) {
                    //     let previousValue = target[key];
                    //     if (previousValue === value || ( typeof(previousValue) === 'number' && isNaN(previousValue) && typeof(value) === 'number' && isNaN(value))) {
                    //         return false;
                    //     }
                    // }

                    // If cumulative assignment, inside recorder and value is undefined, no assignment.
                    if (cumulativeAssignment && activeRecorders.length > 0 && (isNaN(value) || typeof(value) === 'undefined')) {
                        return false;
                    }
                    if (!isNaN(key)) {
                        if (typeof(key) === 'string') {
                            key = parseInt(key);
                        }
                        this.emitEvent({ type: 'splice', index: key, removed: [target[key]], added: [value] });
                    }
                    target[key] = value;
                    notifyChangeObservers("_arrayObservers", this._arrayObservers);
                    return true;
                },

                deleteProperty: function (target, key) {
                    if (!(key in target)) {
                        return false;
                    } else {
                        delete target[key];
                        notifyChangeObservers("_arrayObservers", this._arrayObservers);
                        return true;
                    }
                },

                ownKeys: function (target) {
                    registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
                    let result   = Object.keys(target);
                    if ((target instanceof Array)) {
                        result.push('length');
                    }
                    return result;
                },

                has: function (target, key) {
                    registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
                    return key in target;
                },

                defineProperty: function (target, key, oDesc) {
                    notifyChangeObservers("_arrayObservers", this._arrayObservers);
                    return target;
                },

                getOwnPropertyDescriptor: function (target, key) {
                    registerAnyChangeObserver("_arrayObservers", this._arrayObservers);
                    return Object.getOwnPropertyDescriptor(target, key);
                }
            };
        } else {
            let _propertyObservers = {};
            for (property in createdTarget) {
                _propertyObservers[property] = {};
            }
            handler = {
                // getPrototypeOf: function () {},
                // setPrototypeOf: function () {},
                // isExtensible: function () {},
                // preventExtensions: function () {},
                // apply: function () {},
                // construct: function () {},

                _enumerateObservers : {},
                _propertyObservers: _propertyObservers,

                get: function (target, key) {
                    if (this.overrides[key]) {
                        return this.overrides[key];
                    } else {
                        if (typeof(key) !== 'undefined') {
                            let keyString = key.toString();

                            if (typeof(this._propertyObservers[keyString]) ===  'undefined') {
                                this._propertyObservers[keyString] = {};
                            }
                            if (keyString in target) {
                                registerAnyChangeObserver("_propertyObservers." + keyString, this._propertyObservers[keyString]);
                            } else {
                                registerAnyChangeObserver("_enumerateObservers." + keyString, this._enumerateObservers);
                            }
                            return target[keyString];
                        }
                    }
                },

                set: function (target, key, value) {
                    // If same value as already set, do nothing.
                    if (key in target) {
                        let previousValue = target[key];
                        if (previousValue === value || ( typeof(previousValue) === 'number' && isNaN(previousValue) && typeof(value) === 'number' && isNaN(value))) {
                            return false;
                        }
                    }

                    // If cumulative assignment, inside recorder and value is undefined, no assignment.
                    if (cumulativeAssignment && activeRecorders.length > 0 && (isNaN(value) || typeof(value) === 'undefined')) {
                        return false;
                    }

                    let undefinedKey = !(key in target);
                    let previousValue = target[key]
                    target[key]      = value;
                    postponeObserverNotification(function() {
                        if (undefinedKey) {
                            notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
                        } else {
                            notifyChangeObservers("_propertyObservers." + key, this._propertyObservers[key]);
                        }
                    }.bind(this));
                    this.emitEvent({type: 'set', newValue: value, oldValue: previousValue})
                    return true;
                },

                deleteProperty: function (target, key) {
                    if (!(key in target)) {
                        return false;
                    } else {
                        delete target[key];
                        notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
                        return true;
                    }
                },

                ownKeys: function (target, key) { // Not inherited?
                    registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
                    return Object.keys(target);
                },

                has: function (target, key) {
                    registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
                    return key in target;
                },

                defineProperty: function (target, key, descriptor) {
                    notifyChangeObservers("_enumerateObservers", this._enumerateObservers);
                    return Reflect.defineProperty(target, key, descriptor);
                },

                getOwnPropertyDescriptor: function (target, key) {
                    registerAnyChangeObserver("_enumerateObservers", this._enumerateObservers);
                    return Object.getOwnPropertyDescriptor(target, key);
                }
            };
        }
        handler.target = createdTarget;

        let proxy = new Proxy(createdTarget, handler);

        handler.emitEvent = function(event) {
            if (typeof(handler.observers) !== 'undefined') {
                handler.observers.forEach(function(observerFunction) {
                    observerFunction(event);
                });
            }
        };

        handler.overrides = {
            __id: nextId++,
            __target: createdTarget,
            repeat :  getGenericRepeatFunction(handler),
            cached : getGenericCallAndCacheFunction(handler),
            cachedInCache : function() { // Only cache if within another cached call.
                let argumentsArray = argumentsToArray(arguments);
                if (inCachedCall > 0) {
                    return this.cached.apply(this, argumentsArray);
                } else {
                    let functionName = argumentsArray.shift();
                    return this[functionName].apply(this, argumentsArray);
                }
            },
            replaceWith : getGenericReplacer(handler),
            project: getGenericProjectFunction(handler),
            observe: function(observerFunction) {
                if (typeof(handler.observers) === 'undefined') {
                    handler.observers = [];
                }
                handler.observers.push(observerFunction);
            }
        };

        // Collect newly created
        if (collecting.length > 0) {
            collecting[collecting.length - 1].push(proxy);
        }
        return proxy;
    }

    let c = create;


    /**********************************
     *  Dependency recording
     *
     *  Upon change do
     **********************************/

    // Recorder stack
    let activeRecorders = [];

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

        // Recorder structure
        let recorder = {
            nextToNotify: null,
            id: recorderId++,
            description: description,
            sources: [],
            uponChangeAction: doAfterChange
        };

        // Start recording, do first action then stop recording.
        activeRecorders.push(recorder);
        let returnValue = doFirst();
        activeRecorders.pop();

        return returnValue;
    }

    let recordingPaused = 0;

    function withoutRecording(action) {
        recordingPaused++;
        action();
        recordingPaused--;
    }

    let sourcesObserverSetChunkSize = 500;
    function registerAnyChangeObserver(description, observerSet) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
        if (typeof(observerSet.initialized) === 'undefined') {
            observerSet.isRoot = true;
            observerSet.contents = {};
            observerSet.contentsCounter = 0;
            observerSet.initialized = true;
            observerSet.first = null;
            observerSet.last = null;
        }

        if (activeRecorders.length > 0 && recordingPaused === 0) {
            let activeRecorder = activeRecorders[activeRecorders.length - 1];
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

    function postponeObserverNotification(callback) {
        observerNotificationPostponed++;
        callback();
        observerNotificationPostponed--;
        proceedWithPostponedNotifications();
    }

    let transaction = postponeObserverNotification;

    // Recorders is a map from id => recorder
    function notifyChangeObservers(description, observers) {
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

    function notifyChangeObserver(observer) {
        if (observer != activeRecorders[activeRecorders.length - 1]) {
            removeObservation(observer); // Cannot be any more dirty than it already is!
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


    function removeObservation(recorder) {
        // Clear out previous observations
        recorder.sources.forEach(function (observerSet) { // From observed object
            // let observerSetContents = getMap(observerSet, 'contents');
            if (typeof(observerSet['contents'])) {
                observerSet['contents'] = {};
            }
            let observerSetContents = observerSet['contents'];
            delete observerSetContents[recorder.id];
            observerSet.contentsCounter--;
            if (observerSet.contentsCounter == 0 && isDefined(observerSet, 'parent')) {
                if (observerSet.next !== null) {
                    observerSet.next.previous = observerSet.previous;
                }
                if (observerSet.previous !== null) {
                    observerSet.previous.next = observerSet.next;
                }
                observerSet.previous = null;
                observerSet.next = null;
            }
        });
        recorder.sources.lenght = 0;  // From repeater itself.
    }


    /**********************************
     *
     *   Repetition
     *
     **********************************/

    function isRefreshingRepeater() {
        return activeRepeaters.length > 0;
    }


    function activeRepeater() {
        return lastOfArray(activeRepeaters);
    }


    // Debugging
    let dirtyRepeaters = [];

    // Repeater stack
    let activeRepeaters = [];

    function clearRepeaterLists() {
        recorderId = 0;
        dirtyRepeaters = [];
        activeRepeaters = [];
    }

    let repeaterId      = 0;

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

        let repeater = {
            id: repeaterId++,
            description: description,
            childRepeaters: [],
            removed: false,
            action: repeaterAction
        };

        // Attatch to parent repeater.
        if (activeRepeaters.length > 0) {
            let parentRepeater = lastOfArray(activeRepeaters);
            parentRepeater.childRepeaters.push(repeater);
        }

        // Activate!
        refreshRepeater(repeater);

        return repeater;
    }

    function refreshRepeater(repeater) {
        activeRepeaters.push(repeater);
        repeater.removed     = false;
        repeater.returnValue = uponChangeDo(
            repeater.action,
            function () {
                // unlockSideEffects(function() {
                if (!repeater.removed) {
                    repeaterDirty(repeater);
                }
                // });
            }
        );
        activeRepeaters.pop();
    }

    function repeaterDirty(repeater) { // TODO: Add update block on this stage?
        removeSubRepeaters(repeater);
        dirtyRepeaters.push(repeater);
        refreshAllDirtyRepeaters();
    }

    function removeSubRepeaters(repeater) {
        if (repeater.childRepeaters.length > 0) {
            repeater.childRepeaters.forEach(function (repeater) {
                removeRepeater(repeater);
            });
            repeater.childRepeaters = [];
        }
    }

    function removeFromArray(object, array) {
        // console.log(object);
        for (let i = 0; i < array.length; i++) {
            // console.log("Searching!");
            // console.log(array[i]);
            if (array[i] === object) {
                // console.log("found it!");
                array.splice(i, 1);
                break;
            }
        }
    }

    function removeRepeater(repeater) {
        // console.log("removeRepeater: " + repeater.id + "." + repeater.description);
        repeater.removed = true; // In order to block any lingering recorder that triggers change
        if (repeater.childRepeaters.length > 0) {
            repeater.childRepeaters.forEach(function (repeater) {
                removeRepeater(repeater);
            });
            repeater.childRepeaters.length = 0;
        }

        removeFromArray(repeater, dirtyRepeaters);
        removeFromArray(repeater, allRepeaters);
    }

    let refreshingAllDirtyRepeaters = false;

    function refreshAllDirtyRepeaters() {
        if (!refreshingAllDirtyRepeaters) {
            if (dirtyRepeaters.length > 0) {
                refreshingAllDirtyRepeaters = true;
                while (dirtyRepeaters.length > 0) {
                    let repeater = dirtyRepeaters.pop(); // TODO: should be shift?
                    refreshRepeater(repeater);
                }

                refreshingAllDirtyRepeaters = false;
            }
        }
    }


    function getGenericRepeatFunction(handler) {
        return function () {
            // Split arguments
            let argumentsList = argumentsToArray(arguments);
            let functionName = argumentsList.shift();
            let functionCacher = getFunctionCacher(this, "_repeaters", functionName, argumentsList);

            if (!functionCacher.cacheRecordExists()) {
                // Never encountered these arguments before, make a new cache
                let cacheRecord = functionCacher.createNewRecord();
                cacheRecord.repeaterHandle = repeatOnChange(function() {
                    returnValue = this[functionName].apply(this, argumentsList);
                });
                return cacheRecord.repeaterHandle;
            } else {
                return functionCacher.getExistingRecord().repeaterHandle;
            }
        };
    }


    /************************************************************************
     *
     *                    Cached method signatures
     *
     *          (reused by cache, repeat and project)
     ************************************************************************/

    function compareArraysShallow(a, b) {
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
                    if (typeof(functionCaches[argumentsHash]) === 'undefined') {
                        console.log("WTF!!!");
                        console.log(functionCaches);
                        console.log("End wtf");
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
     *  Cached methods
     *
     * A cached method will not reevaluate for the same arguments, unless
     * some of the data it has read for such a call has changed. If there
     * is a parent cached method, it will be notified upon change.
     * (even if the parent does not actually use/read any return value)
     ************************************************************************/

    let inCachedCall = 0;

    function getGenericCallAndCacheFunction(handler) { // this
        return function () {
            // Split arguments
            let argumentsList = argumentsToArray(arguments);
            let functionName = argumentsList.shift();
            let functionCacher = getFunctionCacher(this, "cachedCalls", functionName, argumentsList); // wierd, does not work with this inestead of handler...

            if (!functionCacher.cacheRecordExists()) {
                cachedCalls++;
                // Never encountered these arguments before, make a new cache
                let returnValue = uponChangeDo(
                    function () {
                        let returnValue;
                        // blockSideEffects(function() {
                        inCachedCall++;
                        returnValue = this[functionName].apply(this, argumentsList);
                        inCachedCall--;
                        // }.bind(this));
                        return returnValue;
                    }.bind(this),
                    function () {
                        // Delete function cache and notify
                        let cacheRecord = functionCacher.deleteExistingRecord();
                        notifyChangeObservers("functionCache.observers", cacheRecord.observers);
                    }.bind(this));
                let cacheRecord = functionCacher.createNewRecord();
                cacheRecord.returnValue = returnValue;
                cacheRecord.observers = {};
                registerAnyChangeObserver("functionCache.observers", cacheRecord.observers);
                return returnValue;
            } else {
                // Encountered these arguments before, reuse previous repeater
                let cacheRecord = functionCacher.getExistingRecord();
                registerAnyChangeObserver("functionCache.observers", cacheRecord.observers);
                return cacheRecord.returnValue;
            }
        };
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
     *  Infusion
     *
     ************************************************************************/

    function getGenericReplacer(handler) { // this
        return function(otherObject) {
            infuseCoArrays([otherObject], [this]);
        }
    }

    function infuseCoArrays(sources, targets) {

        // Setup id target map and ids.
        let index = 0;
        idTargetMap = {};
        while (index < sources.length) {
            sources[index].__infusionId = index;
            targets[index].__infusionId = index;
            idTargetMap[index] = targets[index];
            index++;
        }

        infuseWithMap(sources, idTargetMap);
    }

    function infuseWithMap(sources, idTargetMap) {

        // Helper
        function mapValue(value) {
            if (typeof(value) === 'object') {
                if (typeof(value.__infusionId) !== 'undefined') {
                    value = idTargetMap[value.__infusionId]; // Reference to the replaced one.
                }
            }
            return value;
        }

        // Setup id target map and ids.
        let index = 0;
        while (index < sources.length) {
            let source = sources[index];
            if (typeof(source.__infusionId) !== 'undefined' && typeof(idTargetMap[source.__infusionId]) !== 'undefined') {
                let target = idTargetMap[source.__infusionId];
                let sourceWithoutProxy = source.__target;
                if (sourceWithoutProxy instanceof Array) {
                    let splices = differentialSplices(target.__target, sourceWithoutProxy); // let arrayIndex = 0;
                    splices.forEach(function(splice) {
                        target.splice(splice.index, splice.removed.length, splice.added.map(mapValue));
                    });
                } else {
                    for (let property in sourceWithoutProxy) {
                        target[property]  = mapValue(sourceWithoutProxy[property]);
                    }
                }
            }
            index++;
        }
    }


    /************************************************************************
     *
     *  Projection (continous creation and infusion)
     *
     ************************************************************************/

    function getGenericProjectFunction(handler) { // this
        return function () {
            // Split argumentsp
            let argumentsList = argumentsToArray(arguments);
            let functionName = argumentsList.shift();
            let functionCacher = getFunctionCacher(this, "_projections", functionName, argumentsList);

            if (!functionCacher.cacheRecordExists()) {
                let cacheRecord = functionCacher.createNewRecord();
                cacheRecord.idObjectMap = {};

                // Never encountered these arguments before, make a new cache
                cacheRecord.repeaterHandler = repeatOnChange(
                    function () {
                        let newlyCrated;
                        let returnValue;
                        collect(newlyCrated, function() {
                            returnValue = this[functionName].apply(this, argumentsList);
                        });

                        // Infuse everything created during repetition.
                        infuseWithMap(newlyCreated, cacheRecord.idObjectMap);
                        newlyCreated.forEach(function(newObject) {
                            if (typeof(newObject.__infusionId) !== 'undefined') {
                                if (typeof(cacheRecord.idObjectMap[newObject.__infusionId]) === 'undefined') {
                                    cacheRecord.idObjectMap[newObject.__infusionId] = newObject;
                                }
                            }
                        });

                        // Replace return value with infused one (if object)
                        if (typeof(returnValue) === 'object' && typeof(this.__infusionId) !== 'undefined') {
                            if (typeof(cacheRecord.idObjectMap[this.__infusionId]) !== 'undefined') {
                                returnValue = cacheRecord.idObjectMap[this.__infusionId];
                            }
                        }

                        // See if we need to trigger event on return value
                        if (returnValue !== cacheRecord.returnValue) {
                            notifyChangeObservers("functionCache.returnValueObservers", getMap(cacheRecord, 'returnValueObservers'));
                            cacheRecord.returnValue = returnValue;
                        }
                    }
                );
                registerAnyChangeObserver("functionCache.returnValueObservers", getMap(cacheRecord, 'returnValueObservers'));
                return cacheRecord.returnValue;
            } else {
                // Encountered these arguments before, reuse previous repeater
                let cacheRecord = functionCacher.getExistingRecord();
                registerAnyChangeObserver("functionCache.returnValueObservers", getMap(cacheRecord, 'returnValueObservers'));
                return cacheRecord.returnValue;
            }
        };
    }

    /************************************************************************
     *
     *  Block side effects
     *
     ************************************************************************/

    // TODO

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
        target['create']                  = create;
        target['c']                       = c;
        target['uponChangeDo']            = uponChangeDo;
        target['repeatOnChange']          = repeatOnChange;
        target['withoutRecording']        = withoutRecording;
        target['transaction']        = transaction;
        target['clearRepeaterLists'] = clearRepeaterLists;
        target['setCumulativeAssignment'] = setCumulativeAssignment;
        target['cachedCallCount'] = cachedCallCount;
        target['infuseCoArrays'] = infuseCoArrays;
        return target;
    }

    return {
        install: install,
    };
}));
