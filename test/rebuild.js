'use strict';
require = require("esm")(module);
const assert = require('assert');
const causality = require("../causality.js")

// Setup instance
const events = [];
const instance = causality.instance({
  name: "rebuild", 
  emitEvents: true, 
  onEventGlobal: (event) => {
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

let collecting = false; 

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

    find(value) {
      if (this.value === value) {
        return this;
      } else if (this.value > value) {
        return this.lower; 
      } else if (this.value < value) {
        return this.higher; 
      }
    }

    onReBuildCreate() {
      // log("onReBuildCreate")
    }

    onReBuildRemove() {
      // log("onReBuildRemove")
    }
    
    onChange(event) {
      if (collecting) {      
        // log("onChange")
        // log(event)
      }
    }
  }

  function buildTree(source) {
    let result;
    source.forEach((value, index) => {
      const node = create(new Node(value), "node_" + value);
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
    let root = create({tree: null}); 

    repeat(
      () => {
        root.tree = buildTree(source);
      },
      null, 
      { 
        onRefresh: () => { collecting = true; events.length = 0 },
        onEndBuildUpdate: () => { collecting = false; updateBuildEvents = events.slice(); events.length = 0; }
      }
    );

    logg();
    log("inital...")
    log(root)
    
    logg();
    log("manipulate...")
    source.push(3.5);
    log(root)
    log(updateBuildEvents);

    logg();
    log("manipulate...");
    source.shift();
    log(root)
    log(updateBuildEvents);    
  });
});
