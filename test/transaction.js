require = require("esm")(module);
const {create,repeat,state,transaction} = require("../causality.js").getWorld();
const assert = require('assert');

describe( "transactions", ()=>{

  const x = create({A: 11});
  const y = create({A: 21});

  //console.log(`x(${x.causality.id}) y(${y.causality.id})`);
  
  repeat( "Rx", (repeater) =>{

    //console.log("repeat", repeater.id, repeater.description);
    if( x.A < 13 ) y.A = x.A;
    //console.log( repeater.sourcesString() );
  });
  
  repeat( "Ry", (repeater) =>{
    //console.log("repeat", repeater.id, repeater.description );
    y.B = y.A - 10;
    //console.log( repeater.sourcesString() );
  });
  
  
  it("nested reacts during non-transaction", ()=>{

    x.A ++;

    assert.equal( x.A, 12 );
    assert.equal( y.B, 2 );
    
  });

  it("postpone reactions in transaction", ()=>{

    transaction(()=>{
      x.A ++;
      //console.log( "in transaction", {x,y, state} );
    });
    
    //console.log( "after transaction", {x,y, state} );
    assert.equal( y.B, 3 );

  });
  
  
});
