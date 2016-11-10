const assert = require('assert');
require('../causality').install();


var a = c([3, 1, 2]);
console.log(a);
a.sort();
console.log(a);
