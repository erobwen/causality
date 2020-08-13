'use strict';
require = require("esm")(module);
const {observable,repeat} = require("../causality.js").getWorld();
const assert = require('assert');
describe("Observe", function(){

  // it("Test observe object", function(){
  //   let events = [];
  //   let x = observable();
  //   x.observe(function(event) {
  //     events.push(event);
  //   });

  //   x.a = 10;
  //   x.a = 20;
  //   x.a = 20;
  //   let y = x.a;
  //   // console.log(events);
  // });
	
	
  // it("Test observe activated by repeater removed", function(){
		// let state = 0
		// function toggle() {
		// 	state = (state === 0) ? 1 : 0;
		// 	return state;
		// }
		
  //   let controller = observable({
		// 	haveObserver : false
		// });

		// let specimen = observable({});
		
		// let observationCounter = 0;
		
		// // Install observer using a repeater
		// repeat(function() {
		// 	if (controller.haveObserver) {
		// 		specimen.observe(function() {
		// 			observationCounter++;
		// 		});
		// 	}
		// });
		
		// // Manipulate twice with no observer
		// assert.equal(typeof(specimen.causality.handler.observers), 'undefined'); // no observer!
		// specimen.manipulate = toggle();
		// specimen.manipulate = toggle();
		// assert.equal(observationCounter, 0);
		
		// // Activate observer using repeater
		// controller.haveObserver = true;
		// assert.equal(Object.keys(specimen.causality.handler.observers).length, 1); // one observer!
		// specimen.manipulate = toggle();
		// specimen.manipulate = toggle();
		// assert.equal(observationCounter, 2);
		
		// // Deactivate observer using repeater
		// controller.haveObserver = false;
		// specimen.manipulate = toggle();
		// specimen.manipulate = toggle();
		// assert.equal(observationCounter, 2); // still 2 !
		
		// // Assert no observation structure left!
		// assert.equal(Object.keys(specimen.causality.handler.observers).length, 0);
  // });
});
