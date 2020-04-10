
let sourcesObserverSetChunkSize = 500;

export function defaultDependencyInterfaceCreator(causality) {

  const state = causality.state;
  const invalidateObserver = causality.invalidateObserver;

  function createObserverSet(description) {
    return {
      description : description,
      isRoot : true,
      contents : {},
      contentsCounter : 0,
      initialized : true,
      first : null,
      last : null,
    }
  }

  function recordDependency(observer, description, observerSet) {
    if (typeof(observer) === "string") {
      observerSet = description;
      description = observer; 
      observer = activeRecorder;
    }
    
    // instance can be a cached method if observing its return value,
    // object & definition only needed for debugging.

    if (observer !== null) {
      let observerId = observer.id;

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
  }

  function invalidateObservers(description, observers) {
    if (typeof(observers.initialized) !== 'undefined') {
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
    }
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

      if (noMoreObservers &&
          typeof(observerSet.noMoreObserversCallback)
          !== 'undefined') {
        observerSet.noMoreObserversCallback();
      }
    }
  }

  return {
    
    recordDependencyOnArray: (observer, handler) => {
      if (handler._arrayObservers === null) {
        handler._arrayObservers = createObserverSet();
      }
      recordDependency(observer, "_arrayObservers", handler._arrayObservers);//object
    },

    recordDependencyOnEnumeration: (observer, handler) => {
      if (typeof(handler._enumerateObservers) === 'undefined') {
        handler._enumerateObservers = createObserverSet();
      }
      recordDependency(observer, "_enumerateObservers", handler._enumerateObservers);
    },

    recordDependencyOnProperty: (observer, handler, key) => {    
      if (typeof(handler._propertyObservers) ===  'undefined') {
        handler._propertyObservers = {};
      }
      if (typeof(handler._propertyObservers[key]) ===  'undefined') {
        handler._propertyObservers[key] = createObserverSet();
      }
      recordDependency(observer, "_propertyObservers." + key, handler._propertyObservers[key]);
    },

    invalidateArrayObservers: (handler) => {  
      if (handler._arrayObservers !== null) {
        invalidateObservers("_arrayObservers", handler._arrayObservers);
      }
    },

    invalidatePropertyObservers: (handler, key) => {
      if (typeof(handler._propertyObservers) !== 'undefined' &&
          typeof(handler._propertyObservers[key]) !== 'undefined') {
        invalidateObservers("_propertyObservers." + key, handler._propertyObservers[key]);
      }
    },

    invalidateEnumerateObservers: (handler) => {
      if (typeof(handler._enumerateObservers) !== 'undefined') {
        invalidateObservers("_enumerateObservers", handler._enumerateObservers);
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
