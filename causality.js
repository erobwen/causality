


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
            return oTarget[sKey] || oTarget.getItem(sKey) || undefined;
        },
        set: function (oTarget, sKey, vValue) {
            notifyChangeObservers(getSet(oTarget._propertyObservers, sKey));
            if (sKey in oTarget) { return false; }
            return oTarget.setItem(sKey, vValue);
        },
        deleteProperty: function (oTarget, sKey) {
            notifyChangeObservers(oTarget._enumerateObservers);
            if (sKey in oTarget) { return false; }
            return oTarget.removeItem(sKey);
        },
        enumerate: function (oTarget, sKey) {
            registerAnyChangeObserver(oTarget._enumerateObservers);
            return oTarget.keys();
        },
        ownKeys: function (oTarget, sKey) {
            registerAnyChangeObserver(oTarget._enumerateObservers);
            return oTarget.keys();
        },
        has: function (oTarget, sKey) {
            registerAnyChangeObserver(oTarget._enumerateObservers);
            return sKey in oTarget || oTarget.hasItem(sKey);
        },
        defineProperty: function (oTarget, sKey, oDesc) {
            notifyChangeObservers(oTarget._enumerateObservers);
            if (oDesc && "value" in oDesc) { oTarget.setItem(sKey, oDesc.value); }
            return oTarget;
        },
        getOwnPropertyDescriptor: function (oTarget, sKey) {
            registerAnyChangeObserver(getSet(oTarget._propertyObservers, sKey));
            var vValue = oTarget.getItem(sKey);
            return vValue ? {
                value: vValue,
                writable: true,
                enumerable: true,
                configurable: false
            } : undefined;
        },
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
 *  Testing
 *
 **********************************/

var x = create({propA: 11});
var y = create({propB: 11, propC: 100});
var z;
uponChangeDo(function(){
    z = x.propA + y.propB;
}, function() {
    z = 'invalid';
});

y.propC = 10;
console.log(z == 22);
y.propB = 2;
console.log(z == 'invalid');

