const assert = require('assert');
let causality = require('../causality');
let create = causality.create;


const log = console.log.bind(console);

describe("object tree modifications", function(){

	let cnt = 0;
	const state = create({});
	let out = {};
	
	causality.repeatOnChange(function(){
		// console.log("=== Reevaluate ===");
		cnt++;
		for( let key in state ){
			if( state[key].hobby ){
				out[key] = state[key].hobby.length;
			}
		}
		// console.log("=== finished ===");
	});

	it('init', function(){
		assert.equal(cnt,1);
	});

	it("Setting a", function(){
		state.a = causality.c({name:"Apa"});
		assert.equal(cnt,2);
		assert.equal(out.a, undefined);
	});

	it("Setting a.hobby", function(){
		state.a.hobby = causality.c([]);
		assert.equal(cnt,3);
		//log(state['a'].hobby);
		//log(state['a'].hobby.length);
		assert.equal(out.a, 0);
	});

	it("Pushing to hobby", function(){
		state.a.hobby.push('causality');
		assert.equal(cnt,4);
		assert.equal(out.a, 1);
	});

});
