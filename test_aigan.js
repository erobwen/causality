require('./causality').install();

const log = console.log.bind(console);
var state = create({});

repeatOnChange(function(){
    log("Hobby changed");
    console.log(typeof(state.a));
    var x = state.a;
    for( let key in state ){
        if( key.match(/^_/) ) continue;
        if( state[key].hobby ){
            log( key +" has "+ state[key].hobby.length +" hobbies");
        }
    }
    // console.log(state.a);
    // if (typeof(state.a) !== 'undefined') {
    //     console.log(state.a.hobby);
    //     if (typeof(state.a.hobby) !== 'undefined') {
    //         console.log(state.a.hobby.length);
    //     }
    // }
});
console.log("Setting a");
state.a = c({name:"Apa"});
console.log("Setting a.hobby");
state.a.hobby = c([]);
console.log("Pushing to hobby");
state.a.hobby.push('causality');