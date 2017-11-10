const assert = require('assert');
let causality = require('../causality');
causality.install();

describe("Post pulse", function(){

    it("Test events", function(){
		causality.setRecordEvents(true);
		causality.setNewEventStyle(true);
		causality.addPostPulseAction(function(events) {
			console.log(events);
			// TODO: Verify the events against something... 
		});

		let x = create({});
		x.y = create({});
				
		causality.transaction(function() {
			x.foo = 42;
			x.y.bar = 2;
			x.z = create({});
		});
		
		causality.removeAllPostPulseActions();
		causality.setRecordEvents(false);
		causality.setNewEventStyle(false);
    });
});
