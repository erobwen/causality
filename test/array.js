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

    a.splice(0,a.length, 1,2,2,4);
    assert.equal(sum(), 9);

    a.length = 4;
    assert.equal(sum(), 9);

    a.length = 2;
    assert.equal(sum(), 3);
    assert.deepEqual(a.slice(), [1,2]);

    a.unshift(3);
    assert.deepEqual(a.slice(), [3,1,2]);


		assert.equal(JSON.stringify(a), "[3,1,2]");

		assert.deepEqual(Object.keys(a), ['0', '1', '2']); // Differs from mobx
		
	});

	it('should differ undefined from nonexisting', function(){
		var a = c([]);

		a.length = 4;
		assert.equal(isNaN(sum()), false); // Differs from mobx
    assert.deepEqual(a.length, 4);

		assert.equal( a+"", ",,,");

		assert.deepEqual(a.slice(), [,,,]); // Differs from mobx
		
		a[1] = undefined;
		a[2] = null;
		assert.deepEqual(a.slice(), [,undefined,null,]);
	});

	it('should sort', function(){
		var a = c([3,1,2]);

    assert.deepEqual(a.sort(), [1,2,3]); // Differs from mobx
    assert.deepEqual(a.slice(), [1,2,3]);
	});

	it('should find and remove', function() {
    var a = c([10,20,20]);
    var idx = -1;
    function predicate(item, index) {
      if (item === 20) {
        idx = index;
        return true;
      }
      return false;
    }

		log( a.find(predicate) );
		log( idx );

    assert.equal(a.find(predicate), 20);
    assert.equal(idx, 1);
    assert.equal(a.find(predicate, null, 1), 20);
    assert.equal(idx, 1);
    assert.equal(a.find(predicate, null, 2), 20);
    assert.equal(idx, 2);
    idx = -1;
    assert.equal(a.find(predicate, null, 3), undefined);
    assert.equal(idx, -1);

    assert.equal(a.remove(20), true);
    assert.equal(a.find(predicate), 20);
    assert.equal(idx, 1);
    idx = -1;
    assert.equal(a.remove(20), true);
    assert.equal(a.find(predicate), undefined);
    assert.equal(idx, -1);

    assert.equal(a.remove(20), false);
		
	});
	
	it('should concat', function() {
		var a1 = c([1,2]);
		var a2 = c([3,4]);
		assert.deepEqual(a1.concat(a2), [1,2,3,4])
})

	
});


