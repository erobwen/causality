'use strict';
require = require("esm")(module);
const {argumentsToArray } = require("./utility.js");
const log = console.log;


let contextsScheduledForPossibleDestruction = [];

// function emptyObserverSet(observerSet) {
//   return observerSet.contentsCounter === 0 && observerSet.first === null;
// }

//   // trace.context && logGroup(
//   //     "postPulseCleanup: " +
//   //         contextsScheduledForPossibleDestruction.length);

//   // log("post pulse cleanup");
//   contextsScheduledForPossibleDestruction.forEach(function(context) {
//     // log(context.directlyInvokedByApplication);
//     trace.context && logGroup(
//       "... consider remove context: " + context.type);
//     if (!context.directlyInvokedByApplication) {
//       trace.context && log(
//         "... not directly invoked by application... ");
//       if (emptyObserverSet(context.contextObservers)) {
//         trace.context && log("... empty observer set... ");
//         trace.context && log(
//           "Remove a context since it has no more observers, " +
//             "and is not directly invoked by application: " +
//             context.type);
//         context.disposeContextsRecursivley();
//       } else {
//         trace.context && log("... not empty observer set");
//       }
//     }
//     trace.context && logUngroup();
//   });
//   contextsScheduledForPossibleDestruction = [];


export function bindToInstance(instance) {
  const {observable, enterContext, 
    repeat, leaveContext, 
    invalidateObservers,  
    invalidateOnChange, recordDependency, 
    inCachedCall, withoutRecording} = instance;

  /************************************************************************
   *
   *                    Cached method signatures
   *
   *          (reused by cache, repeat and project)
   ************************************************************************/

  function compareArraysShallow(a, b) {
    if( typeof a !== typeof b )
      return false;
    
    if (a.length === b.length) {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  function isCachedInBucket(functionArgumentHashCaches, functionArguments) {
    if (functionArgumentHashCaches.length === 0) {
      return false;
    } else {
      // Search in the bucket!
      for (let i = 0; i < functionArgumentHashCaches.length; i++) {
        if (compareArraysShallow(
          functionArgumentHashCaches[i].functionArguments,
          functionArguments)) {
          return true;
        }
      }
      return false;
    }
  }

  // This is purley for testing
  let cachedCalls = 0;

  // This is purley for testing
  function cachedCallCount() {
    return cachedCalls;
  }

  // Get cache(s) for this argument hash
  function getFunctionCacher(object, cacheStoreName,
                             functionName, functionArguments) {
    let uniqueHash = true;
    function makeArgumentHash(argumentList) {
      let hash  = "";
      let first = true;
      argumentList.forEach(function (argument) {
        if (!first) {
          hash += ",";
        }

        if (typeof(argument.causality) !== 'undefined') {
          //typeof(argument) === 'object' &&
          hash += "{id=" + argument.causality.id + "}";
        } else if (typeof(argument) === 'number'
                   || typeof(argument) === 'string') {
          // String or integer
          hash += argument;
        } else {
          uniqueHash = false;
          hash += "{}";
          // Non-identifiable, we have to rely on the hash-bucket.
        }
      });
      return "(" + hash + ")";
    }
    let argumentsHash = makeArgumentHash(functionArguments);

    // let functionCaches = getMap(object, cacheStoreName, functionName);
    if (typeof(object[cacheStoreName]) === 'undefined') {
      object[cacheStoreName] = {};
    }
    if (typeof(object[cacheStoreName][functionName]) === 'undefined') {
      object[cacheStoreName][functionName] = {};
    }
    let functionCaches = object[cacheStoreName][functionName];

    return {
      cacheRecordExists : function() {
        // Figure out if we have a chache or not
        let result = null;
        if (uniqueHash) {
          result = typeof(functionCaches[argumentsHash])
            !== 'undefined';
        } else {
          let functionArgumentHashCaches =
              getArray(functionCaches,
                       "_nonpersistent_cacheBuckets" , argumentsHash);
          result = isCachedInBucket(
            functionArgumentHashCaches, functionArguments);
        }
        return result;
      },

      deleteExistingRecord : function() {
        if (uniqueHash) {
          let result = functionCaches[argumentsHash];
          delete functionCaches[argumentsHash];
          return result;
        } else {
          let functionArgumentHashCaches =
              getArray(functionCaches,
                       "_nonpersistent_cacheBuckets" ,
                       argumentsHash);
          for (let i=0; i < functionArgumentHashCaches.length; i++) {
            if (compareArraysShallow(
              functionArgumentHashCaches[i].functionArguments,
              functionArguments)) {
              let result = functionArgumentHashCaches[i];
              functionArgumentHashCaches.splice(i, 1);
              return result;
            }
          }
        }
      },

      getExistingRecord : function() {
        if (uniqueHash) {
          return functionCaches[argumentsHash]
        } else {
          let functionArgumentHashCaches =
              getArray(functionCaches,
                       "_nonpersistent_cacheBuckets" , argumentsHash);
          for (let i=0; i < functionArgumentHashCaches.length; i++) {
            if (compareArraysShallow(
              functionArgumentHashCaches[i].functionArguments,
              functionArguments)) {
              return functionArgumentHashCaches[i];
            }
          }
        }
      },

      createNewRecord : function() {
        if (uniqueHash) {
          if (typeof(functionCaches[argumentsHash]) === 'undefined') {
            functionCaches[argumentsHash] = {};
          }
          return functionCaches[argumentsHash];
          // return getMap(functionCaches, argumentsHash)
        } else {
          let functionArgumentHashCaches =
              getArray(functionCaches,
                       "_nonpersistent_cacheBuckets", argumentsHash);
          let record = {};
          functionArgumentHashCaches.push(record);
          return record;
        }
      }
    };
  }

  class CausalityObject {

    constructor(values) {
      Object.assign(this, values);
      return observable(this);
    }


    /************************************************************************
     *
     *  Merge into & forwarding/forwardTo
     *
     ************************************************************************/

    // Identity and state
    // mergeFrom : genericMergeFrom,
    // forwardTo : genericForwarder,
    // removeForwarding : genericRemoveForwarding,
    // mergeAndRemoveForwarding: genericMergeAndRemoveForwarding
    
    // 'removeForwarding' : true,
    // 'mergeAndRemoveForwarding' : true

    // function genericMergeFrom(otherObject) {
    //   return mergeInto(otherObject, this);
    // }

    // function genericForwarder(otherObject) {
    //   this.causality.forwardTo = otherObject;
    // }

    // function genericRemoveForwarding() {
    //   this.causality.forwardTo = null;
    // }

    // function genericMergeAndRemoveForwarding() {
    //   mergeOverlayIntoObject(this);
    // }

    /************************************************************************
     *
     *                    Generic repeat function
     *
     ************************************************************************/


    repeat() {
      // trace.context && logGroup("genericRepeatFunction:");
      // Split arguments
      let argumentsList = argumentsToArray(arguments);
      let functionName = argumentsList.shift();
      let functionCacher = getFunctionCacher(
        this.causality.handler, "_repeaters", functionName, argumentsList);

      if (!functionCacher.cacheRecordExists()) {
        // trace.context && log(">>> create new repeater... ");
        // Never encountered these arguments before, make a new cache
        let cacheRecord = functionCacher.createNewRecord();
        cacheRecord.independent = true;
        // Do not delete together with parent

        cacheRecord.remove = function() {
          // trace.context && log("remove cached_repeater");
          // trace.context && log(this, 2);
          functionCacher.deleteExistingRecord();
          // removeSingleChildContext(cacheRecord);
        }.bind(this);
        cacheRecord.contextObservers = {
          noMoreObserversCallback : function() {
            contextsScheduledForPossibleDestruction.push(cacheRecord);
          }
        };
        const activeContext = enterContext('cached_repeater', cacheRecord);
        
        // cacheRecord.remove = function() {};
        // Never removed directly, only when no observers
        // & no direct application call
        cacheRecord.repeaterHandle = repeat(function() {
          return this[functionName].apply(this, argumentsList);
        }.bind(this));
        leaveContext( activeContext );

        recordDependency(
          "functionCache.contextObservers",
          cacheRecord.contextObservers);
        // trace.context && logUngroup();
        return cacheRecord.repeaterHandle; // return something else...
      } else {
        // trace.context && log(">>> reusing old repeater... ");
        let cacheRecord = functionCacher.getExistingRecord();
        recordDependency(
          "functionCache.contextObservers",
          cacheRecord.contextObservers);
        // trace.context && logUngroup();
        return functionCacher.getExistingRecord().repeaterHandle;
      }
    }

    tryStopRepeat() {
      // Split arguments
      let argumentsList = argumentsToArray(arguments);
      let functionName = argumentsList.shift();
      let functionCacher = getFunctionCacher(
        this, "_repeaters", functionName, argumentsList);

      if (functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.getExistingRecord();
        if (emptyObserverSet(cacheRecord.contextObservers)) {
          functionCacher.deleteExistingRecord();
        }
      }
    }

    /************************************************************************
     *  Cached methods
     *
     * A cached method will not reevaluate for the same arguments, unless
     * some of the data it has read for such a call has changed. If there
     * is a parent cached method, it will be notified upon change.
     * (even if the parent does not actually use/read any return value)
     ************************************************************************/

    cachedInCache() {
      let argumentsArray = argumentsToArray(arguments);
      if (inCachedCall.value !== null) {
        return this.cached.apply(this, argumentsArray);
      } else {
        let functionName = argumentsArray.shift();
        return this[functionName].apply(this, argumentsArray);
      }
    }

    cached() {
      // Split arguments
      let argumentsList = argumentsToArray(arguments);
      let functionName = argumentsList.shift();
      let functionCacher = getFunctionCacher(this, "_cachedCalls",
                                             functionName, argumentsList);
      // wierd, does not work with this inestead of handler...

      if (!functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.createNewRecord();
        cacheRecord.independent = true;
        // Do not delete together with parent
        
        // Is this call non-automatic
        cacheRecord.remove = function() {
          // trace.context && log("remove cached_call");
          functionCacher.deleteExistingRecord();
          // removeSingleChildContext(cacheRecord);
        };

        cachedCalls++;
        const activeContext = enterContext("cached_call", cacheRecord);
        // Never encountered these arguments before, make a new cache
        let { returnValue } = invalidateOnChange(
          function () {
            let returnValue;
            // blockSideEffects(function() {
            returnValue = this[functionName].apply(this, argumentsList);
            // }.bind(this));
            return returnValue;
          }.bind(this),
          function () {
            // Delete function cache and notify
            let cacheRecord = functionCacher.deleteExistingRecord();
            invalidateObservers("functionCache.contextObservers",
                                  cacheRecord.contextObservers);
          }.bind(this));
        leaveContext( activeContext );
        cacheRecord.returnValue = returnValue;
        cacheRecord.contextObservers = {
          noMoreObserversCallback : function() {
            contextsScheduledForPossibleDestruction.push(cacheRecord);
          }
        };
        recordDependency("functionCache.contextObservers",
                                  cacheRecord.contextObservers);
        return returnValue;
      } else {
        // Encountered these arguments before, reuse previous repeater
        let cacheRecord = functionCacher.getExistingRecord();
        recordDependency("functionCache.contextObservers",
                                  cacheRecord.contextObservers);
        return cacheRecord.returnValue;
      }
    }

    tryUncache() {
      // Split arguments
      let argumentsList = argumentsToArray(arguments);
      let functionName = argumentsList.shift();

      // Cached
      let functionCacher = getFunctionCacher(
        this.causality.handler, "_cachedCalls", functionName, argumentsList);

      if (functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.getExistingRecord();
        cacheRecord.directlyInvokedByApplication = false;
        contextsScheduledForPossibleDestruction.push(cacheRecord);
      }

      // Re cached
      functionCacher = getFunctionCacher(
        this.causality.handler, "_reCachedCalls", functionName, argumentsList);

      if (functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.getExistingRecord();
        cacheRecord.directlyInvokedByApplication = false;
        contextsScheduledForPossibleDestruction.push(cacheRecord);
      }
    }


    /************************************************************************
     *
     *  Projection (continous creation and infusion)
     *
     ************************************************************************/

    // cached : genericCallAndCacheFunction,
    // cachedInCache : genericCallAndCacheInCacheFunction,
    // tryUncache : genericUnCacheFunction,

    reCachedInCache() {
      let argumentsArray = argumentsToArray(arguments);
      if (inReCache) {
        return this.reCached.apply(this, argumentsArray);
      } else {
        let functionName = argumentsArray.shift();
        return this[functionName].apply(this, argumentsArray);
      }
    }

    reCached() {
      // log("call reCache");
      // Split argumentsp
      let argumentsList = argumentsToArray(arguments);
      let functionName = argumentsList.shift();
      let functionCacher = getFunctionCacher(
        this.causality.handler, "_reCachedCalls", functionName, argumentsList);

      if (!functionCacher.cacheRecordExists()) {
        // log("init reCache ");
        let cacheRecord = functionCacher.createNewRecord();
        cacheRecord.independent = true;
        // Do not delete together with parent
        
        cacheRecord.cacheIdObjectMap = {};
        cacheRecord.remove = function() {
          // trace.context && log("remove reCache");
          functionCacher.deleteExistingRecord();
          // removeSingleChildContext(cacheRecord); // Remove recorder
        };

        // Is this call non-automatic
        cacheRecord.directlyInvokedByApplication = (context === null);

        // Never encountered these arguments before, make a new cache
        const activeContext = enterContext('reCache', cacheRecord);
        cacheRecord.contextObservers = {
          noMoreObserversCallback : function() {
            contextsScheduledForPossibleDestruction.push(cacheRecord);
          }
        };
        cacheRecord.repeaterHandler = repeat(
          function () {
            cacheRecord.newlyCreated = [];
            let newReturnValue;
            // log("better be true");
            // log(inReCache);
            newReturnValue = this[functionName].apply(
              this, argumentsList);
            // log(cacheRecord.newlyCreated);

            // log("Assimilating:");
            withoutRecording(function() {
              // Do not observe reads from the forwardTos
              cacheRecord.newlyCreated.forEach(function(created) {
                if (created.causalityForwardTo !== null) {
                  // log("Has forwardTo!");
                  // log(created.causality.forwardTo);
                  mergeOverlayIntoObject(created);
                } else {
                  // log("Infusion id of newly created:");
                  // log(created.causality.buildId);
                  if (created.causality.buildId !== null) {

                    cacheRecord.cacheIdObjectMap[
                      created.causality.buildId] = created;
                  }
                }
              });
            }.bind(this));

            // See if we need to trigger event on return value
            if (newReturnValue !== cacheRecord.returnValue) {
              cacheRecord.returnValue = newReturnValue;
              invalidateObservers(
                "functionCache.contextObservers",
                cacheRecord.contextObservers);
            }
          }.bind(this)
        );
        leaveContext( activeContext );
        recordDependency(
          "functionCache.contextObservers",
          cacheRecord.contextObservers);
        return cacheRecord.returnValue;
      } else {
        // Encountered these arguments before, reuse previous repeater
        let cacheRecord = functionCacher.getExistingRecord();
        recordDependency(
          "functionCache.contextObservers",
          cacheRecord.contextObservers);
        return cacheRecord.returnValue;
      }
    }
  }

  return {
    CausalityObject,
    cachedCallCount
  }
}
