'use strict';
require = require("esm")(module);
const {c} = require("../causality.js");
const {argumentsToArray } = require("./utility.js");


export class CausalityObject {

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
    if (inCachedCall !== null) {
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
      const activeContext = enterContext('cached_call', cacheRecord);
      // Never encountered these arguments before, make a new cache
      let returnValue = uponChangeDo(
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
