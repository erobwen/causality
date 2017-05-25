const assert = require('assert');
require('../causality').install();



describe("Overlays", function(){

    it('testing', function () {
        // Simple object
        // console.log(" Simple object ===========================")
        let x = create({name: "original"});
        x.foo = 1;
		x.const.tag = "x";
        assert.equal(x.foo, 1);

        // Create overlay
        // console.log(" Create overlay ===========================")
        let xOverlay = create({ name: "overlay"});
		xOverlay.const.tag = "xOverlay";
        x.const.__overlay = xOverlay;

        // console.log(x.const.__handler);
        // console.log(x.const.__handler.const);
        // console.log(x);
        // console.log(x.const.__overlay);
        // console.log(x.const.__handler);
        // console.log(x.foo);
        assert.equal(typeof(x.foo), 'undefined');

        // Make changes in overlay
        // console.log(" Make changes in overlay ===========================")
        x.foo = 42;
        x.fie = 32;
		// console.log("=================");
        assert.equal(x.foo, 42);
        assert.equal(x.fie, 32);

        // Remove overlay
        x.nonForwardStatic.__overlay = null;
		// console.log(x.const.tag);
		// console.log("no more overlay");
        assert.equal(x.foo, 1);
        assert.equal(typeof(x.fie), 'undefined');
    });
});