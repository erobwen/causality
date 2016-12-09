const assert = require('assert');
require('../causality').install();



describe("Overlays", function(){

    it('testing', function () {
        // Simple object
        let x = create({original:true});
        x.foo = 1;
        assert.equal(x.foo, 1);

        // Create overlay
        let xOverlay = create({overlay:true});
        x.__handler.overrides.__overlay = xOverlay;
        console.log(x.foo);
        console.log(x.__overlay);
        assert.equal(typeof(x.foo), 'undefined');

        // Make changes in overlay
        x.foo = 42;
        x.fie = 32;
        assert.equal(x.foo, 42);
        assert.equal(x.fie, 32);

        // Remove overlay
        x.__overlay = null;
        assert.equal(x.foo, 1);
        assert.equal(typeof(x.fie), 'undefined');
    });
});