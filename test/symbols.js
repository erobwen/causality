require = require("esm")(module);
const {create,uponChangeDo,repeatOnChange,c} = require("../causality.js");
// console.log(causality);
// import {create,uponChangeDo,repeatOnChange,c} from "../causality.js";
const assert = require('assert');

describe( "symbols", ()=>{

  const x = create({propA: 11});
  const sym = Symbol('StrutS');
  x[sym] = "sanded";
  x.sym = sym;
  
  it("keep values", ()=>{
    assert.equal( x.propA, 11 );
    assert.equal( x[sym], "sanded" );
    assert.equal( x.sym, sym );
  });
  
});
