
let sourcesObserverSetChunkSize = 500;

export function defaultDependencyInterfaceCreator(causality) {

  const state = causality.state;
  const invalidateObserver = causality.invalidateObserver;

  function createObserverSet(description, optionalKey, handler) {
    if (typeof(optionalKey) !== "string") {
      handler = optionalKey;
      optionalKey = null;
    }
    return {
      description : description,
      key: optionalKey,
      handler: handler,
      isRoot : true,
      contents : {},
      contentsCounter : 0,
      first : null,
      last : null,
    }
  }

  function recordDependency(observer, observerSet, optionalKey) {
    let observerId = observer.id;
    //console.log("recordDependency", observer, observerSet);
    if (typeof(observerSet.contents[observerId]) !== 'undefined') {
      return;
    }

    if (observerSet.contentsCounter === sourcesObserverSetChunkSize &&
        observerSet.last !== null) {
      observerSet = observerSet.last;
      if (typeof(observerSet.contents[observerId]) !== 'undefined') {
        return;
      }
    }
    if (observerSet.contentsCounter === sourcesObserverSetChunkSize) {
      let newChunk =
        {
          isRoot : false,
          contents: {},
          contentsCounter: 0,
          next: null,
          previous: null,
          parent: null
        };
      if (observerSet.isRoot) {
        newChunk.parent = observerSet;
        observerSet.first = newChunk;
        observerSet.last = newChunk;
      } else {
        observerSet.next = newChunk;
        newChunk.previous = observerSet;
        newChunk.parent = observerSet.parent;
        observerSet.parent.last = newChunk;
      }
      observerSet = newChunk;
    }

    // Add repeater on object beeing observed,
    // if not already added before
    let observerSetContents = observerSet.contents;
    if (typeof(observerSetContents[observerId]) === 'undefined') {
      observerSet.contentsCounter = observerSet.contentsCounter + 1;
      observerSetContents[observerId] = observer;

      // Note dependency in repeater itself (for cleaning up)
      observer.sources.push(observerSet);
    }
  }

  function invalidateObservers(observers, proxy, key) {
    state.postponeInvalidation++;

    if (state.blockInvalidation > 0) {
      return;
    }

    let contents = observers.contents;
    for (let id in contents) {
      invalidateObserver(contents[id], proxy, key);
    }

    if (typeof(observers.first) !== 'undefined') {
      let chainedObserverChunk = observers.first;
      while(chainedObserverChunk !== null) {
        let contents = chainedObserverChunk.contents;
        for (let id in contents) {
          invalidateObserver(contents[id], proxy, key);
        }
        chainedObserverChunk = chainedObserverChunk.next;
      }
    }

    state.postponeInvalidation--;
    causality.proceedWithPostponedInvalidations();
  }

  function removeFromObserverSet(id, observerSet) {
    let observerSetContents = observerSet['contents'];
    delete observerSetContents[id];
    let noMoreObservers = false;
    observerSet.contentsCounter--;
    // trace.context && log(
    //     "observerSet.contentsCounter: " +
    //         observerSet.contentsCounter);
    if (observerSet.contentsCounter == 0) {
      if (observerSet.isRoot) {
        if (observerSet.first === null &&
            observerSet.last === null) {
          noMoreObservers = true;
        }
      } else {
        if (observerSet.parent.first === observerSet) {
          observerSet.parent.first === observerSet.next;
        }

        if (observerSet.parent.last === observerSet) {
          observerSet.parent.last
            === observerSet.previous;
        }

        if (observerSet.next !== null) {
          observerSet.next.previous =
            observerSet.previous;
        }

        if (observerSet.previous !== null) {
          observerSet.previous.next = observerSet.next;
        }

        observerSet.previous = null;
        observerSet.next = null;

        if (observerSet.parent.first === null &&
            observerSet.parent.last === null) {
          noMoreObservers = true;
        }
      }

      if (noMoreObservers && typeof(observerSet.handler.proxy.onRemovedLastObserver) === "function") {
        observerSet.handler.proxy.onRemovedLastObserver(observerSet.description, observerSet.key)
      }
    }
  }

  return {
    
    recordDependencyOnArray: (observer, handler) => {
      if (handler._arrayObservers === null) {
        handler._arrayObservers = createObserverSet("arrayDependees", handler);
      }
      recordDependency(observer, handler._arrayObservers);//object
    },

    recordDependencyOnEnumeration: (observer, handler) => {
      if (typeof(handler._enumerateObservers) === 'undefined') {
        handler._enumerateObservers = createObserverSet("enumerationDependees", handler);
      }
      recordDependency(observer, handler._enumerateObservers);
    },

    recordDependencyOnProperty: (observer, handler, key) => {   
      // Note: if key == toString this will break!!!
      if (key === "toString") return;
      if (typeof(handler._propertyObservers) ===  'undefined') {
        handler._propertyObservers = {};
      }
      if (typeof(handler._propertyObservers[key]) ===  'undefined') {
        handler._propertyObservers[key] = createObserverSet("propertyDependees", key, handler);
      }
      recordDependency(observer, handler._propertyObservers[key], key);
    },

    invalidateArrayObservers: (handler, key) => {  
      if (handler._arrayObservers !== null) {
        invalidateObservers(handler._arrayObservers, handler.proxy, key);
      }
    },

    invalidatePropertyObservers: (handler, key) => {
      if (typeof(handler._propertyObservers) !== 'undefined' &&
          typeof(handler._propertyObservers[key]) !== 'undefined') {
        invalidateObservers(handler._propertyObservers[key], handler.proxy, key);
      }
    },

    invalidateEnumerateObservers: (handler, key) => {
      if (typeof(handler._enumerateObservers) !== 'undefined') {
        invalidateObservers(handler._enumerateObservers, handler.proxy, key);
      }
    }, 

    removeAllSources: (observer) => {
      const observerId = observer.id;
      // trace.context && logGroup(`remove invalidator ${observer.id}`);
      // Clear out previous observations
      observer.sources.forEach(function(observerSet) {
        removeFromObserverSet(observerId, observerSet);
      
      });
      observer.sources.length = 0;  // From repeater itself.
      // trace.context && logUngroup();
    }
  }
}
