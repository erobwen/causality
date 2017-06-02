const assert = require('assert');
require('./causalityBasic').install();

// describe("Infusion", function(){
//
//     let a = create({});
//     let b = create({});
//     let c = create({});
//     let d = create({});
//     let e = create({});
//     let f = create({});
//
//     a.to = b;
//
//     b.next = c;
//     c.next = d;
//     d.next = b;
//
//     c.out = e;
//     d.out = f;
//     f.back = d;
//     it('init', function(){
//         assert.equal(a.to, b);
//
//         assert.equal(b.next, c);
//         assert.equal(c.next, d);
//         assert.equal(d.next, b);
//
//         assert.equal(c.out, e);
//         assert.equal(d.out, f);
//         assert.equal(f.back, d);
//     });
//
//     it('infuse', function(){
//         let b2 = create({});
//         let c2 = create({});
//         let d2 = create({});
//
//         // Reverse loop
//         b2.next = d2;
//         c2.next = b2;
//         d2.next = c2;
//
//         infuseCoArrays([b2, c2, d2], [b, c, d]);
//
//         assert.equal(a.to, b);
//
//         // Test reverse loop
//         assert.equal(b.next, d);
//         assert.equal(c.next, b);
//         assert.equal(d.next, c);
//
//         assert.equal(c.out, e);
//         assert.equal(d.out, f);
//         assert.equal(f.back, d);
//     });
// });