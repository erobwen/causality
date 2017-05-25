
console.log("Hello world");
let x = {
	const : 123,
	y : { const : {}}
}

x.y.const.z = 42;

console.log(x.const);
console.log(x.y.const.z);

x.y.const.z = 32;
console.log(x.y.const.z);