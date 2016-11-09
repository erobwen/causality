const assert = require('assert');
require('../causality').install();
const log = console.log.bind(console);

// Tests based on mobx test/array.js
describe("arrays", function(){
	it('should behave like arrays', function(){
		var a = c([]);

		assert.equal( a.length, 0 );
		assert.deepEqual( Object.keys(a), []);
		assert.deepEqual( a.slice(), []);

		a.push(1);
    assert.equal(a.length, 1);
    assert.deepEqual(a.slice(), [1]);

		a[1] = 2;
    assert.equal(a.length, 2);
    assert.deepEqual(a.slice(), [1,2]);

		var sum = function() {
      return -1 + a.reduce(function(a,b) {
        return a + b;
      }, 1);
		};

		assert.equal(sum(), 3);

		a[1] = 3;
    assert.equal(a.length, 2);
    assert.deepEqual(a.slice(), [1,3]);
    assert.equal(sum(), 4);

    a.splice(1,1,4,5);
    assert.equal(a.length, 3);
    assert.deepEqual(a.slice(), [1,4,5]);
    assert.equal(sum(), 10);

		a.splice(0, a.length, 2, 4);
		//a.replace([2,4]);
    assert.equal(sum(), 6);
		
		a.splice(1,1);
    assert.equal(sum(), 2);
    assert.deepEqual(a.slice(), [2])

		a.splice(0,0,4,3);
    assert.equal(sum(), 9);
    assert.deepEqual(a.slice(), [4,3,2]);

		a.splice(0,a.length);
		//a.clear();
    assert.equal(sum(), 0);
    assert.deepEqual(a.slice(), []);

		a.length = 4;
		assert.equal(isNaN(sum()), false); // Differs from mobx
    assert.deepEqual(a.length, 4);

		assert.equal( a+"", ",,,");

		assert.deepEqual(a.slice(), [,,,]); // Differs from mobx
		
		a[1] = undefined;
		a[2] = null;
		assert.deepEqual(a.slice(), [,undefined,null,]);

    a.splice(0,a.length, 1,2,2,4);
    assert.equal(sum(), 9);

    a.length = 4;
    assert.equal(sum(), 9);

    a.length = 2;
    assert.equal(sum(), 3);
    assert.deepEqual(a.slice(), [1,2]);

    a.unshift(3);
    assert.deepEqual(a.slice(), [3,1,2]);
    assert.deepEqual(a.sort(), [1,2,3]); // Differs from mobx
    assert.deepEqual(a.slice(), [1,2,3]);

		assert.equal(JSON.stringify(a), "[1,2,3]");

		assert.deepEqual(Object.keys(a), ['0', '1', '2']); // Differs from mobx
		
	});

});