import {create,repeatOnChange} from "../causality.js";
const assert = require('assert');
//const log = console.log.bind(console);

describe("Classes", function () {

    class MyCausalityClass {
	    constructor( myid ){
		    this.propA = myid;
            this.propB = 0;
            return create( this );
        }

        dostuff()
        {
            return 33;
        }
    }
    
    let cnt = 0;
    const x = new MyCausalityClass( 11 );
    let z;

    repeatOnChange(function () {
        cnt++;
        z = x.propA + x.dostuff();
    });

    it('does action', function () {
        assert.equal(z, 44);
    });

    it('not trigger', function () {
        x.propC = 100;
        assert.equal(cnt, 1);
    });

    it('trigger', function () {
        x.propA = 2;
        assert.equal(z, 35);
    });

    it('changed method does not trigger', function(){
        MyCausalityClass.prototype.dostuff = function(){ return 11 };
        assert.equal(z, 35);
    });

    it('changed object functions do trigger', function(){
        x.dostuff = function(){ return 55 };
        assert.equal(z, 57);
    });


});
    
