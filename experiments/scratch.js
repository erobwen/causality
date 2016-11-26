const assert = require('assert');
require('../causality').install();
// var mobx = require('mobx');


// Array + exp
//
// var a = c([]);
// a.length = 4;
// console.log(a);
// a[1] = undefined;
// a[2] = null;
// console.log();
// console.log("a");
// console.log(a);
//
// console.log();
// console.log("a.slice()");
// console.log(a.slice());//, [, undefined, null,]);
//
// console.log();
// console.log("[, undefined, null,] + ''");
// console.log([, undefined, null,] + "");
//
// console.log();
// console.log("a + ''");
// console.log(a + "");


// // Test array insert remove
// var limit = 100000;
//
// console.time("arrayPushPop");
// var count = 0;
// var array = [];
// while(count++ < limit) {
//     array.push({message: "Foobar!"});
// }
// count = 0;
// while(count++ < limit) {
//     array.pop();
// }
// console.timeEnd("arrayPushPop");
//
//
// console.time("linkedList");
// var count = 0;
// var first = null;
// var last = null;
// while(count++ < limit) {
//     var element = {message: "Go for it!", next : null, previous: null};
//     if (last !== null) {
//         element.previous = last;
//         last.next = element;
//     }
//     if (first == null) {
//         first = element;
//     }
//     last = element;
// }
// count = 0;
// while(count++ < limit) {
//     var removed = first;
//     first = removed.next;
//     if (first !== null) {
//         first.previous = null;
//     }
// }
// console.timeEnd("linkedList");
//
//
// // console.time("arrayPushShift");
// // var count = 0;
// // var array = [];
// // while(count++ < limit) {
// //     array.push({message: "Go for it!"});
// // }
// // count = 0;
// // while(count++ < limit) {
// //     array.shift();
// // }
// // console.timeEnd("arrayPushShift");
// //
//
//
// console.time("for key in map");
// var count = 0;
// var map = {};
// while(count++ < limit) {
//     map[count] = {message: "Go for it!"};
// }
// count = 0;
// for(i in map) {
//     var element = map[i];
//     delete map[i];
// }
// console.timeEnd("for key in map");




var name = "name";
x = create({});
x.a = 1;
x['b'] = 2;
x[name] = 3;

console.log(x);