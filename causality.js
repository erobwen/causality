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
    var mutableArrayFunctions = [
        'copyWithin', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice','unshift', 'fill'
    ];

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


    // Helper to quickly get a child object
    function getMap(object, key) {
        if (typeof(object[key]) === 'undefined') {
            object[key] = {};
        }
        return object[key];
    }

    // Helper to quickly get a child array
    function getArray(object, key) {
        if (typeof(object[key]) === 'undefined') {
            object[key] = [];
        }
        return object[key];
    }

    function startsWith(prefix, string) {
        // trace('security', string);
        // trace('security', prefix.length);
        // trace('security', string.substr(0, prefix.length));
        return (prefix === string.substr(0, prefix.length));
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
    function create(object) {
        if (typeof(object) === 'undefined') {
            object = {};
        }

        object._id                 = nextId++;
        object._propertyObservers  = {};
        object._enumerateObservers = {};
        object._arrayObservers = {};

        addGenericFunctionCacher(object);

        return new Proxy(object, {
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
                if (target instanceof Array) {
                    if (typeof(key) === 'number') {
                        // Number
                        registerAnyChangeObserver("_arrayObservers", target._arrayObservers);
                        return target[key];
                    } else {
                        // String
                        if (mutableArrayFunctions.indexOf(key) !== -1) {
                            return function() {
                                var argumentsArray = argumentsToArray(arguments);
                                blockUponChangeActions(function() {
                                    // console.log("Pushing");
                                    // console.log(argumentsArray);
                                    var result = target[key].apply(target, argumentsArray);
                                    // console.log(target);
                                    // console.log("notify");
                                    notifyChangeObservers("_arrayObservers", target._arrayObservers);
                                    return result;
                                });
                            }
                        }
                        registerAnyChangeObserver("_arrayObservers", target._arrayObservers);
                        return target[key];
                    }
                } else {
                    if (typeof(key) !== 'undefined') {
                        registerAnyChangeObserver("_propertyObservers." + key.toString(), getMap(target._propertyObservers, key.toString()));
                        return target[key]; //  || undefined;
                    }
                }
            },

            set: function (target, key, value) {
                // console.log(typeof(value));
                // If same value as already set, do nothing.
                var previousValue = target[key];
                if (previousValue === value || ( typeof(previousValue) === 'number' && isNaN(previousValue) && typeof(value) === 'number' && isNaN(value))) {
                    // console.log(typeof(previousValue));
                    // console.log(isNaN(previousValue));
                    // console.log(typeof(value));
                    // console.log(isNaN(value));
                    return false;
                }

                // If cumulative assignment, inside recorder and value is undefined, no assignment.
                if (cumulativeAssignment && activeRecorders.length > 0 && (isNaN(value) || typeof(value) === 'undefined')) {
                    return false;
                }

                if ((target instanceof Array)) {
                    target[key] = value;
                    notifyChangeObservers("_arrayObservers", target._arrayObservers);
                } else {
                       // console.log('Set key: ' + key + " = " + value);
                    // console.log('Old value: ' + target[key]);
                    var undefinedKey = typeof(target[key]) === 'undefined';
                    target[key]      = value;
                    blockUponChangeActions(function() {
                        if (undefinedKey) {
                            notifyChangeObservers("_enumerateObservers", target._enumerateObservers);
                        }
                        notifyChangeObservers("_propertyObservers." + key, getMap(target._propertyObservers, key));
                    });
                    return true;
                }
            },

            deleteProperty: function (target, key) {
                if (!(key in target)) {
                    return false;
                } else {
                    delete target[key];
                    notifyChangeObservers("_enumerateObservers", target._enumerateObservers);
                    return true;
                }
            },

            ownKeys: function (target, key) { // Not inherited?
                registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
                var keys   = Object.keys(target);
                let result = [];
                keys.forEach(function (key) {
                    if (!startsWith('_', key)) {
                        result.push(key);
                    }
                });
                result.push('length');
                return result;
            },

            has: function (target, key) {
                // TODO: Check against key starts with "_¤"
                registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
                return key in target;
            },

            defineProperty: function (target, key, oDesc) {
                notifyChangeObservers("_enumerateObservers", target._enumerateObservers);
                // if (oDesc && "value" in oDesc) { target.setItem(key, oDesc.value); }
                return target;
            },

            getOwnPropertyDescriptor: function (target, key) {
                registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
                return Object.getOwnPropertyDescriptor(target, key);
            }
        });
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


    function registerAnyChangeObserver(description, observerSet) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
        // console.log("registerAnyChangeObserver: " + description);
        if (activeRecorders.length > 0 && recordingPaused === 0) {
            var activeRecorder = activeRecorders[activeRecorders.length - 1];

            // Add repeater on object beeing observed, if not already added before
            var recorderId = activeRecorder.id;
            if (typeof(observerSet[recorderId]) === 'undefined') {
                observerSet[recorderId] = activeRecorder;

                // Note dependency in repeater itself (for cleaning up)
                activeRecorder.sources.push(observerSet);
            }
        }
    }


    /** -------------
     *  Upon change
     * -------------- */

    var observersToNotifyChange = [];

    var observationBlocked = 0;

    function blockUponChangeActions(callback) {
        observationBlocked++;
        callback();
        observationBlocked--;
        if (observationBlocked == 0) {
            while (observersToNotifyChange.length > 0) {
                var recorder = observersToNotifyChange.shift()
                // blockSideEffects(function() {
                recorder.uponChangeAction();
                // });
            }
        }
    }

    var transaction = blockUponChangeActions;


