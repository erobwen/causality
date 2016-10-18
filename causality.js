


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
        get: function (oTarget, sKey) {
            registerAnyChangeObserver(getSet(oTarget._propertyObservers, sKey));
            return oTarget[sKey]; //  || undefined;
        },
        set: function (oTarget, sKey, vValue) {
            oTarget[sKey] = vValue;
            notifyChangeObservers(getSet(oTarget._propertyObservers, sKey));
            return true;
        },
        deleteProperty: function (oTarget, sKey) {
            if (!(sKey in oTarget)) {
                return false;
            } else {
                delete oTarget[sKey];
                notifyChangeObservers(oTarget._enumerateObservers);
                return true;
            }
        },
        ownKeys: function (oTarget, sKey) {
            registerAnyChangeObserver(oTarget._enumerateObservers);
            return Object.keys(oTarget);
        },
        has: function (oTarget, sKey) {
            registerAnyChangeObserver(oTarget._enumerateObservers);
            return sKey in oTarget;
        },
        defineProperty: function (oTarget, sKey, oDesc) {
            notifyChangeObservers(oTarget._enumerateObservers);
            // if (oDesc && "value" in oDesc) { oTarget.setItem(sKey, oDesc.value); }
            return oTarget;
        },
        getOwnPropertyDescriptor: function (oTarget, sKey) {
            return undefined;
        }
    });
}



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




/**********************************
 *  Testing
 *
 **********************************/

console.log("");
console.log("Test uponChangeDo:");
console.log("Setup...");
var x = create({propA: 11});
var y = create({propB: 11, propC: 100});
var z;
uponChangeDo(function(){
    z = x.propA + y.propB;
}, function() {
    z = 'invalid';
});
console.log(z == 22);

console.log("Run tests...")
y.propC = 10;
console.log(z == 22);
y.propB = 2;
console.log(z == 'invalid');

console.log("");
console.log("Test repeatOnChange:");
console.log("Setup...");
y.propB = 11;
repeatOnChange(function(){
    z = x.propA + y.propB;
});
console.log(z == 22);

console.log("Run tests...")
y.propC = 100;
console.log(z == 22);

y.propB = 2;
console.log(z == 13);

x.propA = 2;
console.log(z == 4);
