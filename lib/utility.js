
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
