const assert = require('assert');
require('./causalityBasic').install();
//const log = console.log.bind(console);


describe("observe arrays", function(){
	resetObjectIds();
    
	var result;
	var observedArray = c(['a', 'b', 'c']);
    observedArray.const.observe(
		function(event) {
			result = event;
		}
    );

	it('should report changes', function(){
		observedArray[1] = 'z';
		assert.deepEqual( result, { type: 'splice', index: 1, removed: ['b'], added: [ 'z' ], object : observedArray} );

		observedArray.push('last');
		assert.deepEqual( result, { type: 'splice', index: 3, removed: null, added: [ 'last' ], object : observedArray} );

	})

    it('should report shrinked array', function(){
        observedArray.splice(2);
		assert.deepEqual( result, { type: 'splice', index: 2, removed: ['c','last'], added: [], object : observedArray} );
    });

});


