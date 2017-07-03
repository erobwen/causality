const assert = require('assert');
// const requireUncached = require('require-uncached');

let causality = require('../causality')({objectActivityList : true, useIncomingStructures: true});
let create = causality.create;

// let incoming = require('../incoming');

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
		let x = create({name: "x"});
		let y = create({name: "y"});
		let z = create({name: "z"});

		x.fooX = 3;
		y.fooY = 31;
		z.fumZ = 3;
		assert.equal("z", causality.getActivityListFirst().name);

		x.f = 3;
		assert.equal("x", causality.getActivityListFirst().name);

		let zome = y.fooY;
		assert.equal("y", causality.getActivityListFirst().name);
	});
	
	
	it("should count incoming references", function(){
		causality.addRemovedLastIncomingRelationCallback(function(object) {
			// console.log("KILLING in the name of!... ");
			object.killed = true;
		});
		
		let x = create({name: "x"});
		let y = create({name: "y"});
		let z = create({name: "z"});
		// let z2 = create({name: "z2"});

		x.z = z;
		y.z = z;
		assert.equal(z.const.incomingReferencesCount, 2);
		
		// delete x.z;
		// delete y.z; //TODO: make it work!
		
		x.z = null;
		y.z = null;
		
		// x.z = z2;
		// y.z = z2;

		assert.equal(z.const.incomingReferences, 0);
		assert.equal(z.killed, true);
	});
});