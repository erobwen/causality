function plainFoobar(x, y, z) {
	return x+y+x;
}

function initializeFoobar() {
	let a = true;
	let b = true;
	let c = true;
	let d = false;
	let e = false;

	return function(x, y, z) {
		if (a) {
			x = x * 2;
		}
		if (b) {
			x = x * 3;
		}
		if (c) {
			x = x;
		}
		if (d) {
			x = x;
		}
		if (e) {
			x = x;
		}
		return x+y+z;
	}
}

let foobar, count; 


foobar = plainFoobar;
console.time("plainFoobar");
count = 0;
while( count++ < 50000 ){
	foobar();
}
console.timeEnd("plainFoobar");

foobar = initializeFoobar();
console.time("initializedFoobar");
count = 0;
while( count++ < 50000 ){
	foobar();
}
console.timeEnd("initializedFoobar");