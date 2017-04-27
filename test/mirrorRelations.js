const assert = require('assert');
require('../causality').install();
let mirror = require('../mirror');

describe("Mirror Relations", function(){
    it("Testing mirror relation exists", function(){
		let x = create({_mirror_is_reflected : true});
		let y = create({_mirror_reflects : true});
		// console.log(x.__id);
		// console.log(y.__id);
		// x.foo = y;
		// logPattern(x, { foo : {}});
		// logPattern(y, { _mirror_incoming_relations : { foo : { contents: {}}}});
		
		// mirror.forAllIncoming(y, 'foo', function(referer) {
			// logPattern(x, { foo : {}});
			// logPattern(referer, { foo : {}});
			// console.log(x === referer);
		// });
    });
});