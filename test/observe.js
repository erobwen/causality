const assert = require('assert');
require('../causality').install();
describe("Observe", function(){

    it("Test observe object", function(){
        let events = [];
        let x = create();
        x.observe(function(event) {
            events.push(event);
        });

        x.a = 10;
        x.a = 20;
        let y = x.a;
        console.log(events);
    });
});