// Recorders is a map from id => recorder
    function notifyChangeObservers(description, observers) {
        // console.log("notifyChangeObservers:" + description);
        for (id in observers) {
            notifyChangeObserver(observers[id]);
        }
    }


    function notifyChangeObserver(observer) {
        if (observer != activeRecorders[activeRecorders.length - 1]) {
            removeObservation(observer); // Cannot be any more dirty than it already is!
            if (observationBlocked > 0) {
                observersToNotifyChange.push(observer);
            } else {
                // blockSideEffects(function() {
                observer.uponChangeAction();
                // });
            }
        }
    }


    function removeObservation(recorder) {
        // console.group("removeFromObservation: " + recorder.id + "." + recorder.description);
        if (recorder.id == 1) {
            // debugger;
        }
        // Clear out previous observations
        recorder.sources.forEach(function (observerSet) { // From observed object
            // console.log("Removing a source");
            // console.log(observerSet[recorder.id]);
            delete observerSet[recorder.id];
        });
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
                    var repeater = dirtyRepeaters.shift();
                    refreshRepeater(repeater);
                }

                refreshingAllDirtyRepeaters = false;
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

    function argumentsToArray(arguments) {
        return Array.prototype.slice.call(arguments);
    }

    function startsWith(prefix, string) {
        return (prefix === string.substr(0, prefix.length));
    }

    function makeMarkedArgumentHash(argumentList) {
        var argumentHash = makeArgumentHash(argumentList);
        if (argumentHash.indexOf("¤") !== -1) {
            argumentHash = "¤" + argumentHash; // Put it up front!
        }
        return argumentHash;
    }

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
                hash += "¤"; // Unrecognizeable, we have to rely on the hash-bucket.
            }
        });
        return "(" + hash + ")";
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
            return fasle;
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

    function addGenericFunctionCacher(object) {
        object['cached'] = function () {
            // Split arguments
            var functionNameAndArgumentsArray = argumentsToArray(arguments);
            var functionName                  = functionNameAndArgumentsArray.shift();
            // console.log("Making cached call: " + functionName);
            var functionArguments             = functionNameAndArgumentsArray;

            // Get cache(s) for this argument hash
            var functionCaches = getMap(getMap(object, "_cachedCalls"), functionName);
            var argumentsHash  = makeMarkedArgumentHash(functionArguments);
            var sharedHash     = startsWith("¤", argumentsHash);
            // console.log(argumentsHash);
            // console.log(sharedHash);

            // Figure out if we have a chache or not
            var isCached = null;
            if (!sharedHash) {
                isCached = typeof(functionCaches[argumentsHash]) !== 'undefined';
            } else {
                var functionArgumentHashCaches = getArray(functionCaches, argumentsHash);
                isCached                       = isCachedInBucket(functionArgumentHashCaches, functionArguments);
            }

            if (!isCached) {
                cachedCalls++;

                // console.log("Cached function not seen before, or re-caching needed... ");
                var functionCache = {
                    observers: {},
                    returnValue: returnValue
                };
                if (!sharedHash) {
                    functionCaches[argumentsHash] = functionCache;
                } else {
                    functionCache.functionArguments = functionArguments;
                    functionArgumentHashCaches.push(functionCache);
                }

                // Never encountered these arguments before, make a new cache
                var returnValue           = uponChangeDo(
                    function () {
                        var returnValue;
                        // blockSideEffects(function() {
                        returnValue = this[functionName].apply(this, functionArguments);
                        // }.bind(this));
                        return returnValue;
                    }.bind(this),
                    function () {
                        // Get and delete function cache
                        if (!sharedHash) {
                            var functionCache = functionCaches[argumentsHash];
                            delete functionCaches[argumentsHash];
                        } else {
                            for (var i = 0; i < functionArgumentHashCaches.length; i++) {
                                if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                                    functionArgumentHashCaches.splice(i, 1);
                                    break;
                                }
                            }
                        }

                        // Recorders dirty
                        notifyChangeObservers("functionCache.observers", functionCache.observers);
                    }.bind(this));
                functionCache.returnValue = returnValue;
                registerAnyChangeObserver("functionCache.observers", functionCache.observers);
                return returnValue;
            } else {
                // Encountered these arguments before, reuse previous repeater
                if (!sharedHash) {
                    functionCache = functionCaches[argumentsHash];
                } else {
                    for (var i = 0; i < functionArgumentHashCaches.length; i++) {
                        if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
                            functionCache = functionArgumentHashCaches[i];
                            break;
                        }
                    }
                }
                registerAnyChangeObserver("functionCache.observers", functionCache.observers);
                return functionCache.returnValue;
            }
        }
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
