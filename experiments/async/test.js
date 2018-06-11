const s = require('./setup.js');
const log = console.log.bind(console);

renderL();

function renderL(){
    const b = new s.B(1);
    repeat(()=>{
        log("\nB", b.obs.id );
        for( let l of b.listL ){
            log( '  L', l.obs.id );
            renderA( l );
        }
    });
}

function renderA( l ){
    repeat(()=>{
        for( let a of l.listA ){
            log( '    A', a.obs.id );
        }
    });
}
