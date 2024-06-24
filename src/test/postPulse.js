import { getWorld } from "../causality.js";
import assert from "assert";
const causality = getWorld();

describe("Post pulse", function(){

  const expected = [
    [ { type: 'create', object: {}, objectId: 1 } ],
    [ { type: 'create', object: {}, objectId: 2 } ],
    [ { type: 'set',
        property: 'y',
        newValue: {},
        oldValue: undefined,
        object: { y: {} },
        objectId: 1 } ],
    [ { type: 'set',
        property: 'foo',
        newValue: 42,
        oldValue: undefined,
        object: { y: null, foo: 42, z: {} },
        objectId: 1 },
      { type: 'set',
        property: 'bar',
        newValue: 2,
        oldValue: undefined,
        object: { bar: 2 },
        objectId: 2 },
      { type: 'create', object: {}, objectId: 3 },
      { type: 'set',
        property: 'z',
        newValue: {},
        oldValue: undefined,
        object: { y: null, foo: 42, z: {} },
        objectId: 1 } ],
  ];

  
  // it("Test events", function(){
  //   let i = 0;
  //   causality.resetObjectIds();
  //   //console.log('setup');
		// causality.setRecordEvents(true);
		// causality.addPostPulseAction(function(events) {
  //     //console.log( events );
  //     assert.deepEqual( events, expected[i++] );
		// });

  //   //console.log('start');
  //   let x = causality.observable({});
		// x.y = causality.observable({});

  //   // Set up for comparison
  //   expected[3][0].object.y = x.y;
  //   expected[3][3].object.y = x.y;
    
  //   //console.log('transaction');
		// causality.transaction(function() {
		// 	x.foo = 42;
		// 	x.y.bar = 2;
		// 	x.z = causality.observable({});
		// });

  //   //console.log('cleanup');
  //   causality.removeAllPostPulseActions();
		// causality.setRecordEvents(false);
  //   //console.log('end');
  // });
});
