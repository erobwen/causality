'use strict';
require = require("esm")(module);
const causality = require("../causality.js").instance();
const assert = require('assert');

describe("Overlays", function(){

  it('testing', function () {
    // Simple object
    // console.log(" Simple object ===========================")
    let x = causality.create({name: "original"});
    x.foo = 1;
    assert.equal(x.foo, 1);

    // Create forwardTo
    // console.log(" Create forwardTo ===========================")
    let xOverlay = causality.create({ name: "forwardTo"});
    x.__handler.causality.__forwardTo = xOverlay;
    // console.log(x.__handler);
    // console.log(x.__handler.causality);
    // console.log(x);
    // console.log(x.__forwardTo);
    // console.log(x.__handler);
    // console.log(x.foo);
    assert.equal(typeof(x.foo), 'undefined');

    // Make changes in forwardTo
    // console.log(" Make changes in forwardTo ===========================")
    x.foo = 42;
    x.fie = 32;
    assert.equal(x.foo, 42);
    assert.equal(x.fie, 32);

    // Remove forwardTo
    x.__forwardTo = null;
    assert.equal(x.foo, 1);
    assert.equal(typeof(x.fie), 'undefined');
  });
});
