import mobx from "mobx"; 
import { getWorld } from "../causality.js";
const { observable } = getWorld()

const log = console.log.bind(console);


log("Performance for observation of array splices");
var amount = 1000;
//var amount = 40;



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
    let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: 0, added: added};
    addedRemovedLength += added.length;
    // console.log(splice);
    splices.push(splice);
  }

  function remove(sequence) {
    // console.log("removing");
    // console.log(previousIndex);
    // console.log(addedRemovedLength);
    let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: removed.length, added: [] };
    addedRemovedLength -= removed.length;
    // console.log(splice);
    splices.push(splice);
  }

  function removeAdd(removedCount, added) {
    // console.log("removing");
    // console.log(previousIndex);
    // console.log(addedRemovedLength);
    let splice = {type:'splice', index: previousIndex + addedRemovedLength, removedCount: removedCount, added: added};
    addedRemovedLength -= removedCount;
    addedRemovedLength += added.length;
    // console.log(splice);
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
      let previousScanIndex = previousIndex;
      let newScanIndex = newIndex;
      let foundMatchAgain = false;

      while(previousScanIndex < previous.length && !foundMatchAgain) {
        newScanIndex = newIndex;
        while(newScanIndex < array.length && !foundMatchAgain) {
          if (previous[previousScanIndex] === array[newScanIndex]) {
            // console.log("found match again")
            // console.log([previousScanIndex, newScanIndex]);
            foundMatchAgain = true;
          }
          if (!foundMatchAgain) newScanIndex++;
        }
        if (!foundMatchAgain) previousScanIndex++;
      }
      // console.log("Found a gap");
      // console.log([previousIndex, newIndex]);
      // console.log([previousScanIndex, newScanIndex]);
      removeAdd(previousScanIndex - previousIndex, array.slice(newIndex, newScanIndex));
      previousIndex = previousScanIndex;
      newIndex = newScanIndex;
    }
  }

  return splices;
}

function observeArraySlices(array, observerFunction) {
  // Setup previous
  var previous = o([]);
  array.forEach(function(element) {previous.push(element)});

  repeatOnChange(function() {
    array.forEach(function() {}); // Establish observation
    withoutRecording(function() {
      var splices = differentialSplices(previous, array);
      if (splices.length > 0) {
        // Remember array for next time
        previous = o([]);
        array.forEach(function(element) {previous.push(element)});

        // Notify
        observerFunction(splices);
      }
    });
  });
  
  return array;
}

////////////////////////////////////////////

var count = 0;

var target = [];
target.onChange = () => {
  count++;
};
var mylist = observable(target);

console.time("causality");
while( mylist.length < amount ){
  let obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: observable(['causality', 'muffins']),
	};
  let xobj = observable(obj);
	mylist.push(xobj);
}
for( let i in mylist ){
	if(!( i % 11 )){
		mylist.splice(i, 1);
		//log( i );
	}
}
while( mylist.length ){
	mylist.shift();
}
console.timeEnd("causality");
log( count );


////////////////////////////////////////////

count = 0;

var mylist = mobx.observable([]);
var disposer = mylist.observe(function(changes) {
  //log(changes.index);
	count++;
}, true);

console.time("mobx");
while( mylist.length < amount ){
  let obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: ['causality', 'muffins'],
	};
  let xobj = mobx.observable(obj);
	mylist.push(xobj);
}
for( let i=0; i<mylist.length; i++ ){
	//log( i );
	if(!( i % 11 )){
		mylist.splice(i, 1);
		//log( i );
	}
}
while( mylist.length ){
	mylist.shift();
}
console.timeEnd("mobx");
disposer();
log( count );

////////////////////////////////////////////
