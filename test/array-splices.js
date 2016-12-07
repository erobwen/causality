const assert = require('assert');
require('../causality').install();
// const log = console.log.bind(console);

// Tests based on mobx test/array.js

//
// function differentialSplices(previous, array) {
//   // console.log('differentialSplices');
//   // console.log(previous);
//   // console.log(array);
//   var done = false;
//   var splices = [];
//
//   var previousIndex = 0;
//   var newIndex = 0;
//
//   var addedRemovedLength = 0;
//
//   var removed;
//   var added;
//
//   function add(sequence) {
//     // console.log("adding");
//     // console.log(previousIndex);
//     // console.log(addedRemovedLength);
//     let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: 0, added: added};
//     addedRemovedLength += added.length;
//     // console.log(splice);
//     splices.push(splice);
//   }
//
//   function remove(sequence) {
//     // console.log("removing");
//     // console.log(previousIndex);
//     // console.log(addedRemovedLength);
//     let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: removed.length, added: [] };
//     addedRemovedLength -= removed.length;
//     // console.log(splice);
//     splices.push(splice);
//   }
//
//   function removeAdd(removedCount, added) {
//     // console.log("removing");
//     // console.log(previousIndex);
//     // console.log(addedRemovedLength);
//     let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: removedCount, added: added};
//     addedRemovedLength -= removedCount;
//     addedRemovedLength += added.length;
//     // console.log(splice);
//     splices.push(splice);
//   }
//
//   while (!done) {
//     // Stops beyond valid index!
//     // console.log("Find next missmatch");
//     // console.log(previousIndex);
//     // console.log(newIndex);
//
//     // Skip matching sequence
//     while(
//       previousIndex < previous.length
//         && newIndex < array.length
//         && previous[previousIndex] === array[newIndex]) {
//
//       // console.log("skipping match");
//       previousIndex++;
//       newIndex++;
//     }
//     // Stops beyond valid index!
//     // console.log("Starting odd matching");
//     // console.log(previousIndex);
//     // console.log(newIndex);
//
//
//     if (previousIndex === previous.length && newIndex === array.length) {
//       // console.log("same length");
//       // Both arrays of equal length
//       done = true;
//     } else if (newIndex === array.length) {
//       // console.log("new array finished");
//
//       // New array is finished
//       removed = [];
//       let index = previousIndex;
//       while(index < previous.length) {
//         removed.push(previous[index++]);
//       }
//       remove(removed);
//       done = true;
//     } else if (previousIndex === previous.length) {
//       // console.log("previous array finished");
//
//       // Previous array is finished.
//       added = [];
//       while(newIndex < array.length) {
//         added.push(array[newIndex++]);
//       }
//       add(added);
//       done = true;
//     } else {
//       // Found mid-area of missmatch.
//       let previousScanIndex = previousIndex;
//       let newScanIndex = newIndex;
//       let foundMatchAgain = false;
//
//       while(previousScanIndex < previous.length && !foundMatchAgain) {
//         newScanIndex = newIndex;
//         while(newScanIndex < array.length && !foundMatchAgain) {
//           if (previous[previousScanIndex] === array[newScanIndex]) {
//             // console.log("found match again")
//             // console.log([previousScanIndex, newScanIndex]);
//             foundMatchAgain = true;
//           }
//           if (!foundMatchAgain) newScanIndex++;
//         }
//         if (!foundMatchAgain) previousScanIndex++;
//       }
//       // console.log("Found a gap");
//       // console.log([previousIndex, newIndex]);
//       // console.log([previousScanIndex, newScanIndex]);
//       removeAdd(previousScanIndex - previousIndex, array.slice(newIndex, newScanIndex));
//       previousIndex = previousScanIndex;
//       newIndex = newScanIndex;
//     }
//   }
//
//   return splices;
// }
//
// function observeArraySlices(array, observerFunction) {
//   // Setup previous
//   var previous = c([]);
//   array.forEach(function(element) {previous.push(element)});
//
//   repeatOnChange(function() {
//     array.forEach(function() {}); // Establish observation
//     withoutRecording(function() {
//       var splices = differentialSplices(previous, array);
//       if (splices.length > 0) {
//         // Remember array for next time
//         previous = c([]);
//         array.forEach(function(element) {previous.push(element)});
//
//         // Notify
//         observerFunction(splices);
//       }
//     });
//   });
//
//   return array;
// }


describe("observe arrays", function(){
	it('should report changes', function(){
		resetObjectIds();

		var result;
		var observedArray = c(['a', 'b', 'c']);
        observedArray.observe(
			function(event) {
				result = event;
			}
        );

		observedArray[1] = 'z';
		assert.deepEqual( result, { type: 'splice', index: 1, removed: ['b'], added: [ 'z' ], objectId: 1} );

		observedArray.push('last');
		assert.deepEqual( result, { type: 'splice', index: 3, removed: [], added: [ 'last' ], objectId: 1} );

	})
});


