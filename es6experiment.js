function createX(object) {
    return new Proxy(object, {
        getPrototypeOf : function(target) {
            console.log("getPrototypeOf");
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
            console.log("get " + key);
            // registerAnyChangeObserver("_propertyObservers." + key, getMap(target._propertyObservers, key));
            return target[key]; //  || undefined;
        },

        set: function (target, key, value) {
            console.log("set " + key);
            target[key] = value;
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
            console.log("ownKeys");
            // registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
            var keys = Object.keys(target);
            let result = [];
            keys.forEach(function(key) {
                if (!startsWith('_', key)) {
                    result.push(key);
                }
            });
            result.push('length');
            return result;
        },

        has: function (target, key) {
            console.log("has");
            // TODO: Check against key starts with "_¤"
            registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
            return key in target;
        },

        defineProperty: function (target, key, oDesc) {
            console.log("defineProperty");
            notifyChangeObservers("_enumerateObservers", target._enumerateObservers);
            // if (oDesc && "value" in oDesc) { target.setItem(key, oDesc.value); }
            return target;
        },

        getOwnPropertyDescriptor: function (target, key) {
            console.log("getOwnPropertyDescriptor");
            registerAnyChangeObserver("_enumerateObservers", target._enumerateObservers);
            return Object.getOwnPropertyDescriptor(target, key);
        }
    });
}



var a = createX(['a', 'b']);
console.log("Pushing to array");
a.push('c')


console.log("Setting length to 0");
a.length = 0;