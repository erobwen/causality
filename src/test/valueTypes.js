import { getWorld } from "../causality.js";
import assert from "assert";
const { observable, repeat } = getWorld({name: "Value types", useNonObservablesAsValues: true});

describe("Value types", function(){

  it('testing', function () {
    // Setup
    const other = observable({})
    const another = observable({})

    // Main object
    // Note: Here it is assumed that observable will not recusivley create observables out of the whole structure. 
    const foo = observable({
      value: 1, 
      reference: other, 
      complexValue: {bar: 32, fum: 42}
    });
      
    let repeatCounter = 0;
    let expectedRepeatCounter = 0;

    repeat(() => {
      // Just observe it: 
      const a = foo.value;
      const b = foo.reference;
      const c = foo.complexValue; 
      repeatCounter++;
    })
    assert.equal(repeatCounter, ++expectedRepeatCounter); 
    
    // Changes
    foo.value = 1; // Should not trigger reactions (there is no assignemnt as it is the same as old value)
    assert.equal(repeatCounter, expectedRepeatCounter);
    
    foo.reference = other; // Will will not trigger reaction 
    assert.equal(repeatCounter, expectedRepeatCounter);
    
    foo.reference = another; // This will trigger reaction 
    assert.equal(repeatCounter, ++expectedRepeatCounter);
    
    foo.complexValue = {bar: 32, fum: 42} // Should also not trigger reaction!
    assert.equal(repeatCounter, expectedRepeatCounter);

    foo.complexValue = {bar: "x", fum: 43} // But this should!
    assert.equal(repeatCounter, ++expectedRepeatCounter);
  });
});
