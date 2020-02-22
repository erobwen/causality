
export function argumentsToArray(argumentList) {
  return Array.prototype.slice.call(argumentList);
}

// Helper to quickly get a child array
export function getArray() {
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



/************************************************************************
 *
 *  Merge into
 *
 ************************************************************************/

export function mergeInto(source, target) {
  if (source instanceof Array) {
    let splices = differentialSplices(target.__target, source.__target);
    splices.forEach(function(splice) {
      let spliceArguments = [];
      spliceArguments.push(splice.index, splice.removed.length);
      spliceArguments.push.apply(spliceArguments, splice.added);
      //.map(mapValue))
      target.splice.apply(target, spliceArguments);
    });
    for (let property in source) {
      if (isNaN(property)) {
        target[property] = source[property];
      }
    }
  } else {
    for (let property in source) {
      target[property] = source[property];
    }
  }
  return target;
}

//  The difference between array and previous array
function differentialSplices(previous, array) {
  let done = false;
  let splices = [];

  let previousIndex = 0;
  let newIndex = 0;

  let addedRemovedLength = 0;

  function add(added) {
    let splice = {
      type:'splice',
      index: previousIndex + addedRemovedLength,
      removed: [],
      added: added};
    addedRemovedLength += added.length;
    splices.push(splice);
  }

  function remove(removed) {
    let splice = {
      type:'splice',
      index: previousIndex + addedRemovedLength,
      removed: removed,
      added: [] };
    addedRemovedLength -= removed.length;
    splices.push(splice);
  }

  function removeAdd(removed, added) {
    let splice = {
      type:'splice',
      index: previousIndex + addedRemovedLength,
      removed: removed,
      added: added};
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

    if (previousIndex === previous.length &&
        newIndex === array.length) {
      done = true;
    } else if (newIndex === array.length) {
      // New array is finished
      const removed = [];
      let index = previousIndex;
      while(index < previous.length) {
        removed.push(previous[index++]);
      }
      remove(removed);
      done = true;
    } else if (previousIndex === previous.length) {
      // Previous array is finished.
      const added = [];
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
          if (previous[previousScanIndex]
              === array[newScanIndex]) {
            foundMatchAgain = true;
          }
          if (!foundMatchAgain) newScanIndex++;
        }
        if (!foundMatchAgain) previousScanIndex++;
      }
      removeAdd(previous.slice(previousIndex, previousScanIndex),
                array.slice(newIndex, newScanIndex));
      previousIndex = previousScanIndex;
      newIndex = newScanIndex;
    }
  }

  return splices;
}