const assert = require('assert');
require('../causality').install();
let mirror = require('../mirror');

describe("Mirror Relations", function(){
    it("Testing mirror relation exists", function(){
		let x = create({_mirror_is_reflected : true});
		let y = create({_mirror_reflects : true});
		
		x.foo = y;
		mirror.forAllIncoming(y, 'foo', function(referer) {
			console.log(x === referer);
		});
    });
});