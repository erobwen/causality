'use strict';
require('../../causality').install();
const log = console.log.bind(console);

const graph = {
    1: {a: [2,3,4,5,6] },
    2: {a: [7,8,9], b: 10},
    3: {a: [8], b: 11},
    4: {a: [9], b: 11},
    5: {a: [8], b: 12},
    6: {a: [9], b: 12},
    7: {},
    8: {},
    9: {},
    10: {b: 13},
    11: {b: 14},
    12: {b: 14},
};

const state = {};

function stateGet( id, o ){
    if( state[id] ) return state[id];
    state[id] = o;
    o.obs = o({id});
    return o;
}

class C {
    constructor( id ){
        if( state[id] ) return state[id];
        state[id] = this;
        this.obs = o({id});

        const props = this.constructor.properties || {};
        const name = this.constructor.name;
        for( let prop of Object.keys( props ) ){
            const propP = prop+'P';
            if( this[propP] ){
                const propS = '_' + prop;
                const nameR = `${name}.${prop}`;

                this[propS] = o([]);
                setTimeout(()=>
                           
                           repeat(nameR, async con=>{
                               //log(`*${nameR} repeated`);
                               const res = await this[propP](con);

                               // Does update outside recording context
                               this._updateArray(propS, res);
                           })
                           
                           ,1);
                
                Object.defineProperty( this, prop, {
                    value: this[propS],
                    enumerable: true,
                    writable: false,
                });
                
                //log('**prop', prop);
            }
        }
                
        //log( '**props', this.constructor.properties );

        return this;
    }

    async listP( context, ofClass ){
        const newlist = [];
        for( let id of graph[this.obs.id].a ){
            newlist.push( new ofClass( id ) );
        }
        return newlist;
    }

    async relP( ofClass ){
        const id = graph[this.obs.id].b;
        return new ofClass( id );
    }

    _updateArray( prop, content ){
		if( !this[prop] ) return this[prop] = o(Array.from(content));
		this[prop].splice( 0, this[prop].length, ... content );
		return this[prop];
	}
}

class B extends C {
    static get properties(){return{
        listL: Array,
        listD: Array,
    }}

    async listLP( context = emptyContext() ){
        const newlist = new Map();
        for( let r of await context.record(()=> this.listP( context, R ) ) ){
            const l = await context.record(()=> r.relLP( context ) );
            
            if( newlist.has( l.obs.id ) ) continue;
            
            context.record(()=> newlist.set( l.obs.id, l ) );
        }
        
        return newlist.values();
    }

    async listDP( context = emptyContext() ){
        const newlist = new Map();
        for( let r of await context.record(()=> this.listP( context, R ) ) ){
            for( let d of await context.record(()=> r.listP( context, D ) ) ){
                if( newlist.has( d.obs.id ) ) continue;
                context.record(()=> newlist.set( d.obs.id, d ) );
            }
        }

        return newlist.values();
    }
}

class R extends C {
    async relLP( context = emptyContext() ){
        const a = await context.record(()=> this.relP( A ) );
        const l = await context.record(()=> a.relP( L ) );
        return l;
    }
}


class D extends C {}

class A extends C {
    static get properties(){return{
        listR: Array,
        listD: Array,
    }}

    async listRP( context = emptyContext() ){
        const b = new B(1);
        const newlist = new Map();
        for( let r of await context.record(()=> b.listP( context, R ) ) ){
            const a = await context.record(()=> r.relP( A ) );

            if( a.obs.id !== this.obs.id ) continue;

            context.record(()=> newlist.set( r.obs.id, r) );
        }

        return newlist.values();
    }

    async listDP( context = emptyContext() ){
        const newlist = new Map();
        for( let r of await context.record(()=> this.listRP( context ) ) ){
            for( let d of await context.record(()=> r.listP( context, D ) ) ){
                context.record(()=> newlist.set( d.obs.id, d) );
            }
        }

        return newlist.values();
    }
}

class L extends C {
    static get properties(){return{
        listA: Array,
    }}

    async listAP( context = emptyContext() ){
        const b = new B(1);
        const newlist = new Map();
        for( let r of await context.record(()=> b.listP( context, R ) ) ){
            const a = await context.record(()=> r.relP( A ) );
            const l = await context.record(()=> r.relLP( context ) );

            if( l.obs.id !== this.obs.id ) continue;

            context.record(()=> newlist.set( a.obs.id, a) );
        }

        return newlist.values();
    }
}

module.exports.B = B;
