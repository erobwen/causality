import { getWorld } from "../causality.js";
import assert from "assert";
const { observable, repeat, withoutRecording } = getWorld();
       // enterIndependentContext,leaveIndependentContext

describe("Without recording", function(){

  it("Non recording", function(){
    const x = observable({ important: true, irellevant: true});
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
    const x = observable({ important: true, irellevant: true});
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

  // it("does not remove observers added inside withoutRecording", function(){
  //   // This should probably be done in some other way instead. By
  //   // introducing a way to create independent contexts inside other
  //   // contexts.

  //   const x = observable({});
  //   const y = observable({
  //     onChange: () => {
  //       y_changes_count ++;
  //     }
  //   });

		// let y_changes_count = 0;
		
		// repeat(()=>{
		// 	if( x.a ){
		// 		//console.log('x.a is true');

		// 		withoutRecording(()=>{
		// 			enterIndependentContext();
		// 			leaveIndependentContext();
		// 		});

		// 	} else {
		// 		//console.log('x.a is false');
		// 	}
		// });

		// y.b = 1;

		// x.a = true;

		// y.b = 2;

		// x.a = false; // should not remove the y observer

		// y.b = 3;
		
		// assert.equal(y_changes_count, 3);

  // });
});
