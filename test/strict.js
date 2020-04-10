'use strict';
require = require("esm")(module);
const {observable} = require("../causality.js").instance();
const assert = require('assert');

describe("Proxy object traps", function () {
  const box = observable();

  it('forwardTo',  function () {
    box.causalityForwardTo = observable({ name: "forwardTo"});
    box.other = null;
    box.causalityForwardTo = null;
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
  const stack = observable([]);

  it('forwardTo',  function () {
    stack.causalityForwardTo = observable(['aa','bb']);
    stack[2] = false;
    stack.causalityForwardTo = null;
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
});
