const assert = require('assert');
let causality = require('../causality');
causality.install();
causality.setConfiguration({mirrorRelations : true});

let mirror = require('../mirror');

describe("Mirror Relations", function(){
    it("Testing mirror relation exists", function(){
		// let x = create({_mirror_is_reflected : true, _mirror_reflects : true});
		// let y = create({_mirror_reflects : true, _mirror_is_reflected : true, });
		// let x = create(mirror.create());
		// let y = create(mirror.create());

		let x = create();
		x.static._mirror_reflects = true;
		x.static._mirror_is_reflected = true;

		let y = create();
		y.static._mirror_reflects = true;
		y.static._mirror_is_reflected = true;
		
		// Assign x.foo
		x.foo = y;
		// console.log(x);
		// console.log(x.foo);
		// console.log(x.foo.__id);

		// Analyze incoming structure
		let yIncomingFoo = []
		mirror.forAllIncoming(y, 'foo', function(referer) {
			yIncomingFoo.push(referer);
		});
		// logPattern(x, { foo : {}});
	
		// console.log("========================");
		assert.equal(yIncomingFoo[0], x);
    });
	
	it("Testing mirror relation exists for array", function(){
		let x = create([]);
		x.static._mirror_is_reflected = true;
		x.static._mirror_reflects = true;
		
		
		let y = create(mirror.create());
		mirror.createArrayIndex(x, "foo", causality.create);
		
		
		x.push(y);
		// console.log(x);
		// console.log(x.foo);
		// console.log(x.foo.__id);

		// Analyze incoming structure
		let yIncomingArray = []
		mirror.forAllIncoming(y, '[]', function(referer) {
			yIncomingArray.push(referer);
		});
		// logPattern(x, { foo : {}});
	
		// console.log("========================");
		assert.equal(yIncomingArray[0], x);
    });
	
    it("Testing getting incoming with method", function(){
		let x = create(mirror.create());
		let y = create(mirror.create());
		
		// let y = create({});
		y.incomingFoo = function() {
			let incoming = [];
			
			mirror.forAllIncoming(this, 'foo', function(referer) {
				incoming.push(referer);
			});
			return incoming;
		}
		
		// Assign x.foo
		x.foo = y;
		assert.equal(y.incomingFoo()[0], x);
    });
	
    it("Testing reaction to change in incoming relation", function(){
		let x = create(mirror.create());
		let y = create(mirror.create());
		
		let yIncomingFoo;		
		function updateYIncomingFoo() {
			// logPattern(y, { _mirror_incoming_relations : { foo : { contents : {}}}});
			yIncomingFoo = [];
			mirror.forAllIncoming(y, 'foo', function(referer) {
				yIncomingFoo.push(referer);
			});			
		}
		
		repeatOnChange(function() {
			updateYIncomingFoo();
		});
		assert.equal(yIncomingFoo.length, 0);
		
		// Assign x.foo
		x.foo = y;

		assert.equal(yIncomingFoo.length, 1);
		assert.equal(yIncomingFoo[0], x);
    });

});