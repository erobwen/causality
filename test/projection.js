const assert = require('assert');
require('../causality').install();

describe("Projections", function(){

    var createListNode = function(value) {
        return create({
            value : value,
            next: null,
            previous: null,
            last : function() {
                if (this.next == null) {
                    return this;
                } else {
                    return this.next.last();
                }
            }
        });
    };

    var createTreeNode = function(value, children) {
        return create({
            flattenPreOrder : function() {
                let firstNode = createListNode(this.value);
                firstNode.__infusionId  = this.__id + "_list";
                let node = firstNode;

                this.children.forEach(function(child) {
                    // child.projectInProjection('flattenPreOrder');
                    let childList = child.flattenPreOrder();
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

        var flattened = tree.flattenPreOrder();
        // console.log(flattened);
        var number = 1;
        assert.equal(flattened.value, number++);
        while(flattened.next !== null) {
            flattened = flattened.next;
            assert.equal(flattened.value, number++);
        }
    });

    it("Testing non-recursive projection", function(){
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

        var flattened = tree.project('flattenPreOrder');

        // Assert original shape
        var expectedValues = [1, 2, 3, 4, 5, 6, 7];
        var flattenedNode = flattened;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(flattenedNode.next !== null) {
            flattenedNode = flattenedNode.next;
            assert.equal(flattenedNode.value, expectedValues.shift());
        }

        // Update tree
        // console.log("Update tree");
        tree.children[0].children.push(createTreeNode(4.5, []));

        // flattenedNode = flattened;
        // flattenedNode.observe(function(event) {console.log(event)});
        // while(flattenedNode.next !== null) {
        //     flattenedNode = flattenedNode.next;
        //     flattenedNode.observe(function(event) {console.log(event)});
        // }

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
