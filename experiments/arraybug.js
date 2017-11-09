	let causality = require('../causality');
	causality.install();
	var mobx = require('mobx');
	const log = console.log.bind(console);

	col = create({});
	col.cdocs = create([]);

	repeatOnChange(()=>{
		log("repeating!");
		log(col.cdocs[0]);
		log("");
	});

	function doInDoubleTransaction(action) {
		causality.transaction(() => {
			causality.transaction(() => {
				action();	
			});
		});	
	}

	doInDoubleTransaction(() => {
		col.cdocs[0] = 3;
	});
	
	doInDoubleTransaction(() => {
		col.cdocs[0] = "Foobar";
	});	
	
	doInDoubleTransaction(() => {
		col.cdocs.length = 0;
	});
	
	doInDoubleTransaction(() => {
		col.cdocs[0] = 42;
	});