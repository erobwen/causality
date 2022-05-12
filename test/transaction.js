require = require("esm")(module);
const {create,repeat,state,transaction} = require("../causality.js");
const assert = require('assert');

describe( "transactions", ()=>{

  const x = create({A: 11, B:21});
  const y = create({});

  //console.log(`x(${x.__id}) y(${y.__id})`);
  
  repeat( "Rx", (context,repeater) =>{
    //console.log("repeat", repeater.id + "/" + repeater.description);
    y.A = x.A;
    //console.log( repeater.sourcesString() );
  });
  
  repeat( "Ry", (context,repeater) =>{
    //console.log("repeat", repeater.id + "/" + repeater.description );

    transaction(()=>{
      y.B = y.A - 10;
      y.D = y.C + x.B;
    });

    //console.log( repeater.sourcesString() );
  });
  
  repeat( "Rz", (context,repeater) =>{
    //console.log("repeat", repeater.id + "/" + repeater.description );

    //console.log(`y.C = ${x.A} + ${y.B}`);
    y.C = x.A + y.B;

    //console.log( repeater.sourcesString() );
  });
  
  
  it("nested reacts during non-transaction", ()=>{
    x.A ++;

    assert.equal( x.A, 12 );
    assert.equal( y.B, 2 );
  });

  it("postpone reactions in transaction", ()=>{
    //console.log("*** START postpone test");
    
    transaction(()=>{
      x.A ++;
      x.B ++;
    });
    
    //console.log( "after transaction", {x,y} );
    assert.equal( y.B, 3 );
    assert.equal( y.C, 16 );

  });
  
});

