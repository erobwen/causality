const assert = require('assert');
require('../causality').install();

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

    var createListNode = function(value) {
        newNode = Object.create(listNodePrototype);
        newNode.value = value;
        newNode.next = null;
        newNode.previous = null;

        return create(newNode);
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

    var createTreeNode = function(value, children) {
        return create({
            flattenLinkedPreOrder : function() {
                let firstNode = createListNode(this.value);
                firstNode.__infusionId  = this.__id + "_list";
                let node = firstNode;

                this.children.forEach(function(child) {
                    // child.projectInProjection('flattenLinkedPreOrder');
                    let childList = child.flattenLinkedPreOrder();
                    node.next = childList;
                    childList.previous = node;
                    node = childList.last();
                });

                return firstNode;
            },
            value : value,
            children : create(children)
        });
    };

    it("Testing just flattening", function(){
        var tree = createTreeNode(1, [
            createTreeNode(2, [
                createTreeNode(3, []),
                createTreeNode(4, [])
            ]),
            createTreeNode(5, [
                createTreeNode(6, []),
                createTreeNode(7, [])
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

    it("Testing non-recursive projection", function(){
        resetObjectIds();
        var tree = createTreeNode(1, [
            createTreeNode(2, [
                createTreeNode(3, []),
                createTreeNode(4, [])
            ]),
            createTreeNode(5, [
                createTreeNode(6, []),
                createTreeNode(7, [])
            ])
        ]);

        var flattened = tree.project('flattenLinkedPreOrder');

        // Assert original shape
        var expectedValues = [1, 2, 3, 4, 5, 6, 7];
        var flattenedNode = flattened;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(flattenedNode.next !== null) {
            flattenedNode = flattenedNode.next;
            assert.equal(flattenedNode.value, expectedValues.shift());
        }

        // Observe all
        let detectedEvents = [];
        flattenedNode = flattened;
        let observedNodes = [];
        observedNodes.push(flattenedNode);
        while(flattenedNode.next !== null) {
            flattenedNode = flattenedNode.next;
            observedNodes.push(flattenedNode);
        }
        observeAll(observedNodes, function(event) {
            detectedEvents.push(event);
        });

        // Update tree
        // console.log("Update tree");
        tree.children[0].children.push(createTreeNode(4.5, []));

        // Assert eventws
        assert.equal(detectedEvents[0].type, 'set');
        assert.equal(detectedEvents[0].property, 'next');
        assert.equal(detectedEvents[0].newValue.value, 4.5);
        assert.equal(detectedEvents[0].newValue.__infusionId, '23_list');
        assert.equal(detectedEvents[0].oldValue.value, 5);
        assert.equal(detectedEvents[0].oldValue.__infusionId, '12_list');
        assert.equal(detectedEvents[0].objectId, 18);
        assert.equal(detectedEvents[1].type, 'set');
        assert.equal(detectedEvents[1].property, 'previous');
        assert.equal(detectedEvents[1].newValue.value, 4.5);
        assert.equal(detectedEvents[1].newValue.__infusionId, '23_list');
        assert.equal(detectedEvents[1].oldValue.value, 4);
        assert.equal(detectedEvents[1].oldValue.__infusionId, '4_list');
        assert.equal(detectedEvents[1].objectId, 19);

        // Assert updated
        expectedValues = [1, 2, 3, 4, 4.5, 5, 6, 7];
        flattenedNode = flattened;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(flattenedNode.next !== null) {
            flattenedNode = flattenedNode.next;
            assert.equal(flattenedNode.value, expectedValues.shift());
        }
    });
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
