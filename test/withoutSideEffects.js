const assert = require('assert');
require('../causality')().install();

describe("Without side effects", function(){

    it("Test no side effects", function(){

        let x = create({});
        let x2 = create([]);
        let returnValue = withoutSideEffects(function() {
            const y = create({});
            y.v = 42;

            x.v = 42;
            x2.push(42);

            return y.v;
        });

        assert.equal(typeof(x.v), 'undefined');
        assert.equal(returnValue, 42);
        assert.equal(x2.length, 0);
    });
});
