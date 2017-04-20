const assert = require('assert');
require('../causality').install();
const log = console.log.bind(console);


function indentString(level) {
	let string = "";
	while (level-- > 0) {
		string = string + "  ";
	}
	return string;
}
 
function logPattern(entity, pattern, indentLevel) {
	if (typeof(entity) !== 'object') {
		let entityString = "";
		if (typeof(entity) === 'function') {
			entityString = "function( ... ) { ... }";				
		} else {
			entityString = entity;				
		}
		process.stdout.write(entityString + "\n"); 
	} else {
		if (pattern === undefined) {
			process.stdout.write("{...}\n"); 
		} else {
			if (typeof(indentLevel) === 'undefined') {
				indentLevel = 0;
			}
			let indent = indentString(indentLevel);

			console.log(indent + "{");
			for (p in entity) {
				process.stdout.write(indent + "   " + p + " : "); 
				logPattern(entity[p], pattern[p], indentLevel + 1);
			}
			console.log(indent + "}");
		}
	}
}

function logRoot(object, pattern) {
	console.log("{");
	for (p in object) {
		if (typeof(object[p]) === 'object') {
			console.log("   " + p + " : {...}");
		} else if (typeof(object[p]) === 'function') {
			console.log("   " + p + " : function( ... ) { ... }");				
		} else {
			console.log("   " + p + " : " + object[p]);				
		}
	}
	console.log("}");
}
	 


class MyCausalityClass {
	constructor( myid ){
		this.propA = myid;
		this.propB = 0;
		return create( this );
	}

	dostuff()
	{
		return 33;
	}
}
let pattern = { _propertyObservers : { dostuff: {}, propA: {}}};

const x = new MyCausalityClass( 11 );
let z;
log("repeating");
repeatOnChange(function () {
	// z = x.propA + 33;
	// logPattern(x.__handler, pattern);
	let a = x.propA;
	// logPattern(x.__handler, pattern);
	let b = x.dostuff();
	// logPattern(x.__handler, pattern);
	z = a + b;
});
log("finished set up repeater");

log(z);

// x.propC = 100;

// log(z);
x.propA = 2;

log(z);
// logPattern(x.__handler, pattern);
// log(x.__handler);
// log(x.__target);
// log(Object.getPrototypeOf(x.__target));
