const assert = require('assert');
let causality = require('../causality')({
	objectActivityList : true, 
	useIncomingStructures: true, 
	recordPulseEvents : true
});
causality.addPostPulseAction(postPulse);


let create = causality.create;
let isObject = causality.isObject;
let transaction = causality.transaction;


// let incoming = require('../incoming');
let pulseEvents = null
function postPulse(events) {
	pulseEvents = events;
}

describe("Post pulse events etc", function(){
    it("Check post pulse events", function(){
		let x = create({id : "x"});
		let y = create({id : "y"});
		let z = create({id : "z"});

		transaction(function() {
			x.fooX = 3;
			y.fooY = 31;
			z.fumZ = 3;			
		});
		assert.equal(6, pulseEvents.length);
		assert.equal('set', pulseEvents[0].type);
		assert.equal('fooX', pulseEvents[0].property);
	});

    it("should distinguish between causality objects and other things", function(){
		let x = create({id : "x"});
		let y = { id : "y" };
		let z = 1;

		assert.equal(true, isObject(x));
		assert.equal(false, isObject(y));
		assert.equal(false, isObject(z));
	});
	
	it("should be possible to use initializers", function(){
		function initializer(object) {
			object.foobar = 42;
		}
		let x = create(initializer);

		assert.equal(42, x.foobar);
		x.foobar = 1942;
		x.const.initializer = initializer;
		assert.equal(42, x.foobar);
	});
});	