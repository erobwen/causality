const assert = require('assert');
require('../causality').install();


var x = create({
    val: 10,
    get : function() {
        return this.val;
    }
});

var y = create({
    val: 200,
    other: x,
    get : function() {
        return this.val + this.other.cachedInCache('get');
    }
});


// console.log(cachedCallCount());
//
// console.log(x.cachedInCache('get'));
//
// console.log(cachedCallCount());
//
// console.log(x.cached('get'));
//
// console.log(cachedCallCount());
//
// console.log(y.get());
//
console.log(cachedCallCount());

console.log(y.cached('get'));

console.log(cachedCallCount());
