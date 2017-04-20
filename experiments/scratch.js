const assert = require('assert');
require('../causality').install();
const log = console.log.bind(console);

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

const x = new MyCausalityClass( 11 );
let z;
log("repeating");
repeatOnChange(function () {
	// z = x.propA + 33;
	let a = x.propA;
	let b = x.dostuff();
	z = a + b;
});
log("finished set up repeater");

log(z);

// x.propC = 100;

// log(z);

x.propA = 2;

log(z);
// log(x.propA);