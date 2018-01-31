'use strict';
const assert = require('assert');
require('../causality').install();
describe("Meta repeaters", function(){

    it("Test working", function(){
        const events = [];

        let nodePrototype = {
            emitHelloEvent : function(arg1, arg2) {
                // console.log("pushing hello " + this.value);
                events.push("hello " + this.value);
            }
        };

        function createNode(value) {
            let node = Object.create(nodePrototype);
            node.value = value;
            return create(node);
        }

        let array = create([]);
        let a = createNode('a');
        let b = createNode('b');
        let c = createNode('c');
        let d = createNode('d');

        array.push(a);
        array.push(b);
        array.push(c);
        assert.equal(array.length, 3);

        // Meta repeater
        repeatOnChange(function() {
            // console.log(array);
            array.forEach(function(node) {
                // console.log(node);
                node.repeat('emitHelloEvent', 'some', 'argument');
            });
        });

        // Assert all repeaters run once upon creation
        assert.equal(events.length, 3);

        // Assert repeater on first node working
        a.value = "A";
        assert.equal(events.length, 4);

        // console.log(a._repeaters.emitHelloEvent);

        // Assert add repeaer to new nodes
        // console.log("============= restruct ================");
        transaction(function() {
            array.shift();
            array.push(d);
        });
        // console.log("============= end restruct ================");
        assert.equal(events.length, 5);

        // console.log(a._repeaters.emitHelloEvent);
        //
        // Test no undead repeater, the
        a.value = "Abraka Dabra";
        // console.log(events);
        assert.equal(events.length, 5);
    });



    // it("Test overlapping sets, only trigger unique sub-repeaters", function(){
        // const events = [];

        // let nodePrototype = {
            // emitHelloEvent : function(arg1, arg2) {
                // // console.log("pushing hello " + this.value);
                // events.push("hello " + this.value);
            // }
        // };

        // function createNode(value) {
            // let node = Object.create(nodePrototype);
            // node.value = value;
            // return create(node);
        // }

        // let array = create([]);
        // let a = createNode('a');
        // let b = createNode('b');
        // let c = createNode('c');
        // let d = createNode('d');

        // array.push(a);
        // array.push(b);
        // array.push(c);
        // assert.equal(array.length, 3);

        // // Meta repeater
        // repeatOnChange(function() {
            // // console.log(array);
            // array.forEach(function(node) {
                // // console.log(node);
                // node.repeat('emitHelloEvent', 'some', 'argument');
            // });
        // });

        // // Assert all repeaters run once upon creation
        // assert.equal(events.length, 3);

        // let arrayB = create([]);
        // arrayB.push(b);
        // arrayB.push(c);
        // arrayB.push(d);

        // // Meta repeater B
        // repeatOnChange(function() {
            // // console.log(array);
            // arrayB.forEach(function(node) {
                // // console.log(node);
                // node.repeat('emitHelloEvent', 'some', 'argument');
            // });
        // });

        // // Assert only one more event
        // assert.equal(events.length, 4);

        // // Assert repeater on first node working
        // b.value = "B";
        // assert.equal(events.length, 5);

        // // console.log(a._repeaters.emitHelloEvent);

        // // Assert add repeaer to new nodes
        // // console.log("============= restruct ================");
        // transaction(function() {
            // array.pop();
        // });
        // // console.log("============= end restruct ================");
        // assert.equal(events.length, 5);

        // // console.log(a._repeaters.emitHelloEvent);
        // //
        // // Test no undead repeater, the
        // c.value = "Chaos";
        // // console.log(events);
        // assert.equal(events.length, 6);
    // });


    // it("Test unique signatures", function(){
        // const events = [];

        // let nodePrototype = {
            // emitHelloEvent : function(arg1, arg2) {
                // // console.log("pushing hello " + this.value);
                // events.push("hello " + this.value);
            // }
        // };

        // function createNode(value) {
            // let node = Object.create(nodePrototype);
            // node.value = value;
            // return create(node);
        // }

        // let a = createNode('a');
        // a.repeat('emitHelloEvent', 'some', 'argument');
        // a.repeat('emitHelloEvent', 2);
        // a.repeat('emitHelloEvent', 54);
        // a.repeat('emitHelloEvent', 54);

        // // Assert all repeaters run once upon creation
        // assert.equal(events.length, 3);
    // });
});
