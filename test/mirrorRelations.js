const assert = require('assert');
let causality = require('../causality')({mirrorRelations : true});
let create = causality.create;


describe("Mirror Relations", function(){

    // it("Testing mirror relation exists", function(){
		// // let x = create({_mirror_is_reflected : true, _mirror_reflects : true});
		// // let y = create({_mirror_reflects : true, _mirror_is_reflected : true, });
		// // let x = create(mirror.create());
		// // let y = create(mirror.create());

		// let x = create();
		// let y = create();
		
		// // Assign x.foo
		// x.foo = y;

		// // console.log("+checking");
		// // console.log(x.const._mirror_reflects);
		// // console.log(x.const._mirror_is_reflected);
		// // console.log(y.const._mirror_reflects);
		// // console.log(y.const._mirror_is_reflected);
		// // console.log(x.foo);
		// // console.log(x.foo.const);
		// // console.log("-checking");
		
		// // Analyze incoming structure
		// let yIncomingFoo = []
		// causality.forAllIncoming(y, 'foo', function(referer) {
			// yIncomingFoo.push(referer);
		// });
		// // console.log("======================= asdf =======================");
		// // console.log(y);
		// // console.log(y.incoming);
		// // console.log("======================= asdf =======================");
		// // console.log(x.incoming);
		// // logPattern(x, { foo : {}});
	
		// // console.log("========================");
		// assert.equal(yIncomingFoo[0], x);
    // });

	it("Testing mirror relation exists for array", function(){
		// console.log("======================");
		let x = create({name: "x"});
		causality.createArrayIndex(x, "foo");
		
		let y = create({name: "y"});
		// console.log("===========");
		// console.log(x.foo);
		// console.log("===========");
		x.foo.push(y);
		// console.log(x);
		// console.log(x.foo);
		// console.log(x.foo.const.id);

		// console.log(y._mirror_incoming_relations);
		// Analyze incoming structure
		let yIncomingArray = []
		causality.forAllIncoming(y, 'foo', function(referer) {
			// console.log("-----------------------Inside loop");
			// console.log(referer);
			yIncomingArray.push(referer);
		});
		// logPattern(x, { foo : {}});
	
		// console.log("========================");
		assert.equal(yIncomingArray[0], x);
    });

    // it("Testing getting incoming with method", function(){
		// let x = create();
		// let y = create();
		
		// // let y = create({});
		// y.incomingFoo = function() {
			// let incoming = [];
			
			// causality.forAllIncoming(this, 'foo', function(referer) {
				// incoming.push(referer);
			// });
			// return incoming;
		// }
		
		// // Assign x.foo
		// x.foo = y;
		// assert.equal(y.incomingFoo()[0], x);
    // });

    // it("Testing reaction to change in incoming relation", function(){
		// let x = create();
		// let y = create()
		
		// let yIncomingFoo;		
		// function updateYIncomingFoo() {
			// // logPattern(y, { _mirror_incoming_relations : { foo : { contents : {}}}});
			// yIncomingFoo = [];
			// causality.forAllIncoming(y, 'foo', function(referer) {
				// yIncomingFoo.push(referer);
			// });			
		// }
		
		// causality.repeatOnChange(function() {
			// updateYIncomingFoo();
		// });
		// assert.equal(yIncomingFoo.length, 0);
		
		// // Assign x.foo
		// x.foo = y;

		// assert.equal(yIncomingFoo.length, 1);
		// assert.equal(yIncomingFoo[0], x);
    // });
});