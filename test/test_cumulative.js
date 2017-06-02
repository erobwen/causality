'use strict';
const assert = require('assert');
const requireUncached = require('require-uncached');
let causality = requireUncached('../causality');
causality.setConfiguration({cumulativeAssignment : true});

let create = causality.create;
let transaction = causality.transaction;
let repeatOnChange = causality.repeatOnChange;


describe("Test cumulative assignment", function(){
    var r = create({U: NaN, I: NaN, R: NaN});

    repeatOnChange(function(){
        r.U = r.R * r.I;
        r.R = r.U / r.I;
        r.I = r.U / r.R;
    });

    it('Setting U', function () {
        causality.setCumulativeAssignment(true);
        r.U = 6;
        assert.equal(r.U, 6);
        assert.equal(isNaN(r.I), true);
        assert.equal(isNaN(r.R), true);
        // assert.deepEqual(r, {U:6, I:NaN, R:NaN});  // Does not work since NaN !== NaN
        causality.setCumulativeAssignment(false);
    });

    it('Setting R', function () {
        causality.setCumulativeAssignment(true);
        r.R = 2;
        assert.deepEqual(r, {U:6, I:3, R: 2});
        causality.setCumulativeAssignment(false);
    });



    it("Unsetting R", function () {
        causality.setCumulativeAssignment(true);
        r.R = NaN;
        assert.deepEqual(r, {U:6, I:3, R: 2});
        causality.setCumulativeAssignment(false);
    });


    it("Unsetting R & U consecutive (will just repair the unset value)", function () {
        causality.setCumulativeAssignment(true);
        r.R = NaN;
        r.U = NaN;
        assert.deepEqual(r, {U:6, I:3, R: 2});
        causality.setCumulativeAssignment(false);
    });

    it("Unsetting R & U in transaction", function () {
        causality.setCumulativeAssignment(true);
        transaction(function() {
            r.R = NaN;
            r.U = NaN;
        });
        assert.equal(isNaN(r.U), true);
        assert.equal(r.I, 3);
        assert.equal(isNaN(r.R), true);
        causality.setCumulativeAssignment(false);
    });
});
