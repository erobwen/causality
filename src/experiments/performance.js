import mobx from "mobx"; 
import { getWorld } from "../causality.js";
const { observable, repeat } = getWorld()

const log = console.log.bind(console);

log("Performance");
var amount = 100000;
//var amount = 10;


/******************************************************************/
// Plain

var count = 0;
function plain_reaction(obj){
	count += obj.length;
}

console.time("plain");
var mylist = [];
while( mylist.length < amount ){
	var obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: ['causality', 'muffins'],
	};

	mylist.push(obj);
	plain_reaction(obj.hobby);
}
for( let element of mylist ){
	element.hobby.push('drapes');
	plain_reaction(element.hobby);
}
console.timeEnd("plain");
log( count );

/******************************************************************/
// Proxy

function createX(object) {
  return new Proxy(object, {
    getPrototypeOf : function(target) {
      //console.log("getPrototypeOf");
      return Object.getPrototypeOf(target);
    },

    setPrototypeOf : function(target, prototype) {
      console.log("setPrototypeOf");
      Object.setPrototypeOf(target, prototype);
    },

    isExtensible : function() {
      console.log("isExtensible");
    },

    preventExtensions : function() {
      console.log("preventExtensions");
    },

    apply : function() {
      console.log("apply");
    },

    construct : function() {
      console.log("construct");
    },

    get: function (target, key) {
			if( typeof key !== 'string' ){
				return undefined;
			}
      //console.log("get " + key);
      return target[key]; //  || undefined;
    },

    set: function (target, key, value) {
      //console.log("set " + key);
      target[key] = value;
			plain_reaction( target ); /// SIMPLE REACTION TEST (runs twice per push )
      return true;
    },

    deleteProperty: function (target, key) {
      console.log("deleteProperty " + key);
      if (!(key in target)) {
        return false;
      } else {
        delete target[key];
        return true;
      }
    },

    ownKeys: function (target, key) { // Not inherited?
      //console.log("ownKeys");
      var keys = Object.keys(target);
      let result = [];
      keys.forEach(function(key) {
        result.push(key);
      });
      result.push('length');
      return result;
    },

    has: function (target, key) {
      console.log("has");
      return key in target;
    },

    defineProperty: function (target, key, oDesc) {
      console.log("defineProperty");
      invalidateObservers("_enumerateObservers", target._enumerateObservers);
      return target;
    },

    getOwnPropertyDescriptor: function (target, key) {
      //console.log("getOwnPropertyDescriptor");
      return Object.getOwnPropertyDescriptor(target, key);
    }
  });
}

console.time("proxy");
count = 0;
mylist = [];
while( mylist.length < amount ){
    let obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: createX(['causality', 'muffins']),
	};

	let xobj = createX(obj);
	
	mylist.push(xobj);
	plain_reaction(xobj.hobby);
}
for( let element of mylist ){
	element.hobby.push('drapes');
}
console.timeEnd("proxy");
log( count );


/******************************************************************/

console.time("causality");
count = 0;
mylist = [];
while( mylist.length < amount ){
  let obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: observable(['causality', 'muffins']),
	};
  let xobj = observable(obj);
	mylist.push(xobj);

	repeat(function(){
		count += xobj.hobby.length;
	});
}
for( let element of mylist ){
    // console.time("element");
	element.hobby.push('drapes');
    // console.timeEnd("element");
}
console.timeEnd("causality");
log( count );


/******************************************************************/

console.time("mobx");
count = 0;
mylist = [];
while( mylist.length < amount ){
	let obj = {
		name: "Bert",
		birth: new Date(1980,5,5),
		hobby: ['causality', 'muffins'],
	};
	let xobj = mobx.observable(obj);
	mylist.push(xobj);

	mobx.autorun(function(){
		count += xobj.hobby.length;
	});
}
for( let element of mylist ){
	element.hobby.push('drapes');
}
console.timeEnd("mobx");
log( count );


/******************************************************************/


//log( mylist );
