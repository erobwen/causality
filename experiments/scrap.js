const assert = require('assert');
require('../causality').install();


// var a = c([3, 1, 2]);
// console.log(a);
// a.sort();
// console.log(a);

var a = c([]);
var sum = function () {
    return -1 + a.reduce(function (a, b) {
            return a + b;
        }, 1);
};

a.length = 4;
// assert.equal(isNaN(sum(a)), false);
// assert.deepEqual(a.length, 4);
//
// assert.equal(a + "", ",,,");
//
// assert.deepEqual(a.slice(), [, , ,]);
//
console.log(a);
a[1] = undefined;
a[2] = null;
console.log(a);
console.log(a.slice());//, [, undefined, null,]);
