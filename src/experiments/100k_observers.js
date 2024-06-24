import mobx from "mobx"; 
import { getWorld } from "../causality.js";
const { observable } = getWorld()

const log = console.log.bind(console);
log("100k observers performance");
var amount = 100000;
// var amount = 10;

/******************************************************************/

console.time("causality");
count = 0;
mylist = [];
while( mylist.length < amount ){
    var obj = {
        name: "Bert",
        birth: new Date(1980,5,5),
        hobby: observable(['causality', 'muffins']),
    };
    var xobj = observable(obj);
    mylist.push(xobj);

    repeatOnChange(function(){
        count += xobj.hobby.length;
    });
}
// transaction(function() {
for( let element of mylist ){
    // console.time("element");
    element.hobby.push('drapes');
    // console.timeEnd("element");
}
// });
console.timeEnd("causality");
log( count );


/******************************************************************/

console.time("mobx");
count = 0;
mylist = [];
while( mylist.length < amount ){
    var obj = {
        name: "Bert",
        birth: new Date(1980,5,5),
        hobby: ['causality', 'muffins'],
    };
    var xobj = mobx.observable(obj);
    mylist.push(xobj);

    mobx.autorun(function(){
        count += xobj.hobby.length;
    });
}
for( let element of mylist ){
    element.hobby.push('drapes');
}
console.timeEnd("mobx");
log( count );

//
// var source = observable([23, 4, 6]);
// var i = 0;
// while (i++ < 30) {
//     console.log("Install repeater" + i);
//     repeatOnChange(function() {
//         var sum = 0;
//         source.forEach(function(number) {
//             sum += number;
//         });
//     });
// }
// console.log("=============================")
// source.push(5);