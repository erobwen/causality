'use strict';
const assert = require('chai').assert;
require('../causality').install();
//const log = console.log.bind(console);

describe("array-splices", function(){
	resetObjectIds();
    
	var result;
	var observedArray = c(['a', 'b', 'c']);
    observedArray.observe(
		function(event) {
			result = event;
		}
    );

	it('should report changes', function(){
		observedArray[1] = 'z';
		assert.deepEqual( result, { type: 'splice', index: 1, removed: ['b'], added: [ 'z' ], objectId: 1} );

		observedArray.push('last');
		assert.deepEqual( result, { type: 'splice', index: 3, removed: null, added: [ 'last' ], objectId: 1} );

	})

    it('should report shrinked array', function(){
        observedArray.splice(2);
		assert.deepEqual( result, { type: 'splice', index: 2, removed: ['c','last'], added: [], objectId: 1} );
    });

});


