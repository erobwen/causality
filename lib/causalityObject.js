'use strict';
require = require("esm")(module);
const {argumentsToArray } = require("./utility.js");
const log = console.log;


export function bindToInstance(instance) {

  const {c, enterContext, leaveContext, invalidateOnChange, registerAnyChangeObserver, inCachedCall} = instance;

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

        if (typeof(argument.__id) !== 'undefined') {
          //typeof(argument) === 'object' &&
          hash += "{id=" + argument.__id + "}";
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
      return c(this);
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
          trace.context && log("remove cached_call");
          functionCacher.deleteExistingRecord();
          // removeSingleChildContext(cacheRecord);
        };

        cachedCalls++;
        const activeContext = enterContext("cached_call", cacheRecord);
        // Never encountered these arguments before, make a new cache
        let returnValue = invalidateOnChange(
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
            notifyChangeObservers("functionCache.contextObservers",
                                  cacheRecord.contextObservers);
          }.bind(this));
        leaveContext( activeContext );
        cacheRecord.returnValue = returnValue;
        cacheRecord.contextObservers = {
          noMoreObserversCallback : function() {
            contextsScheduledForPossibleDestruction.push(cacheRecord);
          }
        };
        registerAnyChangeObserver("functionCache.contextObservers",
                                  cacheRecord.contextObservers);
        return returnValue;
      } else {
        // Encountered these arguments before, reuse previous repeater
        let cacheRecord = functionCacher.getExistingRecord();
        registerAnyChangeObserver("functionCache.contextObservers",
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
        this.__handler, "_cachedCalls", functionName, argumentsList);

      if (functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.getExistingRecord();
        cacheRecord.directlyInvokedByApplication = false;
        contextsScheduledForPossibleDestruction.push(cacheRecord);
      }

      // Re cached
      functionCacher = getFunctionCacher(
        this.__handler, "_reCachedCalls", functionName, argumentsList);

      if (functionCacher.cacheRecordExists()) {
        let cacheRecord = functionCacher.getExistingRecord();
        cacheRecord.directlyInvokedByApplication = false;
        contextsScheduledForPossibleDestruction.push(cacheRecord);
      }
    }
  }

  return {
    CausalityObject,
    cachedCallCount
  }
}
