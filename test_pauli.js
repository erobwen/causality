require('./causality').install();

// var r = create({U: 0, I: 0, R: 0});
//
// repeatOnChange(function(){
//     r.U = r.R * r.I;
//     r.R = 5;
// //    if (r.I) r.R = r.U / r.I;
// //    if (r.R) r.I = r.U / r.R;
// });
// console.log(r.R);
// r.R = 2; r.I = 3;
//
// console.log(r.U);
//
//
//
//
//
// var r = create({U: 0, I: 0, R: 0});
// repeatOnChange(function(){
//     if (r.R && r.I) { r.U = r.R * r.I; console.log("loopar"); }
//     if (r.U && r.I) r.R = parseInt(r.U) / parseInt(r.I);
// });
// console.log(r.U + ", " + r.I + ", " + r.R);
// r.R = 0;
// console.log(r.U + ", " + r.I + ", " + r.R);
// r.U = 6;
// console.log(r.U + ", " + r.I + ", " + r.R);
// r.I = 3;
// console.log(r.U + ", " + r.I + ", " + r.R);
//

// repeatOnChange(function(){
//     if (r.R && r.I) r.U = r.R * r.I;
//     if (r.U && r.I) r.R = r.U / r.I;
//     if (r.U && r.R) r.I = r.U / r.R;
// });
var r = create({U: NaN, I: NaN, R: NaN});

repeatOnChange(function(){
    // console.log("== repeat ==");
    r.U = r.R * r.I;
    r.R = r.U / r.I;
    r.I = r.U / r.R;
    // console.log(r.U);
    // console.log(r.R);
    // console.log(r.I);
    // console.log("== end ==");
});

r.U = 6;
//r.I = 3;
r.R = 2;

console.log(r.U + ', ' + r.I + ', ' + r.R); //6, 3, 2