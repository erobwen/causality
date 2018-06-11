const s = require('./setup.js');
const log = console.log.bind(console);

renderL();

function renderL(){
    const b = new s.B(1);
    repeat(()=>{
        let res = "";
 
        res += `B ${b.obs.id}\n`;
        for( let l of b.listL ){
            res += `  L ${l.obs.id}\n`;
            res += renderA( l );
        }
        log( res );
    });
}

const state = c({});

function renderA( l ){
    if( l.obs.id in state ) return state[ l.obs.id ];
    //log('setup renderA ' + l.obs.id );
    
    repeat(()=>{
        let res = "";
        for( let a of l.listA ){
            log('a',a);
            res += '    A' + a.obs.id + "\n";
        }
        state[ l.obs.id ] = res;
    });

    return state[ l.obs.id ];
}
