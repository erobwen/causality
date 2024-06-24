const s = require('./setup.js');
const log = console.log.bind(console);

renderExpected();

async function renderExpected(){
    const b = new s.B(1);
    log("B", b.obs.id );

    for( let l of await b.listLP() ){
        log( '  L', l.obs.id );
        for( let a of await l.listAP() ){
            log( '    A', a.obs.id );
            
            const r = [... await a.listRP() ];
            log( '    R0', r[0].obs.id );
            
            for( let bd of await b.listDP() ){
                const ad = [... await a.listDP() ];
                const inc = ad.map( d => d.obs.id ).includes( bd.obs.id );
                log( '      D', inc?'+':'-', bd.obs.id );
            }
        }
    }
}
