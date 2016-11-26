const assert = require('assert');
require('../causality').install();

describe("Projections", function(){

    var createNode = function() {

        return create({
            flattenPreOrder : function() {
                var node = create({});

            },
            value : value,
            children : children
        });
    };

    // let cnt = 0;
    // const state = create({});
    // let out = {};
    //
    // repeatOnChange(function(){
    //     // console.log("=== Reevaluate ===");
    //     cnt++;
    //     for( let key in state ){
    //         if( state[key].hobby ){
    //             out[key] = state[key].hobby.length;
    //         }
    //     }
    //     // console.log("=== finished ===");
    // });
    //
    // it("Setting a", function(){
    //     // assert.equal(out.a, undefined);
    // });
});
