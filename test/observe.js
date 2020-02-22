'use strict';
require = require("esm")(module);
const {create,repeatOnChange} = require("../causality.js").instance();
const assert = require('assert');
describe("Observe", function(){

  it("Test observe object", function(){
    let events = [];
    let x = create();
    x.observe(function(event) {
      events.push(event);
    });

    x.a = 10;
    x.a = 20;
    x.a = 20;
    let y = x.a;
    // console.log(events);
  });
	
	
  it("Test observe activated by repeater removed", function(){
		let state = 0
		function toggle() {
			state = (state === 0) ? 1 : 0;
			return state;
		}
		
    let controller = create({
			haveObserver : false
		});

		let specimen = create({});
		
		let observationCounter = 0;
		
		// Install observer using a repeater
		repeatOnChange(function() {
			if (controller.haveObserver) {
				specimen.observe(function() {
					observationCounter++;
				});
			}
		});
		
		// Manipulate twice with no observer
		assert.equal(typeof(specimen.__handler.observers), 'undefined'); // no observer!
		specimen.manipulate = toggle();
		specimen.manipulate = toggle();
		assert.equal(observationCounter, 0);
		
		// Activate observer using repeater
		controller.haveObserver = true;
		assert.equal(Object.keys(specimen.__handler.observers).length, 1); // one observer!
		specimen.manipulate = toggle();
		specimen.manipulate = toggle();
		assert.equal(observationCounter, 2);
		
		// Deactivate observer using repeater
		controller.haveObserver = false;
		specimen.manipulate = toggle();
		specimen.manipulate = toggle();
		assert.equal(observationCounter, 2); // still 2 !
		
		// Assert no observation structure left!
		assert.equal(Object.keys(specimen.__handler.observers).length, 0);
  });
});
