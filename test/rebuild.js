'use strict';
require = require("esm")(module);
const causality = require("../causality.js").instance({name: "rebuild"});
const {create, withoutSideEffects, repeat } = causality;
const c = create; 
const assert = require('assert');

describe("Re Build", function(){



  it("Test rebuild", function(){
    const source = c([3, 4, 3, 1, 3]);


    // assert.equal(, );
  });
});
