require('./causality').install();

function differentialSplices(previous, array) {
    // console.log('differentialSplices');
    // console.log(previous);
    // console.log(array);
    var done = false;
    var splices = [];

    var previousIndex = 0;
    var newIndex = 0;

    var addedRemovedLength = 0;

    var removed;
    var added;

    function add(sequence) {
        // console.log("adding");
        // console.log(previousIndex);
        // console.log(addedRemovedLength);
        let splice = {type:'added', sequence: added, index: previousIndex + addedRemovedLength};
        addedRemovedLength += added.length;
        console.log(splice);
        splices.push(splice);
    }

    function remove(sequence) {
        // console.log("removing");
        // console.log(previousIndex);
        // console.log(addedRemovedLength);
        let splice = {type:'removed', sequence: removed, index: previousIndex + addedRemovedLength};
        addedRemovedLength -= removed.length;
        console.log(splice);
        splices.push(splice);
    }
    
    while (!done) {
        // Stops beyond valid index!
        // console.log("Find next missmatch");
        // console.log(previousIndex);
        // console.log(newIndex);

        // Skip matching sequence
        while(
            previousIndex < previous.length
            && newIndex < array.length
            && previous[previousIndex] === array[newIndex]) {

            // console.log("skipping match");
            previousIndex++;
            newIndex++;
        }
        // Stops beyond valid index!
        // console.log("Starting odd matching");
        // console.log(previousIndex);
        // console.log(newIndex);


        if (previousIndex === previous.length && newIndex === array.length) {
            // console.log("same length");
            // Both arrays of equal length
            done = true;
        } else if (newIndex === array.length) {
            // console.log("new array finished");

            // New array is finished
            removed = [];
            let index = previousIndex;
            while(index < previous.length) {
                removed.push(previous[index++]);
            }
            remove(removed);
            done = true;
        } else if (previousIndex === previous.length) {
            // console.log("previous array finished");

            // Previous array is finished.
            added = [];
            while(newIndex < array.length) {
                added.push(array[newIndex++]);
            }
            add(added);
            done = true;
        } else {
            // Found mid-area of missmatch.
            // console.log("mismatch in mid-area");

            // Consider add
            added = [];
            var newIndexProbe = newIndex;
            do {
                added.push(array[newIndexProbe++]);
            } while (newIndexProbe < array.length && previous[previousIndex] !== array[newIndexProbe]);
            // console.log("consider add");
            // console.log(added);

            // Consider remove
            removed = [];
            var previousIndexProbe = previousIndex;
            do {
                removed.push(previous[previousIndexProbe++]);
            } while (previousIndexProbe < array.length && previous[newIndex] !== array[previousIndexProbe]);
            // console.log("consider remove");
            // console.log(removed);

            // Allways use the minimal modification until match, except when some list ran out, then take the other modification
            if (previousIndexProbe === previous.length) {
                add(added);
                newIndex = newIndexProbe;
            } else if (newIndexProbe === array.length) {
                remove(removed);
                previousIndex = previousIndexProbe;
            } else if (added.length < removed.length) { // Slight bias towards remove.
                add(added);
                newIndex = newIndexProbe
            } else {
                remove(removed);
                previousIndex = previousIndexProbe;
            }
        }
    }

    return splices;
}

function observeArraySlices(array, observerFunction) {
    // Setup previous
    var previous = [];
    array.forEach(function(element) {previous.push(element)});

    repeatOnChange(function() {
        array.forEach(function() {}); // Establish observation
        withoutRecording(function() {
            var splices = differentialSplices(previous, array);

            // Remember array for next time
            previous = [];
            array.forEach(function(element) {previous.push(element)});

            // Notify
            observerFunction(splices);
        });
    });
    
    return array;
}


// console.log(differentialSplices(['a', 'c'], ['a', 'b', 'c']));
console.log(differentialSplices(['a', 'b', 'c'], ['a', 'c']));

var observedArray = observeArraySlices(c(['a', 'b', 'c']), function(changes) {console.log("Changes: " + changes)});

observedArray[1] = 'z';