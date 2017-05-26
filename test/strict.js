'use strict';
const assert = require('assert');
let causality = require('../causality');
causality.install();
const log = console.log.bind(console);

describe("Proxy object traps", function () {
    const box = create();

    it('overlay',  function () {
        box.const.const.forwardsTo = create({ name: "overlay"});
        box.other = null;
        box.const.forwardsTo = null;
    });

    it('nochange',  function () {
        box.x = 123;
        box.x = 123;
    });

    it('delete nonexisting', function(){
        delete box.y;
    });

    Object.defineProperty(box, "z", {
        configurable: false,
    });

    it('set nonconfigurable', function(){
        assert.throws( function(){box.z = false}, TypeError ); 
    });

    it('delete nonconfigurable', function(){
         assert.throws( function(){ delete box.z }, TypeError ); 
    });
});

describe("Array object traps", function () {
    const stack = create([]);

    it('overlay',  function () {
        stack.const.handler.const.const.forwardsTo = create(['aa','bb']);
        stack[2] = false;
        stack.const.forwardsTo = null;
    });


    it('nochange',  function () {
        stack[1] = 123;
        stack[1] = 123;

        stack.splice(0, stack.length, 'a','b','c','d');
        stack.length = 4;
    });

    it('delete nonexisting', function(){
        delete stack[99];
    });

    it('setCumulativeAssignment',  function () {
        causality.setCumulativeAssignment(1);
        stack[1] = undefined;
        causality.setCumulativeAssignment(0);
    });
});

