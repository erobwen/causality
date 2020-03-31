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
    events.push(event);
  }
});
const {create, withoutSideEffects, repeat } = instance;
const c = create; 



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
      const node = new Node(value);
      if (index === 0) {
        result = node; 
      } else {
        result.insert(node);
      }
    }); 
    return result; 
  }


  it("Test rebuild", function(){
    const source = create([3, 4, 3, 1, 3]);
    let updateBuildEvents = [];
    let tree; 

    repeat(
      () => {
        tree = buildTree(source);
      },
      null, 
      { 
        onStartBuildUpdate: () => { events.length = 0 },
        onEndBuildUpdate: () => { updateBuildEvents = events.slice(); events.length = 0; }
      }
    );

    console.log(tree)
    source.push(5);
    console.log(updateBuildEvents);
    console.log(tree)

    
    // assert.equal(, );
  });
});
