// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        root.causality = factory(); // Support browser global
    }
}(this, function () {
	
	let bufferWidth = 100;
	
	let indentLevel = 0;

	function indentString(level) {
		let string = "";
		while (level-- > 0) {
			string = string + "  ";
		}
		return string;
	}

	function createContext() {
		return {
			rootLevel : true,
			horizontal : false,
			indentLevel : indentLevel,
			unfinishedLine : false,
			// log : function(string) {
				// if (this.unfinishedLine) {
					// console.log(string);
					// this.unfinishedLine = false;					
				// } else {
					// let indent = indentString(this.indentLevel);
					// console.log(indent + string);
					// this.unfinishedLine = false;
				// }
			// },
			log : function(string) {
				if (this.unfinishedLine) {
					process.stdout.write(string); 
					this.unfinishedLine = true;
				} else {
					let indent = indentString(this.indentLevel);
					process.stdout.write(indent + string); 
					this.unfinishedLine = true;
				}
			},
			finishOpenLine : function() {
				if (this.unfinishedLine && !this.horizontal) {
					console.log();
					this.unfinishedLine = false;
				}
			} 
		};
	}

	function horizontalLogWithinWidthLimit(entity, pattern, limit, context) {
		// Setup of process
		if (typeof(context) === 'undefined') {
			context = { 
				charcount : 0,
				count : function(chars) {
					this.charcount += chars.length;
					// console.log("less than limit?" + chars);
					// console.log(context.charcount <= limit);
					return context.charcount <= limit; 
				}
			};	
		}

		if (typeof(entity) !== 'object') { 
			if (typeof(entity) === 'function') {
				return context.count("function( ... ) { ... }");				
			} else {
				return context.count(entity + "");
			}
		} else {
			if (pattern === 0) {
				if (entity instanceof Array) {
					return context.count("[...]"); 
				} else {
					return context.count("{...}"); 				
				}
			} else {
				let isArray = (entity instanceof Array);
				context.count(isArray ? "[" : "{");
				for (p in entity) {
					if (!isArray || isNaN(p)) context.count(p + " : ");
					
					let nextPattern = null;
					if (typeof(pattern) === 'object') {
						nextPattern = pattern[p];
					} else {
						nextPattern = pattern - 1;
					}
					
					if (!horizontalLogWithinWidthLimit(entity[p], nextPattern, limit, context)) {
						// console.log("fails on child");
						return false;
					}
				}
				return context.count(isArray ? "]" : "}");				
			}	
		}
		// console.log("on the wild side");
		// console.log(entity);
	}

	function logPattern(entity, pattern, context) {
		if (typeof(pattern) === "undefined") {
			pattern = 1;
		} 
		
		// Setup of process
		let outer = false;
		if (typeof(context) === 'undefined') {
			context = createContext();
			outer = true;
		}

		// Recursive rendering
		if (typeof(entity) !== 'object') {
			if (typeof(entity) === 'function') {
				context.log("function( ... ) { ... }");				
			} else if (typeof(entity) === 'string') {
				if (context.rootLevel) {
					context.log(entity);
				} else {
					context.log('"' + entity + '"');								
				}
			} else {
				context.log(entity + "");				
			}
		} else if (entity === null) {
			context.log("null");
		} else {
			if (pattern === 0) {
				if (entity instanceof Array) {
					context.log("[...]"); 
				} else {
					context.log("{...}"); 				
				}
			} else {
				let isArray = (entity instanceof Array);
				let startedHorizontal = false;
				if (!context.horizontal) {
					context.horizontal = horizontalLogWithinWidthLimit(entity, pattern, bufferWidth - context.indentLevel * 2); // - 
					startedHorizontal = true;
				}
				if (isArray) context.finishOpenLine(); // Should not be when enforced single row.
				context.log(isArray ? "[" : "{");
				// context.log(context.horizontal ? "-" : "|");
				context.finishOpenLine();
				context.indentLevel++;
				let first = true;
				for (p in entity) {
					if (!first) {
						context.log(", ");
						context.finishOpenLine();
					}
					if (!isArray || isNaN(p)) context.log(p + " : ");
					
					let nextPattern = null;
					if (typeof(pattern) === 'object') {
						nextPattern = pattern[p];
					} else {
						nextPattern = pattern - 1;
					}
					
					if(!isArray) context.indentLevel++;
					context.rootLevel = false;
					logPattern(entity[p], nextPattern, context);
					if(!isArray) context.indentLevel--;
					first = false;
				}
				context.indentLevel--;
				context.finishOpenLine();
				context.log(isArray ? "]" : "}");
				if (startedHorizontal) {
					context.horizontal = false;
				}
			}
		}
		if (outer) context.finishOpenLine();
	}
	
	return {
		log : logPattern,
		enter : function() {
			indentLevel++;
		},
		exit : function() {
			indentLevel--;
		} 
	};
}));


		 

