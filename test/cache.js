'use strict';
require = require("esm")(module);
const assert = require('assert');
const {observable, invalidateOnChange} = require("../causality.js").getWorld();


const log = console.log;

describe("Cached", function(){
  it('Test cached', function () {

    let actualSummations = 0

    class Summarizer{
      constructor() {
        this.a = 10;
        this.b = 20;
        this.c = 30;
      }
      sum() {
        if (!this.cachedSum) {
          invalidateOnChange(
            () => { this.cachedSum = this.a + this.b + this.c; actualSummations++ },
            () => { delete this.cachedSum; }
          );
        }
        return this.cachedSum;
      }
    }

    const summarizer = observable(new Summarizer());

    // Fill cache
    let sum = summarizer.sum();
    assert.equal(actualSummations, 1);

    // Reuse cache
    sum = summarizer.sum();
    assert.equal(actualSummations, 1);

    // Cause cache invalidation
    summarizer.a = 100;
    assert.equal(actualSummations, 1);

    // Fill cache anew
    sum = summarizer.sum();
    assert.equal(actualSummations, 2);
  });
});
