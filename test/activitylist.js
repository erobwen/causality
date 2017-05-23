const assert = require('assert');
const requireUncached = require('require-uncached');
let causality = requireUncached('../causality');
causality.setConfiguration({objectActivityList : true, mirrorRelations: true});
let create = causality.create;

let mirror = require('../mirror');

// let x = create();
// let y = create();
// let z = create();

// x.fooX = 3;
// y.fooY = 31;

// z.fumZ = 3;
// console.log(causality.getActivityListFirst());

// x.f = 3;
// console.log(causality.getActivityListFirst());

// let zome = y.fooY;
// console.log(causality.getActivityListFirst());


describe("Activity list", function(){
    it("Testing activity list starts with last touched objects", function(){
		let x = create({id : "x"});
		let y = create({id : "y"});
		let z = create({id : "z"});

		x.fooX = 3;
		y.fooY = 31;
		z.fumZ = 3;
		assert.equal("z", causality.getActivityListFirst().id);

		x.f = 3;
		assert.equal("x", causality.getActivityListFirst().id);

		let zome = y.fooY;
		assert.equal("y", causality.getActivityListFirst().id);
	});
});	