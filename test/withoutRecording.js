'use strict';
require = require("esm")(module);
const {create,repeat,withoutRecording,
  enterIndependentContext,leaveIndependentContext
} = require("../causality.js");
const assert = require('assert');

describe("Without recording", function(){

    it("Non recording", function(){
        const x = create({ important: true, irellevant: true});
        let result = false;
        let repeatCount = 0;
        repeat(()=>{
            repeatCount++;
            withoutRecording(()=>{
                // Simulate a log of x that reads x
                let dummy;
                for (let property in x) {
                    dummy = x[property];
                }
            });
            result = x.important;
        });

        assert.equal(result, true);
        assert.equal(repeatCount, 1);

        x.important = false;

        assert.equal(result, false);
        assert.equal(repeatCount, 2);

        x.irellevant = false;

        assert.equal(result, false);
        assert.equal(repeatCount, 2); // No extra repetition!
    });  


    it("Recording", function(){
        const x = create({ important: true, irellevant: true});
        let result = false;
        let repeatCount = 0;
        repeat(()=>{
            repeatCount++;

            // Simulate a log of x that reads x
            let dummy;
            for (let property in x) {
                dummy = x[property];
            }

            result = x.important;
        });

        assert.equal(result, true);
        assert.equal(repeatCount, 1);

        x.important = false;

        assert.equal(result, false);
        assert.equal(repeatCount, 2);

        x.irellevant = false;

        assert.equal(result, false);
        assert.equal(repeatCount, 3); // Extra repetition
    });  

    it("does not remove observers added inside withoutRecording", function(){
    // This should probably be done in some other way instead. By
    // introducing a way to create independent contexts inside other
    // contexts.

    const x = create({});
    const y = create({});

		let y_changes_count = 0;
		
		repeat(()=>{
			if( x.a ){
				//console.log('x.a is true');

				withoutRecording(()=>{
					enterIndependentContext();
					y.observe( observing_y);
					leaveIndependentContext();
				});

			} else {
				//console.log('x.a is false');
			}
		});

		function observing_y( event ){
			//console.log("Y changed");
			y_changes_count ++;
		}

		y.b = 1;

		x.a = true;

		y.b = 2;

		x.a = false; // should not remove the y observer

		y.b = 3;
		
		assert.equal(y_changes_count, 2);

  });
});
