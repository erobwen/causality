console.log({});


function create(object) {
    if (typeof(object) === 'undefined') {
        object = {};
    }

    object._propertyObservers = {};
    object._enumerateObservers = {}

    function getSet(observers, key) {
        if (typeof(observers[key]) === 'undefined') {
            observers[key] = {};
        }
        return observers[key];
    }


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
            registerAnyChangeObserver(getSet(target._propertyObservers, key));
            return target[key]; //  || undefined;
        },

        set: function (target, key, value) {
            target[key] = value;
            // console.log('Set key: ' + key);
            notifyChangeObservers(getSet(target._propertyObservers, key));
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
            keys.push('length');
            return keys;
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

var watch = create;
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
function pauseRecording(action) {
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
};

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
}

if (typeof(module) !== 'undefined') {
    module.exports.install = install
} else {
    install();
}