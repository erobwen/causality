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
            children : children
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
        // console.log(flattened);
        var number = 1;
        assert.equal(flattened.value, number++);
        while(flattened.next !== null) {
            flattened = flattened.next;
            assert.equal(flattened.value, number++);
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
