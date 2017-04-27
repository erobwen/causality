

let x = { y : null, w:42};
let dummy = 42;


console.time("x.y === undefined");
count = 1000000
while (count-- > 0) {
	if (x.y !== undefined) {
		dummy = count;
	}
	if (x.z === undefined) {
		dummy = count;
	}
}
console.timeEnd("x.y === undefined");


console.time("typeof(x.y) === 'undefined'");
count = 1000000
while (count-- > 0) {
	if (typeof(x.y) !== 'undefined') {
		dummy = count;
	}
	if (typeof(x.z) === 'undefined') {
		dummy = count;
	}
}
console.timeEnd("typeof(x.y) === 'undefined'");


/**
*  Null check vs undefined check. 
*/



console.time("Undefined check");
count = 1000000
while (count-- > 0) {
	if (typeof(x.v) === 'undefined') {
		dummy = count;
	}
	if (typeof(x.w) !== 'undefined') {
		dummy = count;
	}
}
console.timeEnd("Undefined check");


console.time("Null check");
count = 1000000
while (count-- > 0) {
	if (x.y === null) {
		dummy = count;
	}
	if (x.w !== null) {
		dummy = count;
	}
}
console.timeEnd("Null check");
