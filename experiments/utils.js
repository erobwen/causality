// Helper to quickly get a child object (this function was a great idea, but caused performance issues in stress-tests)
function getMap() {
  let argumentList = argumentsToArray(arguments);
  let object = argumentList.shift();
  while (argumentList.length > 0) {
    let key = argumentList.shift();
    if (typeof(object[key]) === 'undefined') {
      object[key] = {};
    }
    object = object[key];
  }
  return object;
}

function isDefined(object, property) {
  return (typeof(object[property]) !== 'undefined');
}

function setIfNotDefined(object, property, value) {
  if (typeof(object[property]) === 'undefined') {
    object[property] = value;
  }
}

function lastOfArray(array) {
  return array[array.length - 1];
};

function removeFromArray(object, array) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === object) {
      array.splice(i, 1);
      break;
    }
  }
}
