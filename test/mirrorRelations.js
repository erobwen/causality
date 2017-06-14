const assert = require('assert');
let causality = require('../causality')({mirrorRelations : true});
let create = causality.create;
let forAllIncoming = causality.forAllIncoming;
let log = require("../objectlog.js").log;


describe("Mirror Relations", function(){

    it("Testing mirror relation exists", function(){
		let x = create();
		let y = create();
		x.foo = y;

		// Analyze incoming structure
		let yIncomingFoo = []
		causality.forAllIncoming(y, 'foo', function(referer) {
			yIncomingFoo.push(referer);
		});

		assert.equal(yIncomingFoo[0], x);
    });
	
	it("Testing mirror relation recursivley", function(){
		let x = create({name: 'x'});
		let y = create({name: 'y'});
		let z = create({name: 'z'});
		x.next = y;
		y.next = z;

		// Analyze y incoming structure
		let count = 0;
		forAllIncoming(y, 'next', function(referer) {
			assert.equal(referer, x);
			count++;
		});
		assert.equal(count, 1);

		// Analyze z incoming structure
		count = 0;
		forAllIncoming(z, 'next', function(referer) {
			assert.equal(referer, y);
			count++;
		});
		assert.equal(count, 1);
	});


	it("Testing mirror relation exists for array", function(){
		let x = create({name: "x"});
		causality.createArrayIndex(x, "foo");
		
		let y = create({name: "y"});
		x.foo.push(y);

		// Analyze incoming structure
		let yIncomingArray = []
		causality.forAllIncoming(y, 'foo', function(referer) {
			yIncomingArray.push(referer);
		});
		assert.equal(yIncomingArray[0], x);
    });

    it("Testing getting incoming with method", function(){
		let x = create();
		let y = create();
		
		// let y = create({});
		y.incomingFoo = function() {
			let incoming = [];
			
			causality.forAllIncoming(this, 'foo', function(referer) {
				incoming.push(referer);
			});
			return incoming;
		}
		
		// Assign x.foo
		x.foo = y;
		assert.equal(y.incomingFoo()[0], x);
    });

    it("Testing reaction to change in incoming relation", function(){
		let x = create();
		let y = create()
		
		// Setup a repeater that extracts all incoming
		let yIncomingFoo;		
		function updateYIncomingFoo() {
			// logPattern(y, { _mirror_incoming_relations : { foo : { contents : {}}}});
			yIncomingFoo = [];
			causality.forAllIncoming(y, 'foo', function(referer) {
				yIncomingFoo.push(referer);
			});			
		}
		causality.repeatOnChange(function() {
			updateYIncomingFoo();
		});
		assert.equal(yIncomingFoo.length, 0);
		
		// Assign x.foo
		x.foo = y;

		assert.equal(yIncomingFoo.length, 1);
		assert.equal(yIncomingFoo[0], x);
    });
});