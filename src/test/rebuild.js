import { getWorld } from "../causality.js";
import assert from "assert";

// Setup instance
const events = [];
const instance = getWorld({
  name: "rebuild",
  onEventGlobal: (event) => {
    events.push(event);
  }
});
const {observable, withoutSideEffects, withoutRecording, repeat, finalize } = instance;
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

  
  it("Test finalize", function(){
    const trigger = observable({count:1});
    let constructed;
    let decorationFromFinalized;

    repeat(
      () => {
        const justRead = trigger.count;  
        constructed = observable({propertyA: "bar"}, "key1"); // Note: decoration cannot be set to null here as it will overwrite the established objects value. It has to be undefined. 

        finalize(constructed);

        withoutRecording(() => {
          // We need to not record here, otherwise we will trigger this repeater diretly if we set decoration.
          decorationFromFinalized = constructed.decorationA;
        })
      },
    );
    assert.equal(decorationFromFinalized, null);

    constructed.decorationA = "decoration";
    trigger.count++;
    assert.equal(decorationFromFinalized, "decoration");

    constructed.decorationA = "decoration2";
    trigger.count++;
    assert.equal(decorationFromFinalized, "decoration2");
  });
});
