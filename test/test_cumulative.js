const assert = require('assert');
require('../causality').install();


setCumulativeAssignment(true);
describe("Test cumulative assignment", function(){
    var r = create({U: NaN, I: NaN, R: NaN});

    repeatOnChange(function(){
        r.U = r.R * r.I;
        r.R = r.U / r.I;
        r.I = r.U / r.R;
    });

    it('Setting U', function () {
        r.U = 6;
        assert.equal(r.U, 6);
        assert.equal(isNaN(r.I), true);
        assert.equal(isNaN(r.R), true);
        // assert.deepEqual(r, {U:6, I:NaN, R:NaN});  // Does not work since NaN !== NaN
    });

    it('Setting R', function () {
        r.R = 2;
        assert.deepEqual(r, {U:6, I:3, R: 2});
    });



    it("Unsetting R", function () {
        r.R = NaN;
        assert.deepEqual(r, {U:6, I:3, R: 2});
    });


    it("Unsetting R & U consecutive (will just repair the unset value)", function () {
        r.R = NaN;
        r.U = NaN;
        assert.deepEqual(r, {U:6, I:3, R: 2});
    });

    it("Unsetting R & U in transaction", function () {
        transaction(function() {
            r.R = NaN;
            r.U = NaN;
        });
        assert.equal(isNaN(r.U), true);
        assert.equal(r.I, 3);
        assert.equal(isNaN(r.R), true);
    });
});