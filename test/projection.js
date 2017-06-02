const assert = require('assert');
let causality = require('./causalityBasic');
causality.install();

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


    var createTreeNode = function(value, children) {
        return create({
            flattenArrayPreOrder : function() {
                let result = create([], this.const.id + "_array");
                result.push(create({value: value}, this.const.id + "_node"));

                this.children.forEach(function(child) {
                    let childList = child.flattenArrayPreOrder();
                    result.push.apply(result, childList);
                });

                return result;
            },

            flattenArrayPreOrderRecursive : function() {
                // console.log("flattenArrayPreOrderRecursive " + this.const.id + "_array");
                let result = create([], this.const.id + "_array");
                result.push(create({value: value}, this.const.id + "_node"));

                this.children.forEach(function(child) {
                    let childList = child.const.reCached('flattenArrayPreOrderRecursive');
                    result.push.apply(result, childList);
                });

                return result;
            },

            flattenLinkedPreOrder : function() {
                let firstNode = createListNode(this.value, this.const.id + "_list");
                let node = firstNode;

                this.children.forEach(function(child) {
                    // child.const.reCachedInCache('flattenLinkedPreOrder');
                    let childList = child.flattenLinkedPreOrder();
                    node.next = childList;
                    childList.previous = node;
                    node = childList.last();
                });

                return firstNode;
            },

            flattenLinkedPreOrderRecursive : function() {
                // console.log("flattenLinkedPreOrderRecursive " + this.const.id + "_head");
                let listHead = createListHead(this.const.id + "_head");
                let firstNode = createTransparentListNode(this.value, this.const.id + "_node");

                listHead.first = firstNode;
                // firstNode.previous = null;

                let node = firstNode;

                this.children.forEach(function(child) {
                    // child.const.reCachedInCache('flattenLinkedPreOrder');
                    let childList = child.const.reCached('flattenLinkedPreOrderRecursive');
                    // console.log("linking next and previous together" + node.const.id +  " -> " + childList.first.const.id);
                    node.next = childList.first;
                    childList.first.previous = node;
                    node = childList.last;
                });
                // node.next = null; // To be sure
                listHead.last = node;

                return listHead;
            },

            value : value,
            children : create(children)
        });
    };

    it("Testing just flattening", function(){
		assert.equal(false, causality.getConfiguration().mirrorRelations);
		
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

    it("Testing non-recursive projection, linked list version", function(){
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

        var flattened = tree.const.reCached('flattenLinkedPreOrder');

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
        // console.log("===== Update tree =====");
        tree.children[0].children.push(createTreeNode(4.5, []));
		// console.log("===== Update tree =====");
				
        // Assert updated
        expectedValues = [1, 2, 3, 4, 4.5, 5, 6, 7];
        flattenedNode = flattened;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(flattenedNode.next !== null) {
            flattenedNode = flattenedNode.next;
            assert.equal(flattenedNode.value, expectedValues.shift());
        }
		
        // Assert eventws
        assert.equal(detectedEvents[0].type, 'set');
		assert.equal(detectedEvents[0].object.value, 4);
        assert.equal(detectedEvents[0].property, 'next');
        assert.equal(detectedEvents[0].newValue.value, 4.5);
        assert.equal(detectedEvents[0].oldValue.value, 5);

        assert.equal(detectedEvents[1].type, 'set');
		assert.equal(detectedEvents[1].object.value, 5);
        assert.equal(detectedEvents[1].property, 'previous');
        assert.equal(detectedEvents[1].newValue.value, 4.5);
        assert.equal(detectedEvents[1].oldValue.value, 4);
    });

    it("Testing non-recursive projection, array version", function(){
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

        var flattened = tree.const.reCached('flattenArrayPreOrder');

        // Assert original shape
        assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 5, 6, 7]);

        // Observe array
        let detectedEvents = [];
        flattened.const.observe(function(event) {
            detectedEvents.push(event);
        });

        // Update tree
        // console.log("=======================================================");
        tree.children[0].children.push(createTreeNode(4.5, []));
        // console.log("=======================================================");

        // Assert eventws
        assert.deepEqual(detectedEvents,
            [ { type: 'splice',
                index: 4,
                removed: [],
                added: [ { value: 4.5 } ],
                object: flattened } ]);

        // Assert updated
        assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 4.5, 5, 6, 7]);
    });


    it("Testing recursive projection, array version", function(){
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

        var flattened = tree.const.reCached('flattenArrayPreOrderRecursive');

        // Assert original shape
        assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 5, 6, 7]);

        // Observe array
        let detectedEvents = [];
        flattened.const.observe(function(event) {
            detectedEvents.push(event);
        });

        // Update tree
        tree.children[0].children.push(createTreeNode(4.5, []));

        // Assert eventws
        assert.deepEqual(detectedEvents,
            [ { type: 'splice',
                index: 4,
                removed: [],
                added: [ { value: 4.5 } ],
                object: flattened } ]);

        // Assert updated
        assert.deepEqual(flattened.map((object) => { return object.value; }), [1, 2, 3, 4, 4.5, 5, 6, 7]);
    });


    it("Testing recursive projection, linked list version", function(){
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

        var flattened = tree.const.reCached('flattenLinkedPreOrderRecursive');

        // Assert original shape
        var expectedValues = [1, 2, 3, 4, 5, 6, 7];
        var flattenedNode = flattened.first;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(typeof(flattenedNode.next) !== 'undefined') {
            flattenedNode = flattenedNode.next;
            assert.equal(flattenedNode.value, expectedValues.shift());
        }

        // Observe all
        let detectedEvents = [];
        flattenedNode = flattened.first;
        let observedNodes = [];
        observedNodes.push(flattenedNode);
        while(typeof(flattenedNode.next) !== 'undefined') {
            flattenedNode = flattenedNode.next;
            observedNodes.push(flattenedNode);
        }
        observeAll(observedNodes, function(event) {
            detectedEvents.push(event);
        });

        // Update tree
        transaction(function() {
            tree.children[0].children.push(createTreeNode(4.5, []));
        });

        // Assert eventws
        assert.equal(detectedEvents[0].type, 'set');
		assert.equal(detectedEvents[0].object.value, 4);
        assert.equal(detectedEvents[0].property, 'next');
        assert.equal(detectedEvents[0].newValue.value, 4.5);
        assert.equal(detectedEvents[0].oldValue.value, 5);

        assert.equal(detectedEvents[1].type, 'set');
		assert.equal(detectedEvents[1].object.value, 5);
        assert.equal(detectedEvents[1].property, 'previous');
        assert.equal(detectedEvents[1].newValue.value, 4.5);
        assert.equal(detectedEvents[1].oldValue.value, 4);

        // Assert updated
        expectedValues = [1, 2, 3, 4, 4.5, 5, 6, 7];
        flattenedNode = flattened.first;
        assert.equal(flattenedNode.value, expectedValues.shift());
        while(typeof(flattenedNode.next) !== 'undefined') {
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
