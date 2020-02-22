'use strict';
require = require("esm")(module);
const causality = require("../causality.js").instance();
if (!causality.causalityObject) causality.causalityObject = require("../lib/causalityObject.js").bindToInstance(causality);
const {CausalityObject, cachedCallCount} = causality.causalityObject; 
const {create,repeatOnChange,transaction} = causality;
const assert = require('assert');
describe("Meta repeaters", function(){

  it("Test working", function(){
    const events = [];

    class Node extends CausalityObject {
      constructor(value) {
        super();
        this.value = value;
      }

      emitHelloEvent(arg1, arg2) {
        // log(">>>>>> pushing hello " + this.value + " <<<<<<<");
        events.push("hello " + this.value);
      }
    };

    let array = create([]);
    let a = new Node('a');
    let b = new Node('b');
    let c = new Node('c');
    let d = new Node('d');

    array.push(a);
    array.push(b);
    array.push(c);
    assert.equal(array.length, 3);

    // Meta repeater
    repeatOnChange(function() {
      // logGroup("Meta repeater: Installing other repeaters...");
      array.forEach(function(node) {
        // console.log(node);
        node.repeat('emitHelloEvent', 'some', 'argument');
      });
			// logUngroup();
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
    assert.equal(events.length, 5);

    // console.log(a._repeaters.emitHelloEvent);
    //
    // Test no undead repeater, the
    // a.value = "Abraka Dabra";
    // // console.log(events);
    // assert.equal(events.length, 5); // Fails, TODO: revive auto repeater killing
  });



  it("Test overlapping sets, only trigger unique sub-repeaters", function(){
    const events = [];

    class Node extends CausalityObject {
      constructor(value) {
        super();
        this.value = value;
      }

      emitHelloEvent(arg1, arg2) {
        // log(">>>>>> pushing hello " + this.value + " <<<<<<<");
        events.push("hello " + this.value);
      }
    };

    let array = create([]);
    let a = new Node('a');
    let b = new Node('b');
    let c = new Node('c');
    let d = new Node('d');

    array.push(a);
    array.push(b);
    array.push(c);
    assert.equal(array.length, 3);

    // Meta repeater
    repeatOnChange(function() {
      // console.log(array);
      array.forEach(function(node) {
        // console.log(node);
        node.repeat('emitHelloEvent', 'some', 'argument');
      });
    });

    // Assert all repeaters run once upon creation
    assert.equal(events.length, 3);

    let arrayB = create([]);
    arrayB.push(b);
    arrayB.push(c);
    arrayB.push(d);

    // Meta repeater B
    repeatOnChange(function() {
      // console.log(array);
      arrayB.forEach(function(node) {
        // console.log(node);
        node.repeat('emitHelloEvent', 'some', 'argument');
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
    // console.log(events);
    assert.equal(events.length, 6);
  });


  it("Test unique signatures", function(){
    const events = [];

    class Node extends CausalityObject {
      constructor(value) {
        super();
        this.value = value;
      }

      emitHelloEvent(arg1, arg2) {
        // log(">>>>>> pushing hello " + this.value + " <<<<<<<");
        events.push("hello " + this.value);
      }
    };

    let a = new Node('a');
    a.repeat('emitHelloEvent', 'some', 'argument');
    a.repeat('emitHelloEvent', 2);
    a.repeat('emitHelloEvent', 54);
    a.repeat('emitHelloEvent', 54);

    // Assert all repeaters run once upon creation
    assert.equal(events.length, 3);
  });
});
