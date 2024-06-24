import { getWorld } from "../causality.js";
const { repeatOnChange, clearRepeaterLists } = getWorld()

var x;
var start, end, time;

// Test 100k observers on array
start = new Date().getTime();
//
// x = o(['a']);
// var index = 0;
// while(index++ < 100000) {
//     repeatOnChange(function() {
//         var y = x[x.length - 1];
//     });
// }
// x.push('b');
//
// end = new Date().getTime();
// time = (end - start);
// console.log(time);



// Test 100k observers on object
start = new Date().getTime();

x = o({z: 5});
var index;

index = 0;
while(index++ < 500000) {
    repeatOnChange(function() {
        var y = x.z; // necessary....
    });
}
// x.z = 10;

end = new Date().getTime();
time = (end - start);
console.log(time);
console.log("fin");

console.log("=============================================");
clearRepeaterLists();
// Test 100k sources for repeater
start = new Date().getTime();

var s = [];
index = 0;
while(index++ < 500000) {
    s.push(o({w: 42}));
}
console.log(s.length);
// startTrace();
console.log("Finished building list");
repeatOnChange(function() {
    var sum = 100;
    var index = 0;
    let i = 0;
    console.log(index);
    s.forEach(function(source) {
        // startTrace();
        // console.log("a");
        //  console.time("source.w");
        sum += source.w;
        // console.timeEnd("source.w");
        index++;
        // console.log(index++);
    });
    console.log(index);
    var y = sum;
    console.log("finished");
});
console.log("Established repeaters, now changing");
s[0].w = 10;

end = new Date().getTime();
time = (end - start);
console.log(time);
