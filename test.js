require('./causality').install();


/**********************************
 *  Testing
 *
 **********************************/

console.log("");
console.log("Test uponChangeDo:");
console.log("Setup...");
var x = create({propA: 11});
var y = create({propB: 11, propC: 100});
var z;
uponChangeDo(function(){
    z = x.propA + y.propB;
}, function() {
    z = 'invalid';
});
console.log(z == 22);
console.log("Run tests...")
y.propC = 10;
console.log(z == 22);
y.propB = 2;
console.log(z == 'invalid');



console.log("");
console.log("Test repeatOnChange:");
console.log("Setup...");
y.propB = 11;
repeatOnChange(function(){
    z = x.propA + y.propB;
});
console.log(z == 22);
console.log("Run tests...")
y.propC = 100;
console.log(z == 22);
y.propB = 2;
console.log(z == 13);
x.propA = 2;
console.log(z == 4);



console.log("");
console.log("Testing a heap structure:");
console.log("Setup...");
function buildHeap(value) {
    var childrenStartValue = value - 5;
    var childrenCount = 0;
    var children = c([]);
    while(childrenCount <= 3) {
        var childValue = childrenStartValue--;
        if (childValue > 0) {
            children.push(buildHeap(childValue));
        }
        childrenCount++;
    }
    return c({
        value : value,
        children : children
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
    heap.children.forEach(function(child) {
        childSum += summarize(child);
    });
    return heap.value + childSum;
}
function nodeCount(heap) {
    var childSum = 0;
    heap.children.forEach(function(child) {
        childSum += summarize(child);
    });
    return 1 + childSum;
}
var heap = buildHeap(14);
var heapSum = 0;
repeatOnChange(function() {
    heapSum = summarize(heap);
    heapNodeCount = nodeCount(heap);
});
console.log(heapSum == 64);
getLastChild(heap).value += 100;
console.log(heapSum == 164);


var lastChild = getLastChild(heap);
lastChild.children.push(buildHeap(1));
lastChild.children.push(buildHeap(1));
lastChild.children.push(buildHeap(1));
lastChild.children.push(buildHeap(1));
console.log(heapSum == 168);

lastChild.children[lastChild.children.length - 1] = buildHeap(2);
console.log(heapSum == 169);

console.log(heap);
console.log("Finished!");