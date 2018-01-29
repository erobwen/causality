'use strict';
const assert = require('assert');
require('../causality').install();

describe("Without recording", function(){

  it("does not remove observers added inside withoutRecording", function(){

    const x = create({});
    const y = create({});

		let y_changes_count = 0;
		
		repeat(()=>{
			if( x.a ){
				//console.log('x.a is true');

				withoutRecording(()=>{
					y.observe( observing_y );
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
