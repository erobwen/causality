require('./causality').install();

console.log("");
console.log("Testing cached calls:");
console.log("Setup...");
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
            var childSum = 0;
            this.children.forEach(function(child) {
                childSum += child.cached('summarize');
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

// Test cached call in repeater
repeatOnChange(function() {
    heapSum = heap.cached('summarize');
});
console.log(heapSum == 25);
console.log(cachedCallCount() == 4);

// Test no extra call
heap.cached('summarize');
console.log(cachedCallCount() == 4);

// Test minimal update of tree
heap.getLastChild().value += 100;
console.log(heapSum == 125);
console.log(cachedCallCount() == 6);
