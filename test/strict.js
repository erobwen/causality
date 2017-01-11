'use strict';
const assert = require('assert');
require('../causality').install();
const log = console.log.bind(console);

/*
var hula = {};
Object.defineProperty(hula, "z", {
    configurable: false,
});
hula.z = 2;
*/

describe("Proxy object traps", function () {
    const box = create();

    it('overlay',  function () {
        box.__handler.overrides.__overlay = create({ name: "overlay"});
        log("a");
        box.other = null;
        log("b");
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
        box.z = false; 
    });

    it('delete nonconfigurable', function(){
        delete box.z;
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

    it('defines non-configurable property', function(){
        Object.defineProperty(stack, 2, {
            configurable: false,
        });
    });
        
    it('defines non-configurable property', function(){
        Object.defineProperty(stack, 'z', {
            configurable: false,
        });
    });
        
    it('set nonconfigurable', function(){
        stack.z = false; 
    });

    it('delete nonconfigurable', function(){
        delete stack.z;
    });


    it('setCumulativeAssignment',  function () {
        setCumulativeAssignment(1);
        stack[1] = undefined;
    });
});

