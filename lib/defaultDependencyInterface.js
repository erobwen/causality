
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

  function recordDependency(observer, observerSet) {
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

  function invalidateObservers(observers) {
    state.postponeInvalidation++;

    if (state.blockInvalidation > 0) {
      return;
    }

    let contents = observers.contents;
    for (let id in contents) {
      invalidateObserver(contents[id]);
    }

    if (typeof(observers.first) !== 'undefined') {
      let chainedObserverChunk = observers.first;
      while(chainedObserverChunk !== null) {
        let contents = chainedObserverChunk.contents;
        for (let id in contents) {
          invalidateObserver(contents[id]);
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
      const metaKey = "_" +key; // To avoid problems with "toSring" and similar. 
      if (typeof(handler._propertyObservers) ===  'undefined') {
        handler._propertyObservers = {};
      }
      if (typeof(handler._propertyObservers[metaKey]) ===  'undefined') {
        handler._propertyObservers[metaKey] = createObserverSet("propertyDependees", key, handler);
        //console.log("observerSet", key, "set to", typeof handler._propertyObservers[metaKey]);
      }

      //console.log("call recordDependency", typeof key, key, "with", typeof handler._propertyObservers[metaKey] );
      recordDependency(observer, handler._propertyObservers[metaKey]);
    },

    invalidateArrayObservers: (handler) => {  
      if (handler._arrayObservers !== null) {
        invalidateObservers(handler._arrayObservers);
      }
    },

    invalidatePropertyObservers: (handler, key) => {
      const metaKey = "_" +key; // To avoid problems with "toSring" and similar.
      if (typeof(handler._propertyObservers) !== 'undefined' &&
          typeof(handler._propertyObservers[metaKey]) !== 'undefined') {
        invalidateObservers(handler._propertyObservers[metaKey]);
      }
    },

    invalidateEnumerateObservers: (handler) => {
      if (typeof(handler._enumerateObservers) !== 'undefined') {
        invalidateObservers(handler._enumerateObservers);
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
