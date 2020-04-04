'use strict';
require = require("esm")(module);
const assert = require('assert');
const causality = require("../causality.js")

// Setup instance
const events = [];
const instance = causality.instance({
  name: "rebuild", 
  notifyChange: true, 
  onChangeGlobal: (event) => {
    log(events);
    events.push(event);
  }
});
const {create, withoutSideEffects, repeat } = instance;
const c = create; 

const log = console.log;
const logg = (string) => {
  if (string) {
    console.log("-------------" + string + "-------------");
  } else {
    console.log("--------------------------");
  }
};

describe("Re Build", function(){

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

    onReBuildCreate() {}

    onReBuildRemove() {}
    
    onChange() {}
  }

  function buildTree(source) {
    let result;
    source.forEach((value, index) => {
      const node = create(new Node(value), "node_" + index);
      if (index === 0) {
        result = node; 
      } else {
        result.insert(node);
      }
    }); 
    return result; 
  }


  it("Test rebuild", function(){
    const source = create([3]);
    let updateBuildEvents = [];
    let tree; 

    repeat(
      () => {
        tree = buildTree(source);
      },
      null, 
      { 
        onStartBuildUpdate: () => { events.length = 0 },
        onEndBuildUpdate: () => { console.log("inside"); updateBuildEvents = events.slice(); events.length = 0; }
      }
    );

    console.log(tree)
    logg();
    source.push(3.5);
    logg();
    console.log(updateBuildEvents);
    console.log(tree)

    
    // assert.equal(, );
  });
});
