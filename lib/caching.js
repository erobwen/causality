
export function createCachingFunction(observable) {

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

  function isCachedInBucket(signaturesCacheBucket, argumentList) {
    if (signaturesCacheBucket.length === 0) {
      return false;
    } else {
      // Search in the bucket!
      for (let i = 0; i < signaturesCacheBucket.length; i++) {
        if (compareArraysShallow(
          signaturesCacheBucket[i].argumentList,
          argumentList)) {
          return true;
        }
      }
      return false;
    }
  }

  function cacheRecordExists(signaturesCaches, {signature, unique, argumentList}) {
    if (unique) {
      return typeof(signaturesCaches[signature]) !== 'undefined';
    } else {
      if (typeof(signaturesCaches[signature]) === 'undefined') return false;
      return isCachedInBucket(signaturesCaches[signature], argumentList);
    }
  }


  function getExistingRecord(signaturesCaches, {signature, unique, argumentList}) {
    if (unique) {
      return signaturesCaches[signature]
    } else {
      let signaturesCacheBucket = signaturesCaches[signature];
      for (let i=0; i < signaturesCacheBucket.length; i++) {
        if (compareArraysShallow(signaturesCacheBucket[i].argumentList, argumentList)) {
          return signaturesCacheBucket[i].value;
        }
      }
    }
  }

  function deleteExistingRecord(signaturesCaches, {signature, unique, argumentList}) {
    if (unique) {
      delete signaturesCaches[signature];
      return;
    } else {
      let signaturesCacheBucket = signaturesCaches[signature];
      for (let i=0; i < signaturesCacheBucket.length; i++) {
        if (compareArraysShallow(signaturesCacheBucket[i].argumentList, functionArguments)) {
          signaturesCacheBucket.splice(i, 1);
          return;
        }
      }
    }
  }

  function createNewRecord(signaturesCaches, {signature, unique, argumentList}, value) {
    if (unique) {
      signaturesCaches[signature] = value;
    } else {
      let signaturesCacheBucket = signaturesCaches[signature];
      if (!signaturesCacheBucket) {
        signaturesCacheBucket = observable([]);
        signaturesCaches[signature] = signaturesCacheBucket;
      }
      signaturesCacheBucket.push({argumentList, value });
    }
  }

  function getArgumentSignature(argumentList) {
    let unique = true;
    let signature  = "";
    argumentList.forEach(function (argument, index) {
      if (index > 0) signature += ",";
      if (typeof(argument.causality) !== 'undefined') {
        signature += "{id=" + argument.causality.id + "}";
      } else if (typeof(argument) === 'number' || typeof(argument) === 'string') {
        signature += argument;
      } else {
        unique = false;
        signature += "{}";  // Non-identifiable, we have to rely on the signature-bucket.
      }
    });
    return { signature: "(" + signature + ")", unique, argumentList };
  }


  function caching(targetFunction) {
    const signaturesCaches = observable({});

    return () => {
      let argumentsList = argumentsToArray(arguments);
      let argumentSignature = getArgumentSignature(argumentList);
      if (!cacheRecordExists(signaturesCaches, argumentSignature)) {
        invalidateOnChange(
          () => { 
            const value = targetFunction.apply(null, argumentList); // TODO: deal with already bound functions.
            createNewRecord(signaturesCaches, argumentSignature, value); 
          },
          () => { deleteExistingRecord(signaturesCaches, argumentSignature); }
        );
      } 
      return getExistingRecord(signaturesCaches, argumentSignature)
    }
  }

  return caching;
}

