const s = require('./setup.js');
const log = console.log.bind(console);

let cntL = 0;
let cntA = 0;
let cntD = 0;

renderL();

function renderL(){
    const b = new s.B(1);
    repeat(()=>{
        
        if( ++cntL > 100 ) process.exit();
        console.info('*renderL repeated', cntL);

        let res = "";
 
        res += `B ${b.obs.id}\n`;
        for( let l of b.listL ){
            res += `  L ${l.obs.id}\n`;
            res += renderA( l );
        }
        //process.stdout.write('\033c');
        log( res );
    }, {throttle:5});
}

const state = c({});

function renderA( l ){
    if( l.obs.id in state ) return state[ l.obs.id ];
    //console.info('setup renderA ' + l.obs.id );
    
    setTimeout(()=>{
        repeat(()=>{
            console.info('*renderA repeated', ++cntA);

            let res = "";
            for( let a of l.listA ){
                res += `    A ${a.obs.id}\n`;

                if( a.listR[0] )
                    res += `    R0 ${a.listR[0].obs.id}\n`;

                res += renderD( a );
            }
            state[ l.obs.id ] = res;
        });
    });

    return state[ l.obs.id ] || '';
}


function renderD( a ){
    if( a.obs.id in state ) return state[ a.obs.id ];
    //console.info('setup renderD ' + a.obs.id );

    setTimeout(()=>{
        repeat(()=>{
            console.info('*renderD repeated', ++cntD);
            const b = new s.B(1);
            let res = "";
            for( let bd of b.listD ){
                const ad = a.listD;
                const inc = ad.map( d => d.obs.id ).includes( bd.obs.id );
 
                res += `      D ${inc?'+':'-'} ${bd.obs.id}\n`;
            }
            state[ a.obs.id ] = res;
        });
    });

    return state[ a.obs.id ] || '';
}
