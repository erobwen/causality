let causality = require('../causality');
// import causality from "..causality.js";
causality.install();
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
        causality.withoutRecording(() => {
            result = "DataStore:" + me.name + ":" +  me.causality.id;
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

causality.repeat("sumRepeater", (repeater) => {
    log(repeater.causalityString());
    const aSum = dataA.sum();
    const bSum = dataB.sum();
    result = aSum + bSum;
    log(repeater.sourcesString());
});

const seed = create({value : 10});

causality.repeat("seedRepeater", (repeater) => {
    dataA.foo = seed*2;
});


log("-------------------------------------------");
dataB.fie = 3;
log("-------------------------------------------");
dataA.fum = 3;
log("-------------------------------------------");
seed.value = 5;
