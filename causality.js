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
    // concat()	Joins two or more arrays, and returns a copy of the joined arrays
    // ()	Copies array elements within the array, to and from specified positions
    // every()	Checks if every element in an array pass a test
    // ()	Fill the elements in an array with a static value
    // filter()	Creates a new array with every element in an array that pass a test
    // find()	Returns the value of the first element in an array that pass a test
    // findIndex()	Returns the index of the first element in an array that pass a test
    // forEach()	Calls a function for each array element
    // indexOf()	Search the array for an element and returns its position
    // isArray()	Checks whether an object is an array
    // join()	Joins all elements of an array into a string
    // lastIndexOf()	Search the array for an element, starting at the end, and returns its position
    // map()	Creates a new array with the result of calling a function for each array element
    // ()	Removes the last element of an array, and returns that element
    // ()	Adds new elements to the end of an array, and returns the new length
    // reduce()	Reduce the values of an array to a single value (going left-to-right)
    // reduceRight()	Reduce the values of an array to a single value (going right-to-left)
    // ()	Reverses the order of the elements in an array
    // ()	Removes the first element of an array, and returns that element
    // slice()	Selects a part of an array, and returns the new array
    // some()	Checks if any of the elements in an array pass a test
    // ()	Sorts the elements of an array
    // ()	Adds/Removes elements from an array
    // toString()	Converts an array to a string, and returns the result
    // ()	Adds new elements to the beginning of an array, and returns the new length
    // valueOf()	Returns the primitive value of an array

    
    var mutableArrayFunctions = [
        'copyWithin', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice','unshift', 'fill'
    ];
    
    var staticArrayOverrides = {};


    mutableArrayFunctions.forEach(function(functionName) {
        staticArrayOverrides[functionName] = function() {
            var result;
            var argumentsArray = argumentsToArray(arguments);
            nullifyObserverNotification(function() {
                result = this.target[functionName].apply(this.target, argumentsArray);
            }.bind(this));
            notifyChangeObservers("_arrayObservers", getMap(this, "_arrayObservers"));
            return result;
        };
    });

    // Helper to quickly get a child object
    function getMap() {
        var argumentList = argumentsToArray(arguments);
        var object = argumentList.shift();
        while (argumentList.length > 0) {
            var key = argumentList.shift();
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

    var argumentsToArray = function(arguments) {
        return Array.prototype.slice.call(arguments);
    };

    // Cumulative assignment settings.
    var cumulativeAssignment = false;
    function setCumulativeAssignment(value) {
        cumulativeAssignment = value;
    }

    var nextId = 1;
    function create(target) {
        if (typeof(target) === 'undefined') {
            target = {};
        }

        var handler;
        if (target instanceof Array) {
            return new Proxy(target, {
                target: target,
                overrides: {
                    _id: nextId++,
                    cached: getGenericCallAndCacheFunction(target),
                    repeat: getGenericRepeatFunction(target),
                    // project: getGenericProjectFunction(target) //TODO
                    // Consider: generic upon change do?
                },
                
                // getPrototypeOf: function (target) {
                //     return Object.getPrototypeOf(target);
                // },
                // setPrototypeOf: function (target, prototype) {
                //     Object.setPrototypeOf(target, prototype);
                // },
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
                        registerAnyChangeObserver("_arrayObservers", getMap(this, "_arrayObservers"));//object
                        // console.log("get: " + key.toString() + "result: " + target[key]);
                        return target[key];
                    }
                },

                set: function (target, key, value) {
                    // If same value as already set, do nothing.
                    // if (key in target) {
                    //     var previousValue = target[key];
                    //     if (previousValue === value || ( typeof(previousValue) === 'number' && isNaN(previousValue) && typeof(value) === 'number' && isNaN(value))) {
                    //         return false;
                    //     }
                    // }

                    // If cumulative assignment, inside recorder and value is undefined, no assignment.
                    if (cumulativeAssignment && activeRecorders.length > 0 && (isNaN(value) || typeof(value) === 'undefined')) {
                        return false;
                    }

                    target[key] = value;
                    notifyChangeObservers("_arrayObservers", getMap(this, "_arrayObservers"));
                },

                deleteProperty: function (target, key) {
                    if (!(key in target)) {
                        return false;
                    } else {
                        delete target[key];
                        notifyChangeObservers("_arrayObservers", getMap(this, "_arrayObservers"));
                        return true;
                    }
                },

                ownKeys: function (target, key) {
                    registerAnyChangeObserver("_arrayObservers", getMap(this, "_arrayObservers"));
                    var result   = Object.keys(target);
                    if ((target instanceof Array)) {
                        result.push('length');
                    }
                    return result;
                },

                has: function (target, key) {
                    registerAnyChangeObserver("_arrayObservers", getMap(this, "_arrayObservers"));
                    return key in target;
                },

                defineProperty: function (target, key, oDesc) {
                    notifyChangeObservers("_arrayObservers", getMap(this, "_arrayObservers"));
                    return target;
                },

                getOwnPropertyDescriptor: function (target, key) {
                    registerAnyChangeObserver("_arrayObservers", getMap(this, "_arrayObservers"));
                    return Object.getOwnPropertyDescriptor(target, key);
                }
            });
        } else {
            return new Proxy(target, {
                id: nextId++,
                cached: getGenericCallAndCacheFunction(target),

                getPrototypeOf: function (target) {
                    return Object.getPrototypeOf(target);
                },

                setPrototypeOf: function (target, prototype) {
                    Object.setPrototypeOf(target, prototype);
                },

                isExtensible: function () {
                },

                preventExtensions: function () {
                },

                apply: function () {
                    // if (typeof(target) === 'Array') {
                    //
                    // }
                },

                construct: function () {
                },

                get: function (target, key) {
                    if (key === '_id') {
                        return this._id;
                    } else if (key === 'cached') {
                        return this.cached;
                    } else {
                        if (typeof(key) !== 'undefined') {
                            registerAnyChangeObserver("_propertyObservers." + key.toString(), getMap(this, "_propertyObservers", key.toString()));
                            return target[key]; //  || undefined;
                        }
                    }
                },

                set: function (target, key, value) {
                    // console.log(typeof(value));
                    // If same value as already set, do nothing.
                    if (key in target) {
                        var previousValue = target[key];
                        if (previousValue === value || ( typeof(previousValue) === 'number' && isNaN(previousValue) && typeof(value) === 'number' && isNaN(value))) {
                            // console.log(typeof(previousValue));
                            // console.log(isNaN(previousValue));
                            // console.log(typeof(value));
                            // console.log(isNaN(value));
                            return false;
                        }
                    }

                    // If cumulative assignment, inside recorder and value is undefined, no assignment.
                    if (cumulativeAssignment && activeRecorders.length > 0 && (isNaN(value) || typeof(value) === 'undefined')) {
                        return false;
                    }


                    // console.log('Set key: ' + key + " = " + value);
                    // console.log('Old value: ' + target[key]);
                    var undefinedKey = !(key in target);
                    target[key]      = value;
                    postponeObserverNotification(function() {
                        if (undefinedKey) {
                            notifyChangeObservers("_enumerateObservers", getMap(this, "_enumerateObservers"));
                        }
                        notifyChangeObservers("_propertyObservers." + key, getMap(this, "_propertyObservers", key));
                    }.bind(this));
                    return true;
                },

                deleteProperty: function (target, key) {
                    if (!(key in target)) {
                        return false;
                    } else {
                        delete target[key];
                        notifyChangeObservers("_enumerateObservers", getMap(this, "_enumerateObservers"));
                        return true;
                    }
                },

                ownKeys: function (target, key) { // Not inherited?
                    registerAnyChangeObserver("_enumerateObservers", getMap(this, "_enumerateObservers"));
                    return Object.keys(target);
                },

                has: function (target, key) {
                    registerAnyChangeObserver("_enumerateObservers", getMap(this, "_enumerateObservers"));
                    return key in target;
                },

                defineProperty: function (target, key, oDesc) {
                    notifyChangeObservers("_enumerateObservers", getMap(this, "_enumerateObservers"));
                    return target;
                },

                getOwnPropertyDescriptor: function (target, key) {
                    registerAnyChangeObserver("_enumerateObservers", getMap(this, "_enumerateObservers"));
                    return Object.getOwnPropertyDescriptor(target, key);
                }
            });
        }
    }


    var c = create;

    /**********************************
     *  Dependency recording
     *
     *  Upon change do
     **********************************/

        // Recorder stack
    var activeRecorders = [];

    var recorderId = 0;

    function uponChangeDo() { // description(optional), doFirst, doAfterChange. doAfterChange cannot modify model, if needed, use a repeater instead. (for guaranteed consistency)
        // Arguments
        var doFirst;
        var doAfterChange;
        var description = null;
        if (arguments.length > 2) {
            description   = arguments[0];
            doFirst       = arguments[1];
            doAfterChange = arguments[2];
        } else {
            doFirst       = arguments[0];
            doAfterChange = arguments[1];
        }

        // Recorder structure
        var recorder = {
            nextToNotify: null,
            id: recorderId++,
            description: description,
            sources: [],
            uponChangeAction: doAfterChange
        };

        // Start recording, do first action then stop recording.
        activeRecorders.push(recorder);
        var returnValue = doFirst();
        activeRecorders.pop();

        return returnValue;
    }


    var recordingPaused = 0;

    function withoutRecording(action) {
        recordingPaused++;
        action();
        recordingPaused--;
    }

    var sourcesObserverSetChunkSize = 5000;
    // var counter = 0;
    function registerAnyChangeObserver(description, observerSet) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
        // console.log("registerAnyChangeObserver: " + description);
        if (activeRecorders.length > 0 && recordingPaused === 0) {
            var activeRecorder = activeRecorders[activeRecorders.length - 1];
            var recorderId = activeRecorder.id;

            setIfNotDefined(observerSet, "contentsCounter", 0);
            if (typeof(getMap(observerSet, 'contents')[recorderId]) !== 'undefined') {
                return;
            }

            // console.log(observerSet);
            if (observerSet.contentsCounter === sourcesObserverSetChunkSize && typeof(observerSet.last) !== 'undefined') {
                // console.log("Going down!");
                observerSet = observerSet.last;
                if (typeof(getMap(observerSet, 'contents')[recorderId]) !== 'undefined') {
                    return;
                }
            }
            if (observerSet.contentsCounter === sourcesObserverSetChunkSize) {
                // console.log("New chunk");
                var newChunk = { next: null, previous: null, parent: null, contentsCounter: 0};
                if (isDefined(observerSet, 'parent')) {
                    // console.log("New sibling");
                    observerSet.next = newChunk;
                    newChunk.previous = observerSet;
                    newChunk.parent = observerSet.parent;
                    observerSet.parent.last = newChunk;
                } else {
                    // console.log("Create a child");
                    // console.log();
                    newChunk.parent = observerSet;
                    observerSet.first = newChunk;
                    observerSet.last = newChunk;
                }
                observerSet = newChunk;
            }


            // Add repeater on object beeing observed, if not already added before
            var observerSetContents = getMap(observerSet, 'contents');
            if (typeof(observerSetContents[recorderId]) === 'undefined') {
                // counter++;
                // console.log("  ---  really registerAnyChangeObserver: " + description);
                // if (counter > 10) {
                //     throwError("What the fuck!");
                // }
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

    var observersToNotifyChange = [];
    var nextObserverToNotifyChange = null;
    var lastObserverToNotifyChange = null;

    var observerNotificationPostponed = 0;
    var observerNotificationNullified = 0;

    function proceedWithPostponedNotifications() {
        if (observerNotificationPostponed == 0) {
            while (nextObserverToNotifyChange !== null) {
                var recorder = nextObserverToNotifyChange;
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

    var transaction = postponeObserverNotification;


// Recorders is a map from id => recorder
    function notifyChangeObservers(description, observers) {
        // transaction(function() {
        if (observerNotificationNullified > 0) {
            return;
        }
        // console.log("notifyChangeObservers:" + description);
        // console.log(observers);
        let contents = getMap(observers, 'contents');
        for (id in contents) {
            notifyChangeObserver(contents[id]);
        }

        if (typeof(observers.first) !== 'undefined') {
            var chainedObserverChunk = observers.first;
            while(chainedObserverChunk !== null) {
                let contents = getMap(chainedObserverChunk, 'contents');
                for (id in contents) {
                    notifyChangeObserver(contents[id]);
                }
                chainedObserverChunk = chainedObserverChunk.next;
            }
        }
        // });
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
                // observersToNotifyChange.push(observer);
            } else {
                // blockSideEffects(function() {
                observer.uponChangeAction();
                // });
            }
        }
    }


    function removeObservation(recorder) {
        // console.log("---removeFromObservation: " + recorder.id + "." + recorder.description);
        if (recorder.id == 1) {
            // debugger;
        }
        // Clear out previous observations
        // console.log("removeObservation");
        // console.log(recorder);
        recorder.sources.forEach(function (observerSet) { // From observed object
            // console.log("Removing a source");
            // console.log(observerSet[recorder.id]);
            var observerSetContents = getMap(observerSet, 'contents');
            delete observerSetContents[recorder.id];
            observerSet.contentsCounter--;
            // console.log(observerSet.contentsCounter);
            // console.log(observerSet);
            if (observerSet.contentsCounter == 0 && isDefined(observerSet, 'parent')) {
                // console.log("Terminating a chunk");
                if (observerSet.next !== null) {
                    observerSet.next.previous = observerSet.previous;
                }
                if (observerSet.previous !== null) {
                    observerSet.previous.next = observerSet.next;
                }
                observerSet.previous = null;
                observerSet.next = null;
            }
            // console.log("Finsied removing a source")
        });
        // console.log("---Removed all sources");
        recorder.sources.lenght = 0;  // From repeater itself.
        // console.groupEnd();
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
// var allRepeaters = [];

    var dirtyRepeaters = [];

// Repeater stack
    var activeRepeaters = [];
    var repeaterId      = 0;

    function repeatOnChange() { // description(optional), action
        // Arguments
        var repeaterAction;
        var description = '';
        if (arguments.length > 1) {
            description    = arguments[0];
            repeaterAction = arguments[1];
        } else {
            repeaterAction = arguments[0];
        }

        var repeater = {
            id: repeaterId++,
            description: description,
            childRepeaters: [],
            removed: false,
            action: repeaterAction
        };

        // Attatch to parent repeater.
        if (activeRepeaters.length > 0) {
            var parentRepeater = lastOfArray(activeRepeaters);
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
        // if (traceRepetition) {
        // 	console.log("Repeater dirty: " + repeater.id + "." + repeater.description);
        // }
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
        for (var i = 0; i < array.length; i++) {
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


    var refreshingAllDirtyRepeaters = false;

    function refreshAllDirtyRepeaters() {
        if (!refreshingAllDirtyRepeaters) {
            if (dirtyRepeaters.length > 0) {
                refreshingAllDirtyRepeaters = true;
                while (dirtyRepeaters.length > 0) {
                    var repeater = dirtyRepeaters.pop();
                    refreshRepeater(repeater);
                }

                refreshingAllDirtyRepeaters = false;
            }
        }
    }


    function getGenericRepeatFunction(object) { // this
        return function () {
            // Split arguments
            var argumentsList = argumentsToArray(arguments);
            var functionName = argumentsList.shift();
            var functionCacher = getFunctionCacher(this, "_repeaters", functionName, argumentsList);

            if (!functionCacher.cacheRecordExists()) {
                // Never encountered these arguments before, make a new cache
                var cacheRecord = functionCacher.createNewRecord();
                cacheRecord.repeaterHandle = repeatOnChange(function() {
                    returnValue = object[functionName].apply(this, argumentsList);
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
     ************************************************************************/

    function argumentsToArray(arguments) {
        return Array.prototype.slice.call(arguments);
    }

    function compareArraysShallow(a, b) {
        if (a.length === b.length) {
            for (var i = 0; i < a.length; i++) {
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
            for (var i = 0; i < functionArgumentHashCaches.length; i++) {
                if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                    return true;
                }
            }
            return false;
        }
    }

    var cachedCalls = 0;

    function cachedCallCount() {
        return cachedCalls;
    }


    // Get cache(s) for this argument hash
    function getFunctionCacher(object, cacheStoreName, functionName, functionArguments) {
        var uniqueHash = true;

        function makeArgumentHash(argumentList) {
            var hash  = "";
            var first = true;
            argumentList.forEach(function (argument) {
                if (!first) {
                    hash += ",";
                }

                if (typeof(argument._id) !== 'undefined') { //typeof(argument) === 'object' &&
                    hash += "{id=" + argument._id + "}";
                } else if (typeof(argument) === 'number' || typeof(argument) === 'string') { // String or integer
                    hash += argument;
                } else {
                    uniqueHash = false;
                    hash += "{}"; // Non-identifiable, we have to rely on the hash-bucket.
                }
            });
            return "(" + hash + ")";
        }

        var argumentsHash = makeArgumentHash(functionArguments);
        var functionCaches = getMap(object, cacheStoreName, functionName);
        var functionCache = null;

        // console.log(argumentsHash);
        // console.log(sharedHash);
        return {
            cacheRecordExists : function() {
                // Figure out if we have a chache or not
                var result = null;
                if (uniqueHash) {
                    result = typeof(functionCaches[argumentsHash]) !== 'undefined';
                } else {
                    var functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    result = isCachedInBucket(functionArgumentHashCaches, functionArguments);
                }
                return result;
            },

            deleteExistingRecord : function() {
                if (uniqueHash) {
                    var result = functionCaches[argumentsHash];
                    delete functionCaches[argumentsHash];
                    return result;
                } else {
                    var functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    for (var i = 0; i < functionArgumentHashCaches.length; i++) {
                        if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                            var result = functionArgumentHashCaches[i];
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
                    var functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets" , argumentsHash);
                    for (var i = 0; i < functionArgumentHashCaches.length; i++) {
                        if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                            return functionArgumentHashCaches[i];
                        }
                    }
                }
            },

            createNewRecord : function() {
                if (uniqueHash) {
                    return getMap(functionCaches, argumentsHash)
                } else {
                    var functionArgumentHashCaches = getArray(functionCaches, "_nonpersistent_cacheBuckets", argumentsHash);
                    var record = {};
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

    function getGenericCallAndCacheFunction(object) { // this
        return function () {
            // Split arguments
            var argumentsList = argumentsToArray(arguments);
            var functionName = argumentsList.shift();
            var functionCacher = getFunctionCacher(this, "_cachedCalls", functionName, argumentsList);

            if (!functionCacher.cacheRecordExists()) {
                cachedCalls++;

                // Never encountered these arguments before, make a new cache
                var returnValue = uponChangeDo(
                    function () {
                        var returnValue;
                        // blockSideEffects(function() {
                        returnValue = object[functionName].apply(this, argumentsList);
                        // }.bind(this));
                        return returnValue;
                    }.bind(this),
                    function () {
                        // Delete function cache and notify
                        var cacheRecord = functionCacher.deleteExistingRecord();
                        notifyChangeObservers("functionCache.observers", getMap(cacheRecord, 'observers'));
                    }.bind(this));
                var cacheRecord = functionCacher.createNewRecord();
                cacheRecord.returnValue = returnValue;
                registerAnyChangeObserver("functionCache.observers", getMap(cacheRecord, 'observers'));
                return returnValue;
            } else {
                // Encountered these arguments before, reuse previous repeater
                var cacheRecord = functionCacher.getExistingRecord();
                registerAnyChangeObserver("functionCache.observers", getMap(cacheRecord, 'observers'));
                return cacheRecord.returnValue;
            }
        };
    }


    /**
     *  Module installation
     * @param target
     */
    function install(target) {
        if (typeof(target) === 'undefined') {
            target = (typeof(global) !== 'undefined') ? global : window;
        }
        target['repeatOnChange']          = repeatOnChange;
        target['uponChangeDo']            = uponChangeDo;
        target['create']                  = create;
        target['c']                       = c;
        target['cachedCallCount']         = cachedCallCount;
        target['withoutRecording']        = withoutRecording;
        target['transaction']        = transaction;
        target['setCumulativeAssignment'] = setCumulativeAssignment;
        return target;
    }

    return {
        install: install,
    };

}));
