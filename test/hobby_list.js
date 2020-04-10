'use strict';
require = require("esm")(module);
const {o,repeatOnChange} = require("../causality.js").instance({name: "hobby"});
const assert = require('assert');

describe("object tree modifications", function(){

	let cnt = 0;
	const state = o({});
	let out = {};
	
	repeatOnChange(function(){
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
		state.a = o({name:"Apa"});
		assert.equal(cnt,2);
		assert.equal(out.a, undefined);
	});

	it("Setting a.hobby", function(){
		state.a.hobby = o([]);
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
