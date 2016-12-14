const assert = require('assert');
require('../causality').install();

describe("Without side effects", function(){

    it("Test no side effects", function(){

        let x = create({});
        let returnValue = withoutSideEffects(function() {
            y = create({});
            y.v = 42;

            x.v = 42;

            return y.v;
        });

        assert.equal(typeof(x.v), 'undefined');
        assert.equal(returnValue, 42);
    });
});
