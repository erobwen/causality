

var addLiquidRepetitionFunctionality = function(liquid) {

	/**********************************
	 *  Dependency recording
	 *
	 *  Upon change do
	 **********************************/

	// Debug
	var traceRepetition = true;

	// Recorder stack
	liquid.activeRecorders = [];

	var recorderId = 0;
	liquid.uponChangeDo = function() { // description(optional), doFirst, doAfterChange. doAfterChange cannot modify model, if needed, use a repeater instead. (for guaranteed consistency)
		// Arguments
		var doFirst;
		var doAfterChange;
		var description = null;
		if (arguments.length > 2) {
			description = arguments[0];
			doFirst = arguments[1];
			doAfterChange = arguments[2];
		} else {
			doFirst = arguments[0];
			doAfterChange = arguments[1];
		}

		var recorder = {
			id : recorderId++,
			description : description,
			sources : [],
			sourcesDetails: [],
			uponChangeAction : doAfterChange
		};

		liquid.activeRecorders.push(recorder);
		var returnValue = doFirst();
		liquid.activeRecorders.pop();

		return returnValue;
	};

	
	var recordingPaused = 0;
	liquid.pauseRecording = function(action) {
		recordingPaused++;
		action();
		recordingPaused--;
	};
	
	
	liquid.registerObserverTo = function(object, definition, instance) { // instance can be a cached method if observing its return value, object & definition only needed for debugging.
		if (liquid.activeRecorders.length > 0 && recordingPaused === 0) {
			// stackDump();
			// if (traceRepetition) {
			// 	console.log("registerObserverTo: " + object._ + "." + definition.name);
			// }
			// trace('repetition', "Observe: ", object, ".", definition.name);
			var activeRecorder = liquid.activeRecorders[liquid.activeRecorders.length - 1];
			// console.log("Reading property " + object.__() + "." + instance + " with repeater " + activeRecorder.id);

			// Ensure observer structure in place (might be unecessary)
			if (typeof(instance.observers) === 'undefined') {
				// console.log("setting up observers...");
				instance.observers = {};
			}
			var observerSet = instance.observers;

			// Add repeater on object beeing observed, if not already added before
			var recorderId = activeRecorder.id;
			if (typeof(observerSet[recorderId]) === 'undefined') {
				trace('repetition', "Actually observe: ", object, ".", definition.name);
				observerSet[recorderId] = activeRecorder;

				// Note dependency in repeater itself (for cleaning up)
				activeRecorder.sources.push(observerSet);
				activeRecorder.sourcesDetails.push(object._ + "." + definition.name); // Debugging
			}
			// console.group("Just set up observation");
			// console.log(activeRecorder.description);
			// console.log(Object.keys(instance.observers));
			// console.log(instance);
			// console.groupEnd();
		}
	};


	/** -------------
	 *  Upon change
     * -------------- */
	
	var dirtyRecorders = [];

	liquid.observationBlocked = 0;
	liquid.blockUponChangeActions = function(callback) {
		liquid.observationBlocked++;
		callback();
		liquid.observationBlocked--;
		if (liquid.observationBlocked == 0) {
			while (dirtyRecorders.length > 0) {
				var recorder = dirtyRecorders.shift()
				liquid.blockSideEffects(function() {
					traceGroup('repetition', "-- Upon change action --");
					recorder.uponChangeAction();
					traceGroupEnd();
				});
			}
		}
	};


	// Recorders is a map from id => recorder
	liquid.recordersDirty = function(recorders) {
		for (id in recorders) {
			liquid.recorderDirty(recorders[id]);
		}
	};


	liquid.recorderDirty = function(recorder) {
		trace('repetition', "Recorder noticed change: " + recorder.id + "." + recorder.description);
		traceGroup('repetition', "Dependencies");
		recorder.sourcesDetails.forEach(function(source) {
			trace('repetition', source);
		});
		traceGroupEnd();

		liquid.removeObservation(recorder); // Cannot be any more dirty than it already is!
		if (liquid.observationBlocked > 0) {
			dirtyRecorders.push(recorder);
		} else {
			liquid.blockSideEffects(function() {
				traceGroup('repetition', "-- Upon change action --");
				recorder.uponChangeAction();
				traceGroupEnd();
			});
		}

		// if (traceRepetition) {
		// 	console.log("... recorder finished upon change action: " + recorder.id + "." + recorder.description);
		// }
	};
	

	liquid.removeObservation = function(recorder) {
		// console.group("removeFromObservation: " + recorder.id + "." + recorder.description);
		if (recorder.id == 1)  {
			// debugger;
		}
		// Clear out previous observations
		recorder.sources.forEach(function(observerSet) { // From observed object
			// console.log("Removing a source");
			// console.log(observerSet[recorder.id]);
			delete observerSet[recorder.id];
		});
		clearArray(recorder.sources);  // From repeater itself.
		// console.groupEnd();
	};


	/**********************************
	 *
	 *   Repetition
	 *
	 **********************************/

	liquid.isRefreshingRepeater = function() {
		return liquid.activeRepeaters.length > 0;
	};

	
	liquid.activeRepeater = function() {
		return lastOfArray(liquid.activeRepeaters);
	};


	// Debugging
	var dirtyRepeaters = [];
	var allRepeaters = [];

	// Repeater stack
	liquid.activeRepeaters = [];
	repeaterId = 0;
	liquid.repeatOnChange = function() { // description(optional), action
		// Arguments
		var repeaterAction;
		var description = '';
		if (arguments.length > 1) {
			description = arguments[0];
			repeaterAction = arguments[1];
		} else {
			repeaterAction = arguments[0];
		}

		var repeater = {
			id : repeaterId++,
			description : description,
			childRepeaters: [],
			removed : false,
			action : repeaterAction
		};

		// Attatch to parent repeater.
		if (liquid.activeRepeaters.length > 0) {
			var parentRepeater = lastOfArray(liquid.activeRepeaters);
			parentRepeater.childRepeaters.push(repeater);
		};

		// Debug
		// allRepeaters.push(repeater);
		// if (allRepeaters.length == 10) {
			// debugger;
		// }
		// console.log("repeatOnChange activated: " + repeater.id + "." + description);
		liquid.refreshRepeater(repeater);
		return repeater;
	};

	liquid.refreshRepeater = function(repeater) {
		liquid.activeRepeaters.push(repeater);
		repeater.removed = false;
		repeater.returnValue = liquid.uponChangeDo(
			repeater.action,
			function() {
				liquid.unlockSideEffects(function() {
					// if (traceRepetition) {
					// 	console.log("Repeater's recorder notified change: " + repeater.id + "." + repeater.description);
					// }
					traceGroup('repetition', "Repeater dirty");
					if (!repeater.removed) {
						liquid.repeaterDirty(repeater);
					}
					traceGroupEnd();
				});
			}
		);
		liquid.activeRepeaters.pop();
	};

	liquid.repeaterDirty = function(repeater) { // TODO: Add update block on this stage?
		// if (traceRepetition) {
		// 	console.log("Repeater dirty: " + repeater.id + "." + repeater.description);
		// }
		liquid.removeSubRepeaters(repeater);
		dirtyRepeaters.push(repeater);
		liquid.refreshAllDirtyRepeaters();
	};

	liquid.removeSubRepeaters = function(repeater) {
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters = [];
		}
	};

	liquid.removeRepeater = function(repeater) {
		// console.log("removeRepeater: " + repeater.id + "." + repeater.description);
		repeater.removed = true; // In order to block any lingering recorder that triggers change
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters.length = 0;
		}

		removeFromArray(repeater, dirtyRepeaters);
		removeFromArray(repeater, allRepeaters);
	};


	var refreshingAllDirtyRepeaters = false;
	liquid.refreshAllDirtyRepeaters = function() {
		if (!refreshingAllDirtyRepeaters) {
			if (dirtyRepeaters.length > 0) {
				// if (traceRepetition) {
				// 	console.log("Starting refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length);
				// }
				traceGroup('repetition', "Starting refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length);

				refreshingAllDirtyRepeaters = true;
				while(dirtyRepeaters.length > 0) {
					var repeater = dirtyRepeaters.shift();
					liquid.refreshRepeater(repeater);
				}

				refreshingAllDirtyRepeaters = false;
				traceGroupEnd();
				// if (traceRepetition) {
				// 	console.log("Finished refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length + ", all current and refreshed repeaters:");
				// 	console.log(allRepeaters);
				// 	// console.log("==============");
				// }
			}
		}
	};


	/************************************************************************
	 *  Cached methods
	 *
	 * A cached method will not reevaluate for the same arguments, unless
	 * some of the data it has read for such a call has changed. If there 
	 * is a parent cached method, it will be notified upon change. 
	 * (even if the parent does not actually use/read any return value)
	 ************************************************************************/

	function makeArgumentHash(argumentList) {
		var hash =  "";
		var first = true;
		argumentList.forEach(function(argument) {
			if (!first) {
				hash += ";";
			}
			if (isArray(argument)) {
				hash += "[" + makeArgumentHash(argument) + "]";
			} else if (typeof(argument) === 'object') {
				hash += "{id=" + argument._id + "}";
			} else {
				hash += argument;
			}
		});
		return hash;
	};

	liquid.addGenericMethodCacher = function(object) {
		object['cachedCall'] = function() {
			// Split arguments 
			var argumentsArray = argumentsToArray(arguments);
			var methodName = argumentsArray.shift();
			var methodArguments = argumentsArray;

			// stackDump();
			// console.log(this.__() + '.[cachedCall]' +  methodName);
			traceGroup('repetition', this, '.[cachedCall]' +  methodName);

			// Establish method caches
			if (typeof(this["__cachedCalls"]) === 'undefined') {
				this["__cachedCalls"] = {};
			}
			var methodCaches = null;
			if (typeof(this.__cachedCalls[methodName]) === 'undefined') {
				methodCaches = {};
				this.__cachedCalls[methodName] = methodCaches;				
			} else {
				methodCaches = this.__cachedCalls[methodName];
			}
			
			// Establish argument hash
			var argumentHash = makeArgumentHash(methodArguments);
			// console.log("Argument hash:" + argumentHash);
			if (typeof(methodCaches[argumentHash]) === 'undefined') {
				// console.log("Cached method not seen before, or re-caching needed... ");
				// trace('repitition', "Cached method not seen before, or re-caching needed... ");
				var methodCache = {
					observers : {},
					returnValue : returnValue
				};
				methodCaches[argumentHash] = methodCache;

				// Never encountered these arguments before, make a new cache
				var returnValue = liquid.uponChangeDo(this.__() + "." + methodName,
					function() {
						traceGroup('repetition', "Evlauate cached function");
						var returnValue;
						liquid.blockSideEffects(function() {
							returnValue = this[methodName].apply(this, methodArguments);
						}.bind(this));
						traceGroupEnd();
						return returnValue;
					}.bind(this), 
					function() {
						trace('repitition', "Terminating cached method repeater: ", this, '.[cachedCall]', methodName);
						// console.log("Terminating cached method repeater: " + this.__() + '.[cachedCall]' +  methodName);
						// Get and delete method cache
						var methodCaches = this.__cachedCalls[methodName];
						var methodCache = methodCaches[argumentHash];
						delete methodCaches[argumentHash];

						// Recorders dirty
						liquid.recordersDirty(methodCache.observers);
					}.bind(this));
				methodCache.returnValue = returnValue;
				liquid.registerObserverTo(this, {name: methodName}, methodCache);
				traceGroupEnd();
				return returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				// console.log("Cached method seen before ...");
				// trace('repetition', "Cached method seen before ...");
				var methodCache = methodCaches[argumentHash];
				liquid.registerObserverTo(this, {name: methodName}, methodCache);
				traceGroupEnd();
				return methodCache.returnValue;
			}
		}
	};


	/*********************************************************************************************************
	 *  Infusion
	 *
	 *******************************************************************************************************/


	liquid.activeInfusions = [];


	liquid.isInfusing = function() {
		return liquid.activeInfusions.length > 0;
	};


	liquid.activeInfusion = function() {
		return lastOfArray(liquid.activeInfusions);
	};

	function getInfusedObject(object) {

	}

	// Usage:
	// var infusion = {}; // Do not manipulate this state manually! Just keep it safe and send it with each call to infuse!
	// var changeCallback = function() {
	// 	return liquid.infuse(function() {
	// 		// ... create objects,
	// 	}, infusion);
	// };
	liquid.setupInfusionState = function(infusion) {
		if (typeof(infusion.initialized) === 'undefined') {
			infusion.nextAutogeneratedInfusionId = 0;
			infusion.objectsToInfuse = [];
			infusion.temporaryInfusionIdToObjectMap  = {};
			infusion.establishedInfusionIdToObjectMap = {};
			infusion.initialized = true;
		}
	};

	liquid.infuse = function(infusion, action) { // Use action/infusion state map instead?
		liquid.activeInfusions.push(infusion);

		var returnValue;
		liquid.blockTrueSideEffects(function() {
			returnValue = this[methodName].apply(this, methodArguments);
		});

		liquid.blockUponChangeActions(function() {

			// Build a final infusionId to object map that contains all objects present in the final infusion.
			var infusionIdToObjectMap = {};
			for (infusionId in infusion.temporaryInfusionIdToObjectMap) {
				if (typeof(infusion.establishedInfusionIdToObjectMap[infusionId]) !== undefined) {
					// An established object exists, merge state.
					infusionIdToObjectMap[infusionId] = infusion.establishedInfusionIdToObjectMap[infusionId];
				} else {
					// No established object exists. Need to re-map all outgoing references nevertheless.
					infusionIdToObjectMap[infusionId] = infusion.temporaryInfusionIdToObjectMap[infusionId];
				}
			}

			// Find infusion objects that needs termination. This will ignore objects that are infused into the model directly.
			var objectsToTerminate = [];
			for (infusionId in infusion.establishedInfusionIdToObjectMap) {
				if (typeof(infusionIdToObjectMap[infusionId]) === 'undefined') {
					objectsToTerminate.push(infusion.establishedInfusionIdToObjectMap[infusionId]);
				}
			}

			// Merge state to established objects, and change references to established objects.
			infusion.objectsToInfuse.forEach(function(infusedObject) {
				function replaceReference(relatedObject) {
					if (relatedObject === null) {
						return null;
					} else if (typeof(relatedObject._infusion) !== 'undefined' && relatedObject._infusion === infusion) {
						if (typeof(object._infusionIdOrObject) === 'string') {
							return infusionIdToObjectMap[relatedObject.infusionId];
						} else {
							return relatedObject._infusionIdOrObject;
						}
					} else {
						return relatedObject;
					}
				}

				var infusionTarget = replaceReference(infusedObject);
				if (infusionTarget !== null) {
					// Merge relations into established object
					infusedObject.forAllOutgoingRelations(function(definition, instance) {
						var newData = [];
						if (definition.isSet) {
							instance.data.forEach(function(relatedObject) {
								newData.push(replaceReference(relatedObject));
							});
						} else {
							newData = replaceReference(instance.data);
						}
						infusionTarget[definition.setter](newData);
					});

					// Merge properties into established object
					infusedObject.forAllProperties(function(definition, instance) { // TODO: handle when data not set. How to transfer default value and unset the variable? Do we need an unset command?
						infusionTarget[definition.setterName](infusedObject[definition.getterName]());
					});
				} else {
					// Merge relations into established object
					infusedObject.forAllOutgoingRelations(function(definition, instance) {
						var newData;
						if (definition.isSet) {
							var newData = [];
							var temporaryData = instance.data;
							temporaryData.forEach(function(relatedObject) {
								newData.push(replaceReference(relatedObject));
							});
							infusedObject[definition.setter](newData)
						} else {
							var temporaryData = instance.data;
							var newData = replaceReference(relatedObject);
						}
						infusedObject[definition.setter](newData);
					});
				}
			});

			// Clear out removed objects TODO: Consider if we should remove all references to them also, and let them truly die!? Should it be possible to revive them again sometime?
			objectsToTerminate.forEach(function(object) {
				object.forAllOutgoingRelations(function(definition, instance) {
					if (definition.isSet) {
						object[definition.setterName]([]);
					} else {
						object[definition.setterName](null);
					}
				});
				object.forAllProperties(function(definition, instance) {
					object[definition.setterName](definition.defaultValue);
				});
			});

			// Set the new established infusion id to object map.
			infusion.establishedInfusionIdToObjectMap = infusionIdToObjectMap;
			infusion.establishedInfusionIdToObjectMap = infusion.temporaryInfusionIdToObjectMap;
			infusion.temporaryInfusionIdToObjectMap = {};

			returnValue = mapLiquidObjectsDeep(returnValue, replaceReference); // Get infused object;
			
			liquid.activeInfusions.pop();
		});

		return returnValue;
	};



	/*********************************************************************************************************
	 *  Projections
	 *
	 *  A infusion will maintain the identite(s) of it output ojbects. When something changes, the projection
	 *  will re-evaluate, and the result will be merged into the output data structure that was created in the
	 *  first run.
	 *
	 *  Observers that read a projection will only be notified of change if there is an actual change in return-value (the idetitiy of a returned object)
	 *  Observers that read a projected data structure will only be notified of change if they read parts of
	 *  the projected data structure that has new merged data as the projection is updated.
	 *******************************************************************************************************/

	liquid.addGenericProjection = function(object) {
		object['project'] = function() {
			// Split arguments
			var argumentsArray = argumentsToArray(arguments);
			var methodName = argumentsArray.shift();
			var methodArguments = argumentsArray;

			// Establish method caches
			if (typeof(this["__cachedProjections"]) === 'undefined') {
				this["__cachedProjections"] = {};
			}
			var projections = null;
			if (typeof(this.__cachedProjections[methodName]) === 'undefined') {
				projections = {};
				this.__cachedProjections[methodName] = projections;
			} else {
				projections = this.__cachedProjections[methodName];
			}

			// Establish argument hash
			var argumentHash = makeArgumentHash(methodArguments);

			// console.log("Argument hash:" + argumentHash);
			if (typeof(projections[argumentHash]) === 'undefined') {
				console.log("Cached method not seen before, or re-caching needed... ");

				var projection = {
					returnValueObservers : {},
					establishedReturnValue : null,
					infusion : {}
				};
				projections[argumentHash] = projection;

				// Never encountered these arguments before, make a new cache
				projection.repeater = repeatOnChange(this.__() + "." + methodName,
					function() {
						console.log("Reevaluating projection: " + this.__() + '.[cachedCall]' +  methodName);
						projection.temporaryProjectionIdToObjectMap = {};

						// Run the projection code
						var newReturnValue;
						liquid.infuse(projection.infusion, function() {
							newReturnValue = this[methodName].apply(this, methodArguments);
						});

						// Notify return value observers
						if (newReturnValue !== projection.establishedReturnValue) {
							projection.establishedReturnValue = newReturnValue;
							liquid.recordersDirty(projection.returnValueObservers);
						}
					}.bind(this)
				);

				liquid.registerObserverTo(this, {name: methodName}, projection.returnValueObservers);
				return projection.establishedReturnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				console.log("Cached method seen before ...");
				var projection = projections[argumentHash];
				liquid.registerObserverTo(this, {name: methodName}, projection.returnValueObservers);
				return projection.establishedReturnValue;
			}
		}
	}




	/*********************************************************************************************************
	 *  Block side effects
	 *******************************************************************************************************/

	liquid.activeSideEffectBlockers = [];

	liquid.isBlockingSideEffects = function() {
		return liquid.activeSideEffectBlockers.length > 0 && liquid.activeSideEffectBlocker() !== 'unlocked';
	};

	liquid.activeSideEffectBlocker = function() {
		return lastOfArray(liquid.activeSideEffectBlockers);
	};

	liquid.unlockSideEffects = function(callback, repeater) {  // Should only be used by repeater!
		liquid.activeSideEffectBlockers.push('unlocked');
		callback();
		liquid.activeSideEffectBlockers.pop();
	};

	liquid.blockAllSideEffects = function(callback) {
		liquid.activeSideEffectBlockers.push({
			createdObjects: {},  // id ->    It is ok to modify objects that have been created in this call, so we need to keep track of them
			doNotBlockOutgoingRelations: false  // Newly created objects can not even refer to model objects, unless they do not have a reverse relation.
		});
		callback();
		liquid.activeSideEffectBlockers.pop();
	};

	liquid.blockTrueSideEffects = function(callback) {
		liquid.activeSideEffectBlockers.push({
			createdObjects: {},  // id ->    It is ok to modify objects that have been created in this call, so we need to keep track of them
			doNotBlockOutgoingRelations: true  // Newly created objects can refer to model objects.
		});
		callback();
		liquid.activeSideEffectBlockers.pop();
	};

	liquid.blockSideEffects = liquid.blockTrueSideEffects;
};






if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidRepetitionFunctionality = addLiquidRepetitionFunctionality;
}


