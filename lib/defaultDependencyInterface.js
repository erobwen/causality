
let sourcesObserverSetChunkSize = 500;

export function defaultDependencyInterfaceCreator(causality) {

  const state = causality.state;
  const invalidateObserver = causality.invalidateObserver;

  function recordDependency(recorder, description, observerSet) {
    if (typeof(recorder) === "string") {
      observerSet = description;
      description = recorder; 
      recorder = activeRecorder;

    }
    // instance can be a cached method if observing its return value,
    // object & definition only needed for debugging.

    if (recorder !== null) {
      if (typeof(observerSet.initialized) === 'undefined') {
        observerSet.description = description;
        observerSet.isRoot = true;
        observerSet.contents = {};
        observerSet.contentsCounter = 0;
        observerSet.initialized = true;
        observerSet.first = null;
        observerSet.last = null;
      }

      let recorderId = recorder.id;

      if (typeof(observerSet.contents[recorderId]) !== 'undefined') {
        return;
      }

      if (observerSet.contentsCounter === sourcesObserverSetChunkSize &&
          observerSet.last !== null) {
        observerSet = observerSet.last;
        if (typeof(observerSet.contents[recorderId]) !== 'undefined') {
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
      if (typeof(observerSetContents[recorderId]) === 'undefined') {
        observerSet.contentsCounter = observerSet.contentsCounter + 1;
        observerSetContents[recorderId] = recorder;

        // Note dependency in repeater itself (for cleaning up)
        recorder.sources.push(observerSet);
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



  return {
    
    recordDependencyOnArray: (recorder, handler) => {
      if (handler._arrayObservers === null) {
        handler._arrayObservers = {};
      }
      recordDependency(recorder, "_arrayObservers", handler._arrayObservers);//object
    },

    recordDependencyOnEnumeration: (recorder, handler) => {
      if (typeof(handler._enumerateObservers) === 'undefined') {
        handler._enumerateObservers = {};
      }
      recordDependency(recorder, "_enumerateObservers", handler._enumerateObservers);
    },

    recordDependencyOnProperty: (recorder, handler, key) => {    
      if (typeof(handler._propertyObservers) ===  'undefined') {
        handler._propertyObservers = {};
      }
      if (typeof(handler._propertyObservers[key]) ===  'undefined') {
        handler._propertyObservers[key] = {};
      }
      recordDependency(recorder, "_propertyObservers." + key, handler._propertyObservers[key]);
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
    }
  }
}
