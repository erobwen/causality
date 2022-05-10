// let causality = require('../causality');
import { create, repeat, withoutRecording } from "../causality.js";
const log = console.log;

class DataStore {
    constructor(name) {
        this.name = name;
        this.foo = 1; 
        this.fie = 2; 
        this.fum = 3; 
        return create(this);
    }

    toString() {
        const me = this; 
        let result;
        withoutRecording(() => {
            result = "DataStore:" + me.name + ":" +  me.__id;
        })
        return result; 
    }

    sum() {
        return this.foo + this.fie +  this.fum;
    }
}

const dataA = new DataStore("A");
const dataB = new DataStore("B");
let result;

repeat("sumRepeater", (repeater) => {
    log(repeater.causalityString());
    const aSum = dataA.sum();
    const bSum = dataB.sum();
    result = aSum + bSum;
    log("with sources:")
    log(repeater.sourcesString());
});

const seed = create({value : 10});

repeat("seedRepeater", (repeater) => {
    log(repeater.causalityString());
    dataA.foo = seed*2;
    log("with sources:")
    log(repeater.sourcesString());
});


// log("-------------------------------------------");
// dataB.fie = 3;
// log("-------------------------------------------");
// dataA.fum = 3;
log("-------------------------------------------");
seed.value = 5;
