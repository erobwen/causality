


	function testConst(A) {
		const constA = A;
		let dummy;
		for(let i = 0; i < 1000000; i++) {
			if(constA) { 
				dummy = "foo";
			}
			// dummy = "fie"
		}
		return dummy;
	}

	function testLet(A) {
		let letA = A;
		let dummy;
		for(let i = 0; i < 1000000; i++) {
			if(letA) { 
				dummy = "foo";
			}
			// dummy = "fie"
		}
		return dummy;
	}

	function testParam(A) {
		let dummy;
		for(let i = 0; i < 1000000; i++) {
			if(A) { 
				dummy = "foo";
			}
			// dummy = "fie"
		}
		return dummy;
	}


	function testContainer(aContainer) {
		let dummy;
		for(let i = 0; i < 1000000; i++) {
			if(aContainer.A) { 
				dummy = "foo";
			}
			// dummy = "fie"
		}
		return dummy;
	}


	console.time("testContainer");
	testContainer({A: false});
	console.timeEnd("testContainer");
	
	console.time("testConst");
	testConst(false);
	console.timeEnd("testConst");

	console.time("testLet");
	testLet(false);
	console.timeEnd("testLet");

	console.time("testParam");
	testParam(false);
	console.timeEnd("testParam");
	
	console.time("testContainer");
	testContainer({A: false});
	console.timeEnd("testContainer");

	//--


	console.time("testContainer");
	testContainer({A: false});
	console.timeEnd("testContainer");
	
	console.time("testLet");
	testLet(false);
	console.timeEnd("testLet");

	console.time("testConst");
	testConst(false);
	console.timeEnd("testConst");

	console.time("testParam");
	testParam(false);
	console.timeEnd("testParam");

	console.time("testContainer");
	testContainer({A: false});
	console.timeEnd("testContainer");
