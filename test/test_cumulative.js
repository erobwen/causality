require('../causality').install();
setCumulativeAssignment(true);


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
// var r = create({U: NaN, I: NaN, R: NaN});
//
// repeatOnChange(function(){
//     r.U = r.R * r.I;
//     r.R = r.U / r.I;
//     r.I = r.U / r.R;
// });
//
// console.log("Setting U");
// r.U = 6;
// console.log(r.U + ', ' + r.I + ', ' + r.R); //6, NaN, NaN
// console.log();
// //r.I = 3;
// console.log("Setting R");
// r.R = 2;
//
// console.log(r.U + ', ' + r.I + ', ' + r.R); //6, 3, 2
// console.log();
//
//
//
//
//
//
// console.log("Unsetting R");
// r.R = NaN;
// console.log(r.U + ', ' + r.I + ', ' + r.R); //6, 3, 2
// console.log();
//
//
// console.log("Unsetting R & U consecutive (will just repair the unset value)");
// r.R = NaN;
// r.U = NaN;
// console.log(r.U + ', ' + r.I + ', ' + r.R); //6, 3, 2
// console.log();
//
//
//
// console.log("Unsetting R & U in transaction");
// transaction(function() {
//     r.R = NaN;
//     r.U = NaN;
// });
// console.log(r.U + ', ' + r.I + ', ' + r.R); //NaN, 3, NaN
// console.log();


var r = create({U: NaN, I: NaN, R: NaN});
repeatOnChange(function(){
    r.U = r.R * r.I;
    r.R = r.U / r.I;
    r.I = r.U / r.R;
});

r.U = 6; r.I = 3; r.R = NaN;
console.log(r.U + ', ' + r.I + ', ' + r.R);
//r.R == 2

transaction(function() {
    r.U = 6;
    r.I = NaN;
    r.R = 3;
});
console.log(r.U + ', ' + r.I + ', ' + r.R);
//r.U == 6, r.I == 2, r.R == 3