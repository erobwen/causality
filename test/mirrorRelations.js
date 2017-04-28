const assert = require('assert');
require('../causality').install();
let mirror = require('../mirror');

describe("Mirror Relations", function(){
    it("Testing mirror relation exists", function(){
		let x = create({_mirror_is_reflected : true});
		let y = create({_mirror_reflects : true});
		// console.log(x.__id);
		// console.log(y.__id);
		x.foo = y;
		console.log(" ====  After assign ==== "); 
		logPattern(x.__id);
		logPattern(x, { foo : {}});
		logPattern(y.__id);
		logPattern(y, { _mirror_incoming_relations : { foo : { contents: {}}}});
		console.log(" ====  All incoming ==== "); 
		mirror.forAllIncoming(y, 'foo', function(referer) {
			console.log(" ====  x ==== "); 
			logPattern(x.__id);
			logPattern(x, { foo : {}});
			console.log(" ====  referer ==== "); 
			logPattern(referer.__id);
			logPattern(referer, { foo : { contents: { "1": {}}}});
			console.log(" ====  equals ==== "); 
			console.log(x === referer);
		});
    });
});