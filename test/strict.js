'use strict';
const assert = require('assert');
require('../causality').install();
const log = console.log.bind(console);

describe("Proxy object traps", function () {
    const box = create();

    it('overlay',  function () {
        box.__handler.overrides.__overlay = create({ name: "overlay"});
        box.other = null;
        box.__overlay = null;
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
        stack.__handler.overrides.__overlay = create(['aa','bb']);
        stack[2] = false;
        stack.__overlay = null;
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
        setCumulativeAssignment(1);
        stack[1] = undefined;
    });
});

