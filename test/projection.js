'use strict';
require = require("esm")(module);
const causality = require("../causality.js").instance();
if (!causality.causalityObject) causality.causalityObject = require("../lib/causalityObject.js").bindToInstance(causality);
const {CausalityObject, cachedCallCount} = causality.causalityObject; 


const {create,resetObjectIds,observeAll, transaction} = require("../causality.js").instance();
const assert = require('assert');

describe("Projections", function(){
  var listNodePrototype = {
    last : function() {
      if (this.next == null) {
        return this;
      } else {
        return this.next.last();
      }
    }
  };

  var createListNode = function(value, cacheId) {
    const newNode = Object.create(listNodePrototype);
    newNode.value = value;
    newNode.next = null;
    newNode.previous = null;

    return create(newNode, cacheId);
    // return create({ // This code somehow generates set events for last. This might have to do with Node.js internals... 
    //     value : value,
    //     next: null,
    //     previous: null,
    //     last : function() {
    //         if (this.next == null) {
    //             return this;
    //         } else {
    //             return this.next.last();
    //         }
    //     }
    // });
  };

  var createTransparentListNode = function(value, cacheId) {
    return create({value : value}, cacheId);
  };

  var createListHead = function(cacheId) {
    return create({
      first: null,
      last: null
    }, cacheId);
  };


  class TreeNode extends CausalityObject {
    constructor(value, children) {
      super()
      this.value = value; 
      this.children = children;
    }

    flattenArrayPreOrder() {
      let result = create([], this.__id + "_array");
      result.push(create({value: this.value}, this.__id + "_node"));

      this.children.forEach(function(child) {
        let childList = child.flattenArrayPreOrder();
        result.push.apply(result, childList);
      });

      return result;
    }

    flattenArrayPreOrderRecursive() {
      // console.log("flattenArrayPreOrderRecursive " + this.__id + "_array");
      let result = create([], this.__id + "_array");
      result.push(create({value: this.value}, this.__id + "_node"));

      this.children.forEach(function(child) {
        let childList = child.reCached('flattenArrayPreOrderRecursive');
        result.push.apply(result, childList);
      });

      return result;
    }

    flattenLinkedPreOrder() {
      let firstNode = createListNode(this.value, this.__id + "_list");
      let node = firstNode;

      this.children.forEach(function(child) {
        // child.reCachedInCache('flattenLinkedPreOrder');
        let childList = child.flattenLinkedPreOrder();
        node.next = childList;
        childList.previous = node;
        node = childList.last();
      });

      return firstNode;
    }

    flattenLinkedPreOrderRecursive() {
      // console.log("flattenLinkedPreOrderRecursive " + this.__id + "_head");
      let listHead = createListHead(this.__id + "_head");
      let firstNode = createTransparentListNode(this.value, this.__id + "_node");

      listHead.first = firstNode;
      // firstNode.previous = null;

      let node = firstNode;

      this.children.forEach(function(child) {
        // child.reCachedInCache('flattenLinkedPreOrder');
        let childList = child.reCached('flattenLinkedPreOrderRecursive');
        // console.log("linking next and previous together" + node.__id +  " -> " + childList.first.__id);
        node.next = childList.first;
        childList.first.previous = node;
        node = childList.last;
      });
      // node.next = null; // To be sure
      listHead.last = node;

      return listHead;
    }
  };

  it("Testing just flattening", function(){
    var tree = new TreeNode(1, [
      new TreeNode(2, [
        new TreeNode(3, []),
        new TreeNode(4, [])
      ]),
      new TreeNode(5, [
        new TreeNode(6, []),
        new TreeNode(7, [])
      ])
    ]);

    var flattened = tree.flattenLinkedPreOrder();
    // console.log(flattened);
    var number = 1;
    assert.equal(flattened.value, number++);
    while(flattened.next !== null) {
      flattened = flattened.next;
      assert.equal(flattened.value, number++);
    }
  });

  // it("Testing non-recursive projection, linked list version", function(){
  //   resetObjectIds();
  //   var tree = new TreeNode(1, [
  //     new TreeNode(2, [
  //       new TreeNode(3, []),
  //       new TreeNode(4, [])
  //     ]),
  //     new TreeNode(5, [
  //       new TreeNode(6, []),
  //       new TreeNode(7, [])
  //     ])
  //   ]);

  //   var flattened = tree.reCached('flattenLinkedPreOrder');

  //   // Assert original shape
  //   var expectedValues = [1, 2, 3, 4, 5, 6, 7];
  //   var flattenedNode = flattened;
  //   assert.equal(flattenedNode.value, expectedValues.shift());
  //   while(flattenedNode.next !== null) {
  //     flattenedNode = flattenedNode.next;
  //     assert.equal(flattenedNode.value, expectedValues.shift());
  //   }

  //   // Observe all
  //   let detectedEvents = [];
  //   flattenedNode = flattened;
  //   let observedNodes = [];
  //   observedNodes.push(flattenedNode);
  //   while(flattenedNode.next !== null) {
  //     flattenedNode = flattenedNode.next;
  //     observedNodes.push(flattenedNode);
  //   }
  //   observeAll(observedNodes, function(event) {
  //     console.log("event!")
  //     detectedEvents.push(event);
  //   });

  //   // Update tree
  //   // console.log("Update tree");
  //   tree.children[0].children.push(new TreeNode(4.5, []));

  //   // Assert eventws
  //   assert.equal(detectedEvents[0].type, 'set');
  //   assert.equal(detectedEvents[0].property, 'next');
  //   assert.equal(detectedEvents[0].newValue.value, 4.5);
  //   assert.equal(detectedEvents[0].newValue.__cacheId, '23_list');
  //   assert.equal(detectedEvents[0].oldValue.value, 5);
  //   assert.equal(detectedEvents[0].oldValue.__cacheId, '12_list');
  //   assert.equal(detectedEvents[0].objectId, 18);
  //   assert.equal(detectedEvents[1].type, 'set');
  //   assert.equal(detectedEvents[1].property, 'previous');
  //   assert.equal(detectedEvents[1].newValue.value, 4.5);
  //   assert.equal(detectedEvents[1].newValue.__cacheId, '23_list');
  //   assert.equal(detectedEvents[1].oldValue.value, 4);
  //   assert.equal(detectedEvents[1].oldValue.__cacheId, '4_list');
  //   assert.equal(detectedEvents[1].objectId, 19);

  //   // Assert updated
  //   expectedValues = [1, 2, 3, 4, 4.5, 5, 6, 7];
  //   flattenedNode = flattened;
  //   assert.equal(flattenedNode.value, expectedValues.shift());
  //   while(flattenedNode.next !== null) {
  //     flattenedNode = flattenedNode.next;
  //     assert.equal(flattenedNode.value, expectedValues.shift());
  //   }
  // });

  // it("Testing non-recursive projection, array version", function(){
  //   resetObjectIds();
  //   var tree = new TreeNode(1, [
  //     new TreeNode(2, [
  //       new TreeNode(3, []),
  //       new TreeNode(4, [])
  //     ]),
  //     new TreeNode(5, [
  //       new TreeNode(6, []),
  //       new TreeNode(7, [])
  //     ])
  //   ]);

  //   var flattened = tree.reCached('flattenArrayPreOrder');

  //   // Assert original shape
  //   assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 5, 6, 7]);

  //   // Observe array
  //   let detectedEvents = [];
  //   flattened.observe(function(event) {
  //     detectedEvents.push(event);
  //   });

  //   // Update tree
  //   // console.log("=======================================================");
  //   tree.children[0].children.push(new TreeNode(4.5, []));
  //   // console.log("=======================================================");

  //   // Assert eventws
  //   const expected1 = [
  //     { type: 'splice',
  //       index: 4,
  //       removed: [],
  //       added: [ { value: 4.5 } ],
  //       objectId: 15 } ];
  //   expected1[0].object = flattened;
  //   assert.deepEqual(detectedEvents, expected1 );

  //   // Assert updated
  //   assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 4.5, 5, 6, 7]);
  // });


  // it("Testing recursive projection, array version", function( done ){
  //   resetObjectIds();
  //   var tree = new TreeNode(1, [
  //     new TreeNode(2, [
  //       new TreeNode(3, []),
  //       new TreeNode(4, [])
  //     ]),
  //     new TreeNode(5, [
  //       new TreeNode(6, []),
  //       new TreeNode(7, [])
  //     ])
  //   ]);

  //   var flattened = tree.reCached('flattenArrayPreOrderRecursive');

  //   // Assert original shape
  //   assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 5, 6, 7]);

  //   // Observe array
  //   let detectedEvents = [];
  //   flattened.observe(function(event) {
  //     detectedEvents.push(event);
      
  //     // Assert eventws
  //     const expected1 = [
  //       { type: 'splice',
  //         index: 4,
  //         removed: [],
  //         added: [ { value: 4.5 } ],
  //         objectId: 15 } ];
  //     expected1[0].object = flattened;
  //     assert.deepEqual(detectedEvents, expected1 );
      
  //     // Assert updated
  //     assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 4.5, 5, 6, 7]);
  //     done();

  //   });

  //   // Update tree
  //   tree.children[0].children.push(new TreeNode(4.5, []));

  // });


  // it("Testing recursive projection, linked list version", function( done ){
  //   resetObjectIds();
  //   var tree = new TreeNode(1, [
  //     new TreeNode(2, [
  //       new TreeNode(3, []),
  //       new TreeNode(4, [])
  //     ]),
  //     new TreeNode(5, [
  //       new TreeNode(6, []),
  //       new TreeNode(7, [])
  //     ])
  //   ]);

  //   var flattened = tree.reCached('flattenLinkedPreOrderRecursive');

  //   // Assert original shape
  //   var expectedValues = [1, 2, 3, 4, 5, 6, 7];
  //   var flattenedNode = flattened.first;
  //   assert.equal(flattenedNode.value, expectedValues.shift());
  //   while(typeof(flattenedNode.next) !== 'undefined') {
  //     flattenedNode = flattenedNode.next;
  //     assert.equal(flattenedNode.value, expectedValues.shift());
  //   }

  //   // Observe all
  //   let detectedEvents = [];
  //   flattenedNode = flattened.first;
  //   let observedNodes = [];
  //   observedNodes.push(flattenedNode);
  //   while(typeof(flattenedNode.next) !== 'undefined') {
  //     flattenedNode = flattenedNode.next;
  //     observedNodes.push(flattenedNode);
  //   }
  //   observeAll(observedNodes, function(event) {
  //     detectedEvents.push(event);

  //     if( !detectedEvents[1] ) return;
      
  //     // Assert eventws
  //     assert.equal(detectedEvents[0].type, 'set');
  //     assert.equal(detectedEvents[0].property, 'next');
  //     assert.equal(detectedEvents[0].newValue.value, 4.5);
  //     assert.equal(detectedEvents[0].newValue.__cacheId, '30_node');
  //     assert.equal(detectedEvents[0].oldValue.value, 5);
  //     assert.equal(detectedEvents[0].oldValue.__cacheId, '12_node');
  //     assert.equal(detectedEvents[0].objectId, 22);
  //     assert.equal(detectedEvents[1].type, 'set');
  //     assert.equal(detectedEvents[1].property, 'previous');
  //     assert.equal(detectedEvents[1].newValue.value, 4.5);
  //     assert.equal(detectedEvents[1].newValue.__cacheId, '30_node');
  //     assert.equal(detectedEvents[1].oldValue.value, 4);
  //     assert.equal(detectedEvents[1].oldValue.__cacheId, '4_node');
  //     assert.equal(detectedEvents[1].objectId, 24);

  //     // Assert updated
  //     expectedValues = [1, 2, 3, 4, 4.5, 5, 6, 7];
  //     flattenedNode = flattened.first;
  //     assert.equal(flattenedNode.value, expectedValues.shift());
  //     while(typeof(flattenedNode.next) !== 'undefined') {
  //       flattenedNode = flattenedNode.next;
  //       assert.equal(flattenedNode.value, expectedValues.shift());
  //     }

  //     done();
  //   });

  //   // Update tree
  //   transaction(function() {
  //     tree.children[0].children.push(new TreeNode(4.5, []));
  //   });

  // });
});

// let cnt = 0;
// const state = create({});
// let out = {};
//
// repeatOnChange(function(){
//     // console.log("=== Reevaluate ===");
//     cnt++;
//     for( let key in state ){
//         if( state[key].hobby ){
//             out[key] = state[key].hobby.length;
//         }
//     }
//     // console.log("=== finished ===");
// });
//
