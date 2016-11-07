var arrayChangeHandler = {
    get: function(target, property) {
        console.log('getting ' + property + ' for ' + target);
        // property is index in this case
        return target[property];
    },
    set: function(target, property, value, receiver) {
        console.log('setting ' + property + ' for ' + target + ' with value ' + value);
        target[property] = value;
        // you have to return true to accept the changes
        return true;
    }
};

var arrayToObserve = new Proxy([], arrayChangeHandler);

arrayToObserve.push('Test');
console.log(arrayToObserve[0]);