'use strict';
require = require("esm")(module);
const {create,withoutSideEffects} = require("../causality.js");
const assert = require('assert');

describe("Without side effects", function(){

  it("Test no side effects", function(){

    let x = create({});
    let x2 = create([]);
    let returnValue = withoutSideEffects(function() {
      const y = create({});
      y.v = 42;

      try{
				x.v = 42;
			} catch( err ){
				assert.equal( err.name, 'TypeError' );
			}

			x2.push(42); // no TypeError for push

      return y.v;
    });

    assert.equal(typeof(x.v), 'undefined');
    assert.equal(returnValue, 42);
    assert.equal(x2.length, 0);
  });
});
