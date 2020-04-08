

  function disposeChildContexts(context) {
    //console.warn("disposeChildContexts " + context.type, context.id||'');//DEBUG
    // trace.context && logGroup(`disposeChildContexts: ${context.type} ${context.id}`);
    if (context.child !== null && !context.child.independent) {
      context.child.disposeContextsRecursivley();
    }
    context.child = null; // always dispose
    if (context.children !== null) {
      context.children.forEach(function (child) {
        if (!child.independent) {
          child.disposeContextsRecursivley();
        }
      });
    }
    context.children = []; // always clear
    // trace.context && logUngroup();
  }


  function disposeContextsRecursivley() {
    // trace.context && logGroup(`disposeContextsRecursivley ${this.id}`);
    this.dispose();
    this.isRemoved = true;
    disposeChildContexts(this);
    // trace.context && logUngroup();
  }

  // Optimization, do not create array if not needed.
  function addChild(context, child) {
    if (context.child === null && context.children === null) {
      context.child = child;
    } else if (context.children === null) {
      context.children = [context.child, child];
      context.child = null;
    } else {
      context.children.push(child);
    }
  }


  /***************************************************************
   *
   *  Debug & helpers
   *
   ***************************************************************/

  let trace = {
    context: false,
    contextMismatch: false,
    nestedRepeater: true,
  };

  let objectlog = null;
  function setObjectlog( newObjectLog ){
    objectlog = newObjectLog;
    // import {objectlog} from './lib/objectlog.js';
    // objectlog.configuration.useConsoleDefault = true;  
  }

  // Debugging
  function log(entity, pattern) {
    if( !trace.context ) return;
    state.recordingPaused++;
    updateContextState();
    objectlog.log(entity, pattern);
    state.recordingPaused--;
    updateContextState();
  }

  function logGroup(entity, pattern) {
    if( !trace.context ) return;
    state.recordingPaused++;
    updateContextState();
    objectlog.group(entity, pattern);
    state.recordingPaused--;
    updateContextState();
  }

  function logUngroup() {
    if( !trace.context ) return;
    objectlog.groupEnd();
  }

  function logToString(entity, pattern) {
    state.recordingPaused++;
    updateContextState();
    let result = objectlog.logToString(entity, pattern);
    state.recordingPaused--;
    updateContextState();
    return result;
  }



  /************************************************************************
   *
   *  Block side effects
   *
   ************************************************************************/


  let writeRestriction = null;
  let sideEffectBlockStack = [];

  /**
   * Block side effects
   */
  function withoutSideEffects(action) {
    // enterContext('block_side_effects', {
    //    createdObjects : {}
    // });
    let restriction = {};
    sideEffectBlockStack.push({});
    writeRestriction = restriction
    let returnValue = action();
    // leaveContext();
    sideEffectBlockStack.pop();
    if (sideEffectBlockStack.length > 0) {
      writeRestriction = sideEffectBlockStack[
        sideEffectBlockStack.length - 1];
    }
    return returnValue;
  }

    // if (writeRestriction !== null) {
    //   writeRestriction[proxy.causality.id] = true;
    // }
