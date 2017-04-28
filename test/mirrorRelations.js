const assert = require('assert');
require('../causality').install();
let mirror = require('../mirror');

describe("Mirror Relations", function(){
    it("Testing mirror relation exists", function(){
		// let x = create({_mirror_is_reflected : true, _mirror_reflects : true});
		// let y = create({_mirror_reflects : true, _mirror_is_reflected : true, });
		let x = create(mirror.create());
		let y = create(mirror.create());
		
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
});