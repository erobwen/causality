import { getWorld } from "../causality.js";
import assert from "assert";
const { observable, repeat } = getWorld({name: "hobby"});

describe("object tree modifications", function(){

	let cnt = 0;
	const state = observable({});
	let out = {};
	
	repeat(function(){
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
		state.a = observable({name:"Apa"});
		assert.equal(cnt,2);
		assert.equal(out.a, undefined);
	});

	it("Setting a.hobby", function(){
		state.a.hobby = observable([]);
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
