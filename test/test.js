require = require("esm")(module);
const {create,uponChangeDo,repeatOnChange,c} = require("../causality.js");
// console.log(causality);
// import {create,uponChangeDo,repeatOnChange,c} from "../causality.js";
const assert = require('assert');

describe("uponChangeDo:", function () {

    let cnt = 0;
    const x = create({propA: 11});
    const y = create({propB: 11, propC: 100});
    let z;
    uponChangeDo(function () {
        z = x.propA + y.propB;
    }, function () {
        cnt++;
        z = 'invalid';
    });

    it('doFirst', function () {
        assert.equal(z, 22);
    });

    it('not trigger', function () {
        y.propC = 10;
        assert.equal(cnt, 0);
    });

    it('doAfterChange', function () {
        y.propB = 2;
        assert.equal(z, 'invalid');
        assert.equal(cnt, 1);
    });

});


describe("repeatOnChange:", function () {

    let cnt = 0;
    const x = create({propA: 11});
    const y = create({propB: 11, propC: 100});
    let z;

    repeatOnChange(function () {
        cnt++;
        z = x.propA + y.propB;
    });

    it('shold do action', function () {
        assert.equal(z, 22);
    });

    it('not trigger', function () {
        y.propC = 100;
        assert.equal(cnt, 1);
    });

    it('trigger', function () {
        y.propB = 2;
        assert.equal(z, 13);

        x.propA = 2;
        assert.equal(z, 4);
    });

});


describe("heap structure", function () {

    function buildHeap(value) {
        var childrenStartValue = value - 5;
        var childrenCount      = 0;
        var children           = c([]);
        while (childrenCount <= 3) {
            var childValue = childrenStartValue--;
            if (childValue > 0) {
                children.push(buildHeap(childValue));
            }
            childrenCount++;
        }
        return c({
            value: value,
            children: children
        });
    }

    function getLastChild(heap) {
        if (heap.children.length === 0) {
            return heap;
        } else {
            return getLastChild(heap.children[heap.children.length - 1]);
        }
    }

    function summarize(heap) {
        var childSum = 0;
        heap.children.forEach(function (child) {
            childSum += summarize(child);
        });
        return heap.value + childSum;
    }

    function nodeCount(heap) {
        var childSum = 0;
        heap.children.forEach(function (child) {
            childSum += summarize(child);
        });
        return 1 + childSum;
    }

    var heap    = buildHeap(14);
    var heapSum = 0;

    repeatOnChange(function () {
        heapSum       = summarize(heap);
        var heapNodeCount = nodeCount(heap);
    });

    it('heapSum', function () {
        assert.equal(heapSum, 64);
    });

    it('trigger on modification', function () {
        getLastChild(heap).value += 100;
        assert.equal(heapSum, 164);
    });

    var lastChild;

    it('push on children', function () {
        lastChild = getLastChild(heap);
        lastChild.children.push(buildHeap(1));
        lastChild.children.push(buildHeap(1));
        lastChild.children.push(buildHeap(1));
        lastChild.children.push(buildHeap(1));
        assert.equal(heapSum, 168);
    });

    it('replace in the middle', function () {
        lastChild.children[lastChild.children.length - 1] = buildHeap(2);
        assert.equal(heapSum, 169);
    });

});
