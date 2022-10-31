'use strict';
require = require("esm")(module);
const assert = require('assert');
const causality = require("../causality.js")

// Setup instance
const events = [];
const instance = causality.getWorld({
  name: "rebuild",
  onEventGlobal: (event) => {
    events.push(event);
  }
});
const {observable, withoutSideEffects, repeat, isObservable } = instance;
const c = observable; 

const log = console.log;
const logg = (string) => {
  if (string) {
    console.log("-------------" + string + "-------------");
  } else {
    console.log("--------------------------");
  }
};

let collecting = false; 

describe("Re Build", function(){

  let created3Node = false; 
  let removed3Node = false; 
  let setHigherFor3Node = false; 

  class Node {
    constructor(value) {
      this.value = value; 
      this.higher = null;
      this.lower = null;
    }

    insert(node) {
      if (node.value >= this.value) {
        if (this.higher) {
          this.higher.insert(node);
        } else {
          this.higher = node; 
        }
      }
      if (node.value < this.value) {
        if (this.lower) {
          this.lower.insert(node);
        } else {
          this.lower = node; 
        }          
      }
    }

    find(value) {
      if (this.value === value) {
        return this;
      } else if (this.value > value) {
        return this.lower; 
      } else if (this.value < value) {
        return this.higher; 
      }
    }

    onEstablish() {
      if (this.value === 3) created3Node = true; 
      // log("onEstablish" + this.value);
    }

    onDispose() {
      if (this.value === 3) removed3Node = true; 
      // log("onDispose" + this.value)
    }
    
    onChange(event) {
      if (this.value === 3 && event.type === "set" && event.property === "higher") setHigherFor3Node = true; 
      // log("onChange" + this.value)
    }
  }

  function buildTree(source) {
    let result;
    source.forEach((value, index) => {
      const node = observable(new Node(value), "node_" + value);
      if (index === 0) {
        result = node; 
      } else {
        result.insert(node);
      }
    }); 
    return result; 
  }


  it("Test rebuild", function(){
    const source = observable([3]);
    let updateBuildEvents = [];
    let tree = observable({root: null}); 

    repeat(
      () => {
        tree.root = buildTree(source);
      },
      null, 
      { 
        onRefresh: () => { collecting = true; events.length = 0 },
        onEndBuildUpdate: () => { collecting = false; updateBuildEvents = events.slice(); events.length = 0; }
      }
    );

    const value3Node = tree.root.find(3);
    
    source.push(3.5);
    const value35Node = tree.root.find(3.5);
    assert.equal(created3Node, true);
    assert.equal(setHigherFor3Node, true);
    assert.equal(value3Node, tree.root.find(3));

    source.shift();
    assert.equal(value35Node, tree.root.find(3.5));
    assert.equal(removed3Node, true);
  });
});




describe("Re build shape analysis", function(){

  class Node {
    onDispose() {
      disposed.unshift(this);
    }

    onEstablish() {
      established.unshift(this);
    }
  }
  const disposed = [];
  const established = [];

  class Aggregate extends Node {
    constructor({a=null, b=null, c=null, key=null}) {
      super();
      this.a = a; 
      this.b = b; 
      this.c = c;
      return observable(this, key);
    } 
  }

  class Primitive extends Node {
    constructor({value, key=null}) {
      super();
      this.value = value;
      return observable(this, key);
    } 
  }

  it("Test rebuild with shape analysis", function(){ 

    const state = observable({value: 1});
    disposed.length = 0;
    established.length = 0;
  
    let result; 
    repeat(
      () => {
        if (state.value === 1) {
          result = new Aggregate({
            a: new Primitive({value: 42}),
            b: new Aggregate({
              a: new Primitive({value: 43})
            })
          })
        }
        if (state.value === 2) {
          result = new Aggregate({
            a: new Primitive({value: 42}),
            b: new Aggregate({
              a: new Primitive({value: 43})
            }),
            c: new Primitive({value: 30}) // Added node
          })
        }
        if (state.value === 3) {
          result = new Aggregate({
            a: new Primitive({value: 42}),
            b: new Aggregate({
              a: new Primitive({value: 43})
            })
            // Removed node again
          })
        }
      },
      { 
        rebuildShapeAnalysis: {
          shapeRoot: () => result,
          allowMatch: (newFlow, establishedFlow) => {
            return isObservable(newFlow) && isObservable(establishedFlow) &&
              newFlow.constructor.name === establishedFlow.constructor.name 
          },
          slotsIterator: function*(optionalEstablishedFlow, newFlow) {
            for (let property in newFlow) {
              yield [
                optionalEstablishedFlow ? optionalEstablishedFlow[property] : null,
                newFlow[property]
              ]
            }
          }
        }
      }
    );

    assert.equal(established.length, 4); // 4 nodes to begin with!

    result.a.decorate = "someValue";
    result.b.a.decorate = "someOtherValue";
    state.value = 2; // Trigger rebulid
    
    assert.equal(result.a.decorate, "someValue"); // Still decorated! No build ids were used!
    assert.equal(result.b.a.decorate, "someOtherValue"); // Still decorated! No build ids were used!
    assert.equal(established.length, 5); 
    assert.equal(established[0].value, 30); 
    assert.equal(disposed.length, 0);
    
    state.value = 3; // Trigger rebulid
    
    assert.equal(result.a.decorate, "someValue"); // Still decorated! No build ids were used!
    assert.equal(result.b.a.decorate, "someOtherValue"); // Still decorated! No build ids were used!
    assert.equal(established.length, 5);
    assert.equal(disposed.length, 1);
    assert.equal(disposed[0].value, 30); 
  });


  it("Test rebuild with hybrid analysis", function(){ 
    const state = observable({value: 1});
    disposed.length = 0;
    established.length = 0;
  
    let result; 
    let savedRepeater;
    repeat(
      "test",
      (repeater) => {
        savedRepeater = repeater;
        if (state.value === 1) {
          result = new Aggregate({
            a: new Primitive({value: 42, key: "locked-identity"}),
            b: new Aggregate({
              c: new Primitive({value: 100})
            })
          })
        }
        if (state.value === 2) {
          result = new Aggregate({
            a: new Primitive({value: 200}),
            b: new Aggregate({
              c: new Primitive({value: 43, key: "locked-identity"})
            })
          })
        }
      },
      { 
        rebuildShapeAnalysis: {
          shapeRoot: () => result,
          allowMatch: (newFlow, establishedFlow) => {
            return newFlow.constructor.name === establishedFlow.constructor.name 
          },
          slotsIterator: function*(optionalEstablishedFlow, newFlow) {
            for (let property in newFlow) {
              yield [
                optionalEstablishedFlow ? optionalEstablishedFlow[property] : null,
                newFlow[property]
              ]
            }
          }
        }
      }
    );

    assert.equal(established.length, 4); // 4 nodes to begin with!
    result.a.decorate = "someValue";

    state.value = 2; // Trigger rebulid
    result = savedRepeater.establishedShapeRoot; 

    assert.equal(result.b.c.decorate, "someValue"); // Still decorated! No build ids were used!
    assert.equal(established.length, 5); 
    assert.equal(established[0].value, 200); 
    assert.equal(disposed.length, 1);
    assert.equal(disposed[0].value, 100);
  });
});