'use strict';
const assert = require('assert');
require('./causalityBasic').install();


describe("Test cached functions", function(){
    function buildHeap(value) {
        var childrenStartValue = value - 5;
        var childrenCount = 0;
        var children = c([]);
        while(childrenCount < 3) {
            var childValue = childrenStartValue;
            if (childValue > 0) {
                children.push(buildHeap(childValue));
            }
            childrenCount++;
        }
        return c({
            summarize : function() {
                // console.log("summarize!");
                var childSum = 0;
                this.children.forEach(function(child) {
                    childSum += child.const.cachedInCache('summarize');
                });
                return this.value + childSum;
            },
            getLastChild : function() {
                if (this.children.length === 0) {
                    return this;
                } else {
                    return this.children[this.children.length - 1].getLastChild();
                }
            },
            nodeCount : function() {
                var childSum = 0;
                this.children.forEach(function(child) {
                    childSum += child.nodeCount();
                });
                return 1 + childSum;
            },
            value : value,
            children : children
        });
    }
    var heap = buildHeap(10);
    var heapSum = 0;
    var heapNodeCount = 0;

    it('Init', function () {
        assert.equal(cachedCallCount(), 0);
    });
    
    it('Test no extra call on normal call', function () {
        heap.summarize();
        assert.equal(cachedCallCount(), 0);
    });

    it('Test recursive cached call in repeater', function () {
        // console.log('======== Test recursive cached call in repeater ========');
        repeatOnChange(function() {
            // console.log('--- repeating');
            heapSum = heap.const.cached('summarize');
            // console.log('--- ');
        });
        // console.log('======== Finished Test recursive cached call in repeater ========');
        assert.equal(heapSum, 25);
        assert.equal(cachedCallCount(), 4);
        // console.log('//Test recursive cached call in repeater');
    });
    
    it('Test no extra call', function () {
        heap.const.cached('summarize');
        assert.equal(cachedCallCount(), 4);
    });
    
    it('Test minimal update of recursive cached call tree', function () {
        heap.getLastChild().value += 100;
        assert.equal(heapSum, 125);
        assert.equal(cachedCallCount(), 6);
    });
});
