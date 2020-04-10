'use strict';
require = require("esm")(module);
// const {observable,withoutSideEffects} = require("../causality.js").instance();
const assert = require('assert');

describe("Without side effects", function(){

  // it("Test no side effects", function(){

  //   let x = observable({});
  //   let x2 = observable([]);
  //   let returnValue = withoutSideEffects(function() {
  //     const y = observable({});
  //     y.v = 42;

  //     try{
		// 		x.v = 42;
		// 	} catch( err ){
		// 		assert.equal( err.name, 'TypeError' );
		// 	}

		// 	x2.push(42); // no TypeError for push

  //     return y.v;
  //   });

  //   assert.equal(typeof(x.v), 'undefined');
  //   assert.equal(returnValue, 42);
  //   assert.equal(x2.length, 0);
  // });
});
