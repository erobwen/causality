// Using UMD pattern: https://github.com/umdjs/umd
(function(root, factory){
	if (typeof define === 'function' && define.amd) {
		define([], factory); // Support AMD
	}	else if (typeof module === 'object' && module.exports) {
		module.exports = factory(); // Support NodeJS
	}	else {
		root.causality = factory(); // Support browser global
	}
}(this, function() {



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
        object[key] = {};
    }
    return object[key];
}

function startsWith(prefix, string) {
    // trace('security', string);
    // trace('security', prefix.length);
    // trace('security', string.substr(0, prefix.length));
    return (prefix === string.substr(0, prefix.length));
};


var nextId = 1;
function create(object) {
    if (typeof(object) === 'undefined') {
        object = {};
    }

    object._id = nextId++;
    object._propertyObservers = {};
    object._enumerateObservers = {};

    addGenericFunctionCacher(object);

    return new Proxy(object, {
        getPrototypeOf : function(target) {
            return Object.getPrototypeOf(target);
        },

        setPrototypeOf : function(target, prototype) {
            Object.setPrototypeOf(target, prototype);
        },

        isExtensible : function() {},

        preventExtensions : function() {},

        apply : function() {
            // if (typeof(target) === 'Array') {
            //
            // }
        },

        construct : function() {},

        get: function (target, key) {
            registerAnyChangeObserver(getMap(target._propertyObservers, key));
            return target[key]; //  || undefined;
        },

        set: function (target, key, value) {
            if (typeof(target[key]) === 'undefined') {
                notifyChangeObservers(target._enumerateObservers);
            }
            target[key] = value;
            // console.log('Set key: ' + key);
            notifyChangeObservers(getMap(target._propertyObservers, key));
            return true;
        },

        deleteProperty: function (target, key) {
            if (!(key in target)) {
                return false;
            } else {
                delete target[key];
                notifyChangeObservers(target._enumerateObservers);
                return true;
            }
        },

        ownKeys: function (target, key) { // Not inherited?
            registerAnyChangeObserver(target._enumerateObservers);
            var keys = Object.keys(target);
            let result = [];
            keys.forEach(function(key) {
                if (!startsWith('_', key)) {
                    result.push(key);
                }
            });
            result.push('length');
            return result;
        },

        has: function (target, key) {
            // TODO: Check against key starts with "_¤"
            registerAnyChangeObserver(target._enumerateObservers);
            return key in target;
        },

        defineProperty: function (target, key, oDesc) {
            notifyChangeObservers(target._enumerateObservers);
            // if (oDesc && "value" in oDesc) { target.setItem(key, oDesc.value); }
            return target;
        },

        getOwnPropertyDescriptor: function (target, key) {
            registerAnyChangeObserver(target._enumerateObservers);
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
        description = arguments[0];
        doFirst = arguments[1];
        doAfterChange = arguments[2];
    } else {
        doFirst = arguments[0];
        doAfterChange = arguments[1];
    }

    // Recorder structure
    var recorder = {
        id : recorderId++,
        description : description,
        sources : [],
        uponChangeAction : doAfterChange
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


function registerAnyChangeObserver(observerSet) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
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


// Recorders is a map from id => recorder
function notifyChangeObservers(observers) {
    for (id in observers) {
        notifyChangeObserver(observers[id]);
    }
}


function notifyChangeObserver(observer) {
    removeObservation(observer); // Cannot be any more dirty than it already is!
    if (observationBlocked > 0) {
        observersToNotifyChange.push(observer);
    } else {
        // blockSideEffects(function() {
        observer.uponChangeAction();
        // });
    }
}


function removeObservation(recorder) {
    // console.group("removeFromObservation: " + recorder.id + "." + recorder.description);
    if (recorder.id == 1)  {
        // debugger;
    }
    // Clear out previous observations
    recorder.sources.forEach(function(observerSet) { // From observed object
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
var repeaterId = 0;
function repeatOnChange() { // description(optional), action
    // Arguments
    var repeaterAction;
    var description = '';
    if (arguments.length > 1) {
        description = arguments[0];
        repeaterAction = arguments[1];
    } else {
        repeaterAction = arguments[0];
    }

    var repeater = {
        id : repeaterId++,
        description : description,
        childRepeaters: [],
        removed : false,
        action : repeaterAction
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
    repeater.removed = false;
    repeater.returnValue = uponChangeDo(
        repeater.action,
        function() {
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
        repeater.childRepeaters.forEach(function(repeater) {
            removeRepeater(repeater);
        });
        repeater.childRepeaters = [];
    }
}

function removeFromArray(object, array) {
    // console.log(object);
    for(var i = 0; i < array.length; i++) {
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
        repeater.childRepeaters.forEach(function(repeater) {
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
            while(dirtyRepeaters.length > 0) {
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
    var hash =  "";
    var first = true;
    argumentList.forEach(function(argument) {
        if (!first) { hash += ","; }

        if (typeof(argument._id) !== 'undefined') { //typeof(argument) === 'object' &&
            hash += "{id=" + argument._id + "}";
        } else  if  (typeof(argument) === 'number' || typeof(argument) === 'string') { // String or integer
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
    object['cached'] = function() {
        // Split arguments
        var functionNameAndArgumentsArray = argumentsToArray(arguments);
        var functionName = functionNameAndArgumentsArray.shift();
        // console.log("Making cached call: " + functionName);
        var functionArguments = functionNameAndArgumentsArray;

        // Get cache(s) for this argument hash
        var functionCaches = getMap(getMap(object, "_cachedCalls"), functionName);
        var argumentsHash = makeMarkedArgumentHash(functionArguments);
        var sharedHash = startsWith("¤", argumentsHash);
        // console.log(argumentsHash);
        // console.log(sharedHash);

        // Figure out if we have a chache or not
        var isCached = null;
        if (!sharedHash) {
            isCached = typeof(functionCaches[argumentsHash]) !== 'undefined';
        } else {
            var functionArgumentHashCaches = getArray(functionCaches, argumentsHash);
            isCached = isCachedInBucket(functionArgumentHashCaches, functionArguments) ;
        }

        if (!isCached) {
            cachedCalls++;
            
            // console.log("Cached function not seen before, or re-caching needed... ");
            var functionCache = {
                observers : {},
                returnValue : returnValue
            };
            if (!sharedHash) {
                functionCaches[argumentsHash] = functionCache;
            } else {
                functionCache.functionArguments = functionArguments;
                functionArgumentHashCaches.push(functionCache);
            }

            // Never encountered these arguments before, make a new cache
            var returnValue = uponChangeDo(
                function() {
                    var returnValue;
                    // blockSideEffects(function() {
                    returnValue = this[functionName].apply(this, functionArguments);
                    // }.bind(this));
                    return returnValue;
                }.bind(this),
                function() {
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
                    notifyChangeObservers(functionCache.observers);
                }.bind(this));
            functionCache.returnValue = returnValue;
            registerAnyChangeObserver(functionCache.observers);
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
            registerAnyChangeObserver(functionCache.observers);
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
    target['repeatOnChange'] = repeatOnChange;
    target['uponChangeDo'] = uponChangeDo;
    target['create'] = create; 
    target['c'] = c;
    target['cachedCallCount'] = cachedCallCount;
    target['withoutRecording'] = withoutRecording;
	  return target;
}

	return {
		install: install,
	};

}));
