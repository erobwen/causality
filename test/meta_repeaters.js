'use strict';
require = require("esm")(module);
const {observable, repeat, transaction, cachedCallCount} = require("../causality.js").getWorld({warnOnNestedRepeater:false});
const assert = require('assert');
describe("Meta repeaters", function(){

  it("Test working", function(){
    const events = [];

    class Node {
      constructor(value) {
        this.value = value;
        return observable(this);
      }

      emitHelloEvent(arg1, arg2) {
        // log(">>>>>> pushing hello " + this.value + " <<<<<<<");
        events.push("hello " + this.value);
      }
    };

    let array = observable([]);
    let a = new Node('a');
    let b = new Node('b');
    let c = new Node('c');
    let d = new Node('d');

    array.push(a);
    array.push(b);
    array.push(c);
    assert.equal(array.length, 3);

    // Meta repeater
    repeat(function() {
      array.forEach(function(node) {
        repeat(() => {
          node.emitHelloEvent('some', 'argument');
        }, {dependentOnParent: true});
      });
    });

    // Assert all repeaters run once upon creation
    assert.equal(events.length, 3);

    // Assert repeater on first node working
    a.value = "A";
    assert.equal(events.length, 4);

    // console.log(a._repeaters.emitHelloEvent);

    // console.log("============= trigger killing a ================");
    // Assert add repeaer to new nodes
    transaction(function() {
      array.shift();
      array.push(d);
    });
    // console.log("=============================");
    assert.equal(events.length, 7);

    // Test no undead repeater, the
    a.value = "Abraka Dabra";
    assert.equal(events.length, 7); 
  });



  it("Test overlapping sets, only trigger unique sub-repeaters", function(){
    const events = [];

    class Node {
      constructor(value) {
        this.value = value;
        return observable(this);
      }

      emitHelloEvent(arg1, arg2) {
        // log(">>>>>> pushing hello " + this.value + " <<<<<<<");
        events.push("hello " + this.value);
      }
    };

    let array = observable([]);
    let a = new Node('a');
    let b = new Node('b');
    let c = new Node('c');
    let d = new Node('d');

    array.push(a);
    array.push(b);
    array.push(c);
    assert.equal(array.length, 3);

    // Meta repeater
    repeat(function() {
      array.forEach(function(node) {
        if (node.repeater) return;
        node.repeater = repeat(() => {
          node.emitHelloEvent('some', 'argument');
        }, {dependentOnParent: true});
      });
    });

    // Assert all repeaters run once upon creation
    assert.equal(events.length, 3);

    let arrayB = observable([]);
    arrayB.push(b);
    arrayB.push(c);
    arrayB.push(d);

    // Meta repeater B
    repeat(function() {
      // console.log(array);
      arrayB.forEach(function(node) {
        // console.log(node);
        if (node.repeater) return;
        node.repeater = repeat(() => {
          node.emitHelloEvent('some', 'argument');
        }, {dependentOnParent: true});
      });
    });

    // Assert only one more event
    assert.equal(events.length, 4);

    // Assert repeater on first node working
    b.value = "B";
    assert.equal(events.length, 5);

    // console.log(a._repeaters.emitHelloEvent);

    // Assert add repeaer to new nodes
    // console.log("============= restruct ================");
    transaction(function() {
      array.pop();
    });
    // console.log("============= end restruct ================");
    assert.equal(events.length, 5);

    // console.log(a._repeaters.emitHelloEvent);
    //
    // Test no undead repeater, the
    c.value = "Chaos";
    assert.equal(events.length, 5); // Note c was killed because it was started from array that got popped. There is no "user count" on these repeaters. Perhaps it still should be alive fom arrayB? 
  });
});
