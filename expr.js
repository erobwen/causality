// console.log("1234".split("("));
// console.log("(1234)asdf(123)".split("("));

// console.log("".split(")"));
// console.log("123)".split(")"));


const idExpressionPrefix = "_id_(";
const idExpressionSuffix = ")";

function createIdExpression(id) {
	return idExpressionPrefix + id + idExpressionSuffix;
}

function isIdExpression(string) {
	return id.startsWith(idExpressionPrefix);
}


function extractIdFromExpression(idExpression) {
	let withoutPrefix = idExpression.slice(idExpressionPrefix.length);
	let withoutOuter = withoutPrefix.substr(0, withoutPrefix.length - idExpressionSuffix.length);
	if (!isNaN(withoutOuter)) 
		return parseInt(withoutOuter);
	else 
		return null;
}

function transformIdExpression(idExpression, idMapper) {
	let withoutPrefix = idExpression.slice(idExpressionPrefix.length);
	let withoutOuter = withoutPrefix.substr(0, withoutPrefix.length - idExpressionSuffix.length);
	let splitOnPrefix = withoutOuter.split(idExpressionPrefix);
	if (splitOnPrefix.length === 1) {
		// A single id
		return idExpressionPrefix + idMapper(parseInt(splitOnPrefix[0])) + idExpressionSuffix;
	} else {
		let stringBuffer = [];
		// A multi id expression
		for (let i = 0; i < splitOnPrefix.length; i++) {
			let splitOnSuffix = splitOnPrefix[i].split(idExpressionSuffix);
			if (splitOnSuffix.length === 1) {
				// Just a starting blank, do nothing...
			} else if (splitOnSuffix.length === 2) {
				stringBuffer.push(idExpressionPrefix + idMapper(parseInt(splitOnSuffix[0])) + idExpressionSuffix + splitOnSuffix[1]);
			} else {
				// Id expression syntax error
				throw new Exception("Id expression syntax error");
			}
		}
		return idExpressionPrefix + stringBuffer.join("") + idExpressionSuffix;
	}
}

function idMapper(id) {
	return {
		1 : "a",
		2 : "b",
		3 : "c"
	}[id];
}

console.log(extractIdFromExpression("_id_(123)"));
console.log(transformIdExpression("_id_(_id_(1)asdf_id_(2)zxcv_id_(3))", idMapper));
console.log(transformIdExpression("_id_(1)", idMapper));
						