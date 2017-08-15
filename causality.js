// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory); // Support AMD
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory(); // Support NodeJS
	} else {
		root.causality = factory(); // Support browser global
	}
}(this, function () {	
	// Debugging
	let objectlog = require('./objectlog.js');
	let log = objectlog.log;
	let logGroup = objectlog.enter;
	let logUngroup = objectlog.exit;
	
	
	function createCausalityInstance(configuration) {
		
		let state = { 
			useIncomingStructures : configuration.useIncomingStructures,
			incomingStructuresDisabled : 0
		};

		/***************************************************************
		 *
		 *  Id format
		 *
		 ***************************************************************/
					

		const idExpressionPrefix = "_id_";
		const idExpressionSuffix = "_di_";

		function idExpression(id) {
			// log("idExpression: " + id);
			return idExpressionPrefix + id + idExpressionSuffix;
		}

		function transformPossibleIdExpression(string, idMapper) {
			if (isIdExpression(string)) {
				return transformIdExpression(string, idMapper);
			}
			return string;
		}
		
		function isIdExpression(string) {
			return string.startsWith(idExpressionPrefix);
		}


		function extractIdFromExpression(idExpression) {
			let withoutPrefix = idExpression.slice(idExpressionPrefix.length);
			let withoutOuter = withoutPrefix.substr(0, withoutPrefix.length - idExpressionSuffix.length);
			if (!isNaN(withoutOuter)) 
				return parseInt(withoutOuter);
			else 
				return null;
		}

		function transformIdExpression(idExpression, idMapper) {
			let withoutPrefix = idExpression.slice(idExpressionPrefix.length);
			let withoutOuter = withoutPrefix.substr(0, withoutPrefix.length - idExpressionSuffix.length);
			let splitOnPrefix = withoutOuter.split(idExpressionPrefix);
			if (splitOnPrefix.length === 1) {
				// A single id
				return idExpressionPrefix + idMapper(parseInt(splitOnPrefix[0])) + idExpressionSuffix;
			} else {
				let stringBuffer = [];
				// A multi id expression
				for (let i = 0; i < splitOnPrefix.length; i++) {
					let splitOnSuffix = splitOnPrefix[i].split(idExpressionSuffix);
					if (splitOnSuffix.length === 1) {
						// Just a starting blank, do nothing...
					} else if (splitOnSuffix.length === 2) {
						stringBuffer.push(idExpressionPrefix + idMapper(parseInt(splitOnSuffix[0])) + idExpressionSuffix + splitOnSuffix[1]);
					} else {
						// Id expression syntax error
						throw new Error("Id expression syntax error");
					}
				}
				return idExpressionPrefix + stringBuffer.join("") + idExpressionSuffix;
			}
		}

		
		/***************************************************************
		 *
		 *  Helpers
		 *
		 ***************************************************************/

		let argumentsToArray = function(arguments) {
			return Array.prototype.slice.call(arguments);
		};


		/***************************************************************
		 *
		 *  Specifiers
		 * 
		 * Specifiers has no id since they are never streamed independently of references. 
		 *
		 ***************************************************************/
		 
		function getSpecifier(javascriptObject, specifierName) {
			if (typeof(javascriptObject[specifierName]) === 'undefined' || javascriptObject[specifierName] === null) {
				let specifier = { 
					specifierParent : javascriptObject, 
					specifierProperty : specifierName, 
					isIncomingStructure : true   // This is a reuse of this object as incoming node as well.
				}
				if (configuration.incomingStructuresAsCausalityObjects) {
					javascriptObject[specifierName] = createImmutable(specifier);
				} else {
					javascriptObject[specifierName] = specifier;				
				}
			}
			return javascriptObject[specifierName];
		} 

		 
		/***************************************************************
		 *
		 *  Indicies
		 *
		 ***************************************************************/
		 
		function setIndex(object, property, index) {
			state.incomingStructuresDisabled++;
			
			let previousValue = object[property];
			if (typeof(previousValue) === 'object') {
				delete previousValue.indexParent;
				delete previousValue.indexParentRelation;				
			}
			
			index.indexParent = object;
			index.indexParentRelation = property;
			object[property] = index;
			
			state.incomingStructuresDisabled--;
			return index;
		}
		 
		 function createImmutableArrayIndex(object, property) {
			let index = createImmutable([]);

			index.indexParent = object;
			index.indexParentRelation = property;

			object[property] = index;
			return index;
		}
		
		
		function createArrayIndex(object, property) {
			state.incomingStructuresDisabled++;
			
			let index = create([]);
			index.indexParent = object;
			index.indexParentRelation = property;
			object[property] = index;
			
			state.incomingStructuresDisabled--;
			return index;
		}
		

		function createObjectIndex(object, property) {
			state.incomingStructuresDisabled++;
			
			let index = create({});
			index.indexParent = object;
			index.indexParentRelation = property;
			object[property] = index;

			state.incomingStructuresDisabled--;
			return index;
		}

		
		/**
		 * Traverse the index structure. TODO: This should perahps be used for all assignments.... ?
		 */
		let gottenReferingObject;
		let gottenReferingObjectRelation;
		function getReferingObject(possibleIndex, relationFromPossibleIndex) {
			gottenReferingObject = possibleIndex;
			gottenReferingObjectRelation = relationFromPossibleIndex;
			while (typeof(gottenReferingObject.indexParent) !== 'undefined') {
				gottenReferingObjectRelation = gottenReferingObject.indexParentRelation;
				gottenReferingObject = gottenReferingObject.indexParent;
			}
			
			return gottenReferingObject;
		}

		
		/***************************************************************
		 *
		 *  Incoming relations. 
		 *
		 ***************************************************************/

		function forAllIncoming(object, property, callback) {
			if(trace.basics) log("forAllIncoming");
			registerAnyChangeObserver(getSpecifier(getSpecifier(object.const, "incomingObservers"), property));
			withoutRecording(function() { // This is needed for setups where incoming structures are made out of causality objects. 
				if (typeof(object.incoming) !== 'undefined') {
					if(trace.basics) log("incoming exists!");
					let relations = object.incoming;
					if (typeof(relations[property]) !== 'undefined') {
						let relation = relations[property];
						let contents = relation.contents;
						for (id in contents) {
							let referer = contents[id];
							callback(referer);
						}
						let currentChunk = relation.first
						while (currentChunk !== null) {
							let contents = currentChunk.contents;
							for (id in contents) {
								let referer = contents[id];
								callback(referer);
							}
							currentChunk = currentChunk.next;
						}
					}
				}
			});
		}
		

		// function hasIncomingRelationArray(array, index) { // Maybe not needed???
			// state.incomingStructuresDisabled++;
			// let result = array[index];
			// if (typeof(result.isIncomingStructure)) {
				// return true;
			// } else {
				// // Check if there is an internal incoming relation.
			// }
			// return false;
			// state.incomingStructuresDisabled--;			
		// }

		
		function hasIncomingRelation(object, property) {
			state.incomingStructuresDisabled++;
			let result = object[property];
			if (typeof(result.isIncomingStructure)) {
				return true;
			} else {
				// Check if there is an internal incoming relation.
			}
			return false;
			state.incomingStructuresDisabled--;			
		}


		function disableIncomingRelations(action) {
			inPulse++;
			state.incomingStructuresDisabled++;
			action();
			state.incomingStructuresDisabled--;
			if(--inPulse === 0) postPulseCleanup();
		}
		
		let removedLastIncomingRelationCallback = null;
		function removedLastIncomingRelation(object) {
			if (removedLastIncomingRelationCallback !== null) {
				removedLastIncomingRelationCallback(object);
			}
		}
		
		function addRemovedLastIncomingRelationCallback(callback) {
			removedLastIncomingRelationCallback = callback;
		}
		
		
		/*-----------------------------------------------
		 *            Relation structures
		 *-----------------------------------------------*/
		
		
		function createAndRemoveIncomingRelations(objectProxy, key, value, previousValue, previousStructure) {
			if (trace.basic) log("createAndRemoveIncomingRelations");
			
			// Get refering object 
			let referringRelation = key;
			while (typeof(objectProxy.indexParent) !==  'undefined') {
				referringRelation = objectProxy.indexParentRelation;
				objectProxy = objectProxy.indexParent;
			}
			
			// Tear down structure to old value
			if (isObject(previousValue)) {
				if (trace.basic) log("tear down previous... ");
				if (configuration.blockInitializeForIncomingStructures) blockingInitialize++;
				removeIncomingStructure(objectProxy.const.id, previousStructure); // TODO: Fix BUG. This really works?
				if (typeof(previousValue.const.incomingObservers) !== 'undefined') {
					notifyChangeObservers(previousValue.const.incomingObservers[referringRelation]);
				}
				if (configuration.blockInitializeForIncomingStructures) blockingInitialize--;
			}

			// Setup structure to new value
			if (isObject(value)) {
				let referencedValue = createIncomingStructure(objectProxy, objectProxy.const.id, referringRelation, value);
				if (typeof(value.const.incomingObservers) !== 'undefined') {
					notifyChangeObservers(value.const.incomingObservers[referringRelation]);
				}
				value = referencedValue;
			}

			return value;
		}
		
		function removeIncomingRelation(objectProxy, key, removedValue) {
			// Get refering object 
			let referringRelation = key;
			while (typeof(objectProxy.indexParent) !==  'undefined') {
				referringRelation = objectProxy.indexParentRelation;
				objectProxy = objectProxy.indexParent;
			}
			
			// Tear down structure to old value
			if (isObject(removedValue)) {
				if (configuration.blockInitializeForIncomingStructures) blockingInitialize++;
				removeIncomingStructure(objectProxy.const.id, removedValue); // TODO: Fix BUG. This really works?
				if (typeof(removedValue.const.incomingObservers) !== 'undefined') {
					notifyChangeObservers(removedValue.const.incomingObservers[referringRelation]);
				}
				if (configuration.blockInitializeForIncomingStructures) blockingInitialize--;
			}
		}
		
		function createAndRemoveArrayIncomingRelations(arrayProxy, index, removed, added) {
			// Get refering object 
			// log("createAndRemoveArrayIncomingRelations");
			// logGroup();
			let referringRelation = "[]";
			while (typeof(arrayProxy.indexParent) !==  'undefined') {
				referringRelation = arrayProxy.indexParentRelation;
				arrayProxy = arrayProxy.indexParent;
			}
			
			// Create incoming relations for added
			let addedAdjusted = [];
			added.forEach(function(addedElement) {
				if (isObject(addedElement)) {
					addedElement.const.incomingReferences++;
					// log("added element is object");
					let referencedValue = createIncomingStructure(arrayProxy, arrayProxy.const.id, referringRelation, addedElement);
					if (typeof(addedElement.const.incomingObservers) !== 'undefined') {
						notifyChangeObservers(addedElement.const.incomingObservers[referringRelation]);
					}
					addedAdjusted.push(referencedValue);
				} else {
					addedAdjusted.push(addedElement);
				}						
			});
			
			// Remove incoming relations for removed
			if (removed !== null) {
				removed.forEach(function(removedElement) {
					if (isObject(removedElement)) {
						if ((previousValue.const.incomingReferences -= 1) === 0)  removedLastIncomingRelation(removedElement);
						removeIncomingStructure(proxy.const.id, removedElement);
						if (typeof(removedElement.const.incomingObservers) !== 'undefined') {
							notifyChangeObservers(removedElement.const.incomingObservers[referringRelation]);
						}
					}					
				});					
			}
			// logUngroup();
			return addedAdjusted;
		} 
		
		
		/**
		 * Traverse the incoming relation structure foobar
		 */
		function findReferredObject(referredItem) {
			// console.log("findReferredObject:");
			// console.log(referredItem);
			// Note, referred item can sometimes be a function???
			// if (referredItem instanceof Function || typeof(referredItem) === 'function') {
				// referredItem.foo.bar;
			// }
			// log("findReferredObject");
			// logGroup();
			if (typeof(referredItem) === 'object' && referredItem !== null) {
				// log("is object");
				if (typeof(referredItem.referredObject) !== 'undefined') {
					// logUngroup();		
					return referredItem.referredObject;
				} else {
					// logUngroup();
					return referredItem;
				}
			}
			// logUngroup();
			return referredItem;
		}
		
		function createIncomingStructure(referingObject, referingObjectId, property, object) {
			// log("createIncomingStructure");
			let incomingStructure = getIncomingRelationStructure(object, property);
			// log(incomingStructure);
			let incomingRelationChunk = intitializeAndConstructIncomingStructure(incomingStructure, referingObject, referingObjectId);
			if (incomingRelationChunk !== null) {
				return incomingRelationChunk;
			} else {
				return object;
			}
		} 
		
		
		function getIncomingRelationStructure(referencedObject, property) {
			// Sanity test TODO: remove 
			if (state.incomingStructuresDisabled === 0) {
				referencedObject.foo.bar;
			}
			
			// Create incoming structure
			let incomingStructures;
			if (typeof(referencedObject.incoming) === 'undefined') {
				incomingStructures = { isIncomingStructures : true, referredObject: referencedObject, last: null, first: null };
				if (configuration.incomingStructuresAsCausalityObjects) {
					incomingStructures = create(incomingStructures);
				}
				referencedObject.incoming = incomingStructures;
			} else {
				incomingStructures = referencedObject.incoming;
			}
			
			// Create incoming for this particular property
			if (typeof(incomingStructures[property]) === 'undefined') {
				let incomingStructure = { property : property, isIncomingStructure : true, referredObject: referencedObject, incomingStructures : incomingStructures, next: null, previous: incomingStructures.last };
				if (incomingStructures.first === null) {
					incomingStructures.first = incomingStructure;
					incomingStructures.last = incomingStructure;
				} else {					
					incomingStructures.last.next = incomingStructure;
					incomingStructures.last = incomingStructure;
				}
				
				if (configuration.incomingStructuresAsCausalityObjects) {
					// Disable incoming relations here? otherwise we might end up with incoming structures between 
					incomingStructure = create(incomingStructure);
				}
				incomingStructures[property] = incomingStructure;
			}
			
			return incomingStructures[property];
		}
		
		
		/**
		* Structure helpers
		*/				
		function removeIncomingStructure(refererId, referedEntity) {
			if (trace.basic) {
				log("removeIncomingStructure");
				log(refererId);
				log(referedEntity, 3);
			}
			if (typeof(referedEntity.isIncomingStructure) !== 'undefined') {
				let incomingRelation = referedEntity;
				let incomingRelationContents = incomingRelation['contents'];
				delete incomingRelationContents[idExpression(refererId)];
				let noMoreObservers = false;
				incomingRelation.contentsCounter--;
				if (incomingRelation.contentsCounter == 0) {
					if (incomingRelation.isRoot) {
						if (incomingRelation.first === null && incomingRelation.last === null) {
							noMoreObservers = true;
						}
					} else {
						if (incomingRelation.parent.first === incomingRelation) {
							incomingRelation.parent.first === incomingRelation.next;
						}

						if (incomingRelation.parent.last === incomingRelation) {
							incomingRelation.parent.last === incomingRelation.previous;
						}

						if (incomingRelation.next !== null) {
							incomingRelation.next.previous = incomingRelation.previous;
						}

						if (incomingRelation.previous !== null) {
							incomingRelation.previous.next = incomingRelation.next;
						}

						if (configuration.incomingChunkRemovedCallback !== null) {
							configuration.incomingChunkRemovedCallback(incomingRelation);
						}
						incomingRelation.previous = null;
						incomingRelation.next = null;

						let root = incomingRelation.parent;
						if (root.first === null && root.last === null && root.contentsCounter === 0) {
							noMoreObservers = true;
						}
					}

					if (noMoreObservers && typeof(incomingRelation.noMoreObserversCallback) !== 'undefined') {
						incomingRelation.noMoreObserversCallback();
					}
				}
			}
		}
		
		function intitializeAndConstructIncomingStructure(incomingStructureRoot, referingObject, referingObjectId) {
			let refererId = idExpression(referingObjectId);
			// console.log("intitializeAndConstructIncomingStructure:");
			// console.log(referingObject);

			
			// console.log(activeRecorder);
			if (typeof(incomingStructureRoot.initialized) === 'undefined') {
				incomingStructureRoot.isRoot = true;
				incomingStructureRoot.contents = {};
				incomingStructureRoot.contentsCounter = 0;
				incomingStructureRoot.initialized = true;
				incomingStructureRoot.first = null;
				incomingStructureRoot.last = null;
				if (configuration.incomingStructuresAsCausalityObjects) {
					incomingStructureRoot.contents = create(incomingStructureRoot.contents);
				}
			}

			// Already added in the root
			if (typeof(incomingStructureRoot.contents[refererId]) !== 'undefined') {
				return null;
			}
			
			let finalIncomingStructure;			
			if (incomingStructureRoot.contentsCounter === configuration.incomingStructureChunkSize) {
				// Root node is full
				// log("Root node is full...")
				
				// Move on to new chunk?
				if (incomingStructureRoot.last !== null && incomingStructureRoot.contentsCounter !== configuration.incomingStructureChunkSize) {
					// There is a non-full last chunk.
					finalIncomingStructure = incomingStructureRoot.last;
				} else {
					// Last chunk is either full or nonexistent....
					// log("newChunk!!!");
					let newChunk = {
						referredObject : incomingStructureRoot.referredObject,
						isIncomingStructure : true,
						isRoot : false,
						contents: {},
						contentsCounter: 0,
						next: null,
						previous: null,
						parent: null
					};
					if (configuration.incomingStructuresAsCausalityObjects) {
						newChunk.contents = create(newChunk.contents);
						newChunk = create(newChunk);
					}
					if (incomingStructureRoot.first === null) {
						// log("creting a lonley child...");
						newChunk.parent = incomingStructureRoot;
						incomingStructureRoot.first = newChunk;
						incomingStructureRoot.last = newChunk;
					} else {
						// log("appending sibling...");
						let last = incomingStructureRoot.last;
						last.next = newChunk;
						newChunk.previous = last;
						newChunk.parent = incomingStructureRoot;
						incomingStructureRoot.last = newChunk;
					}
					finalIncomingStructure = newChunk;
				}
				
			} else {
				finalIncomingStructure = incomingStructureRoot;
			}

			// Add repeater on object beeing observed, if not already added before
			let incomingStructureContents = finalIncomingStructure.contents;
			if (typeof(incomingStructureContents[refererId]) === 'undefined') {
				// log("here increasing counter... ");
				finalIncomingStructure.contentsCounter = finalIncomingStructure.contentsCounter + 1;
				incomingStructureContents[refererId] = referingObject;

				// Note dependency in repeater itself (for cleaning up)
				// activeRecorder.sources.push(incomingStructure);
				return finalIncomingStructure;
			} else {
				return null;
			}
		}
					

		/***************************************************************
		 *
		 *  Array const
		 *
		 ***************************************************************/

		 

		
		let constArrayOverrides = {
			pop : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				let index = this.target.length - 1;
				observerNotificationNullified++;
				let result = this.target.pop();
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, index, [result], null);
				if (--inPulse === 0) postPulseCleanup();
				return result;
			},

			push : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				let index = this.target.length;
				let argumentsArray = argumentsToArray(arguments);
				
				let removed = null;
				let added = argumentsArray;
				
				// TODO: configuration.incomingReferenceCounters || .... 
				if (state.useIncomingStructures && state.incomingStructuresDisabled === 0) {
					state.incomingStructuresDisabled++
					added = createAndRemoveArrayIncomingRelations(this.const.object, index, removed, added); // TODO: implement for other array manipulators as well. 
					// TODO: What about removed adjusted? 
					// TODO: What about the events? 
					state.incomingStructuresDisabled--
				}
				
				observerNotificationNullified++;
				this.target.push.apply(this.target, argumentsArray);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, index, removed, added);
				if (--inPulse === 0) postPulseCleanup();
				// logUngroup();
				return this.target.length;
			},

			shift : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				observerNotificationNullified++;
				let result = this.target.shift();
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, 0, [result], null);
				if (--inPulse === 0) postPulseCleanup();
				return result;

			},

			unshift : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				let index = this.target.length;
				let argumentsArray = argumentsToArray(arguments);
				observerNotificationNullified++;
				this.target.unshift.apply(this.target, argumentsArray);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, 0, null, argumentsArray);
				if (--inPulse === 0) postPulseCleanup();
				return this.target.length;
			},

			splice : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				let argumentsArray = argumentsToArray(arguments);
				let index = argumentsArray[0];
				let removedCount = argumentsArray[1];
				if( typeof argumentsArray[1] === 'undefined' )
					removedCount = this.target.length - index;
				let added = argumentsArray.slice(2);
				let removed = this.target.slice(index, index + removedCount);
				observerNotificationNullified++;
				let result = this.target.splice.apply(this.target, argumentsArray);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, index, removed, added);
				if (--inPulse === 0) postPulseCleanup();
				return result; // equivalent to removed
			},

			copyWithin: function(target, start, end) {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				if (target < 0) { start = this.target.length - target; }
				if (start < 0) { start = this.target.length - start; }
				if (end < 0) { start = this.target.length - end; }
				end = Math.min(end, this.target.length);
				start = Math.min(start, this.target.length);
				if (start >= end) {
					return;
				}
				let removed = this.target.slice(index, index + end - start);
				let added = this.target.slice(start, end);

				observerNotificationNullified++;
				let result = this.target.copyWithin(target, start, end);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}

				emitSpliceEvent(this, target, added, removed);
				if (--inPulse === 0) postPulseCleanup();
				return result;
			}
		};

		['reverse', 'sort', 'fill'].forEach(function(functionName) {
			constArrayOverrides[functionName] = function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;

				let argumentsArray = argumentsToArray(arguments);
				let removed = this.target.slice(0);

				observerNotificationNullified++;
				let result = this.target[functionName].apply(this.target, argumentsArray);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, 0, removed, this.target.slice(0));
				if (--inPulse === 0) postPulseCleanup();
				return result;
			};
		});

		let constArrayOverridesOptimized = {};
		for(functionName in constArrayOverrides) {
			constArrayOverridesOptimized[functionName] = constArrayOverrides[functionName];
		}
		Object.assign(constArrayOverridesOptimized, {
			push : function() {
				if (!canWrite(this.const.object)) return;
				inPulse++;
				let index = this.target.length;
				let argumentsArray = argumentsToArray(arguments);
				
				observerNotificationNullified++;
				this.target.push.apply(this.target, argumentsArray);
				observerNotificationNullified--;
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
				emitSpliceEvent(this, index, null, argumentsArray);
				if (--inPulse === 0) postPulseCleanup();
				return this.target.length;
			}	
		});
		
		
		let collecting = [];
		function collect(array, action) {
			collecting.push(array);
			action();
			collecting.pop();
		}

		let nextId = 0;
		function resetObjectIds() {
			nextId = 0;
		}


		/***************************************************************
		 *
		 *  Array Handlers
		 *
		 ***************************************************************/
		 
		/*
		function getHandlerArrayOptimized(target, key) {
			if (this.const.forwardsTo !== null && key !== 'nonForwardConst') { //  && (typeof(overlayBypass[key]) === 'undefined')
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (constArrayOverridesOptimized[key]) {
				return constArrayOverridesOptimized[key].bind(this);
			} else if (typeof(this.const[key]) !== 'undefined') {
				return this.const[key];
			} else {
				if (inActiveRecording) {
					registerChangeObserver(getSpecifier(this.const.object, "_arrayObservers"));//object
				}
				return target[key];
			}
		}
		*/
		
		function getHandlerArray(target, key) {
			if (this.const.forwardsTo !== null && key !== 'nonForwardConst') { // && (typeof(overlayBypass[key]) === 'undefined')
				// console.log(this.const.forwardsTo);
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (key === "const" || key === "nonForwardConst") {
				return this.const;
			} else if (constArrayOverrides[key]) {
				return constArrayOverrides[key].bind(this);
			} else if (configuration.directStaticAccess && typeof(this.const[key]) !== 'undefined') {
				return this.const[key];
			} else {
				if (inActiveRecording) {
					registerChangeObserver(getSpecifier(this.const, "_arrayObservers"));//object
				}
				return target[key];
			}
		}

		function setHandlerArray(target, key, value) {
			if (this.const.forwardsTo !== null) {
				if (key === "forwardsTo") {
					this.const.forwardsTo = value; // Access const directly?
					return true;
				} else {
					let overlayHandler = this.const.forwardsTo.const.handler;
					return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
				}
			}

			ensureInitialized(this, target);
			
			let previousValue = target[key];

			// If same value as already set, do nothing.
			if (key in target) {
				if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
					return true;
				}
			}

			// If cumulative assignment, inside recorder and value is undefined, no assignment.
			if (configuration.cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
				return true;
			}
			if (!canWrite(this.const.object)) return;
			inPulse++;
			observerNotificationPostponed++; // TODO: Do this for backwards references from arrays as well...


			if (!isNaN(key)) {
				// Number index
				if (typeof(key) === 'string') {
					key = parseInt(key);
				}
				target[key] = value;
				if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
					emitSpliceReplaceEvent(this, key, value, previousValue);
					if (typeof(this.const._arrayObservers) !== 'undefined') {
						notifyChangeObservers(this.const._arrayObservers);
					}
				}
			} else {
				// String index
				target[key] = value;
				if( target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value)) ) { // Write protected?
					emitSetEvent(this, key, value, previousValue);
					if (typeof(this.const._arrayObservers) !== 'undefined') {
						notifyChangeObservers(this.const._arrayObservers);
					}
				}
			}

			observerNotificationPostponed--;
			proceedWithPostponedNotifications();
			if (--inPulse === 0) postPulseCleanup();

			if( target[key] !== value && !(Number.isNaN(target[key]) && Number.isNaN(value)) ) return false; // Write protected?
			return true;
		}

		function deletePropertyHandlerArray(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
			}
			if (!(key in target)) {
				return true;
			}
			if (!canWrite(this.const.object)) return true;
			
			ensureInitialized(this, target);
			
			inPulse++;

			let previousValue = target[key];
			delete target[key];
			if(!( key in target )) { // Write protected?
				emitDeleteEvent(this, key, previousValue);
				if (typeof(this.const._arrayObservers) !== 'undefined') {
					notifyChangeObservers(this.const._arrayObservers);
				}
			}
			if (--inPulse === 0) postPulseCleanup();
			if( key in target ) return false; // Write protected?
			return true;
		}

		function ownKeysHandlerArray(target) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.ownKeys.apply(overlayHandler, [overlayHandler.target]);
			}

			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, "_arrayObservers"));
			}
			let result   = Object.keys(target);
			result.push('length');
			return result;
		}

		function hasHandlerArray(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.has.apply(overlayHandler, [target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, "_arrayObservers"));
			}
			return key in target;
		}

		function definePropertyHandlerArray(target, key, oDesc) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key, oDesc]);
			}
			if (!canWrite(this.const.object)) return;
			
			ensureInitialized(this, target);
			
			inPulse++;
			// TODO: Elaborate here?
			if (typeof(this.const._arrayObservers) !== 'undefined') {
				notifyChangeObservers(this.const._arrayObservers);
			}
			if (--inPulse === 0) postPulseCleanup();
			return target;
		}

		function getOwnPropertyDescriptorHandlerArray(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
			}

			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, "_arrayObservers"));
			}
			return Object.getOwnPropertyDescriptor(target, key);
		}


		/***************************************************************
		 *
		 *  Object Handlers
		 *
		 ***************************************************************/
	/*
		function getHandlerObjectOptimized(target, key) {
			key = key.toString();

			if (this.const.forwardsTo !== null && key !== "nonForwardConst") {
				let overlayHandler = this.const.forwardsTo.const.handler;
				let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
				return result;
			}
					
			if (key === 'const') {
				return this.const;
			} else {
				if (typeof(key) !== 'undefined') {
					let scan = target;
					while ( scan !== null && typeof(scan) !== 'undefined' ) {
						let descriptor = Object.getOwnPropertyDescriptor(scan, key);
						if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
							return descriptor.get.bind(this.const.object)();
						}
						scan = Object.getPrototypeOf( scan );
					}
					let keyInTarget = key in target;
					if (inActiveRecording) {
						if (keyInTarget) {
							registerChangeObserver(getSpecifier(getSpecifier(this.const, "_propertyObservers"), key));
						} else {
							registerChangeObserver(getSpecifier(this.const, "_enumerateObservers"));
						}
					}
					return target[key];
				}
			}
		}
	*/
		
		function getHandlerObject(target, key) {
			if (trace.get > 0) {
				log("getHandlerObject: "  + this.const.name + "." + key);
				logGroup();
			}
			key = key.toString();
			// log("getHandlerObject: " + key);
			// if (key instanceof 'Symbol') { incoming
				// throw "foobar";
			// }
			ensureInitialized(this, target);
			
			if (this.const.forwardsTo !== null && key !== "nonForwardConst") {
				if (trace.get > 0) log("forwarding ... ");
				// TODO: test that this can handle recursive forwards. 
				let overlayHandler = this.const.forwardsTo.const.handler;
				if (trace.get > 0) log("apply ... ");
				let result = overlayHandler.get.apply(overlayHandler, [overlayHandler.target, key]);
				if (trace.get > 0) log("... finish apply");
				if (trace.get > 0) logUngroup();
				return result;
			}
			
			if (configuration.objectActivityList) registerActivity(this);
					
			if (key === "const" || key === "nonForwardConst") {
				if (trace.get > 0) logUngroup();
				return this.const;
			} else if (configuration.directStaticAccess && typeof(this.const[key]) !== 'undefined') { // TODO: implement directStaticAccess for other readers. 
				// console.log("direct const access: " + key);
				if (trace.get > 0) logUngroup();
				return this.const[key];
			} else {
				if (typeof(key) !== 'undefined') {
					let scan = target;
					while ( scan !== null && typeof(scan) !== 'undefined' ) {
						let descriptor = Object.getOwnPropertyDescriptor(scan, key);
						if (typeof(descriptor) !== 'undefined' && typeof(descriptor.get) !== 'undefined') {
							if (trace.get > 0) logUngroup();
							return descriptor.get.bind(this.const.object)();
						}
						scan = Object.getPrototypeOf( scan );
					}
					let keyInTarget = key in target;
					if (inActiveRecording) {
						if (keyInTarget) {
							registerChangeObserver(getSpecifier(getSpecifier(this.const, "_propertyObservers"), key));
						} else {
							registerChangeObserver(getSpecifier(this.const, "_enumerateObservers"));
						}
					}
					if (state.useIncomingStructures && state.incomingStructuresDisabled === 0 && keyInTarget && key !== 'incoming') {
						// console.log("find referred object");
						// console.log(key);
						if (trace.get > 0) logUngroup();
						return findReferredObject(target[key]);
					} else {
						if (trace.get > 0) logUngroup();
						return target[key];
					}
				}
			}
		}
		
		/*
		function setHandlerObjectOptimized(target, key, value) {		
			// Overlays
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
			}
			
			// Writeprotection
			if (postPulseProcess) {
				return;
			}
			if (writeRestriction !== null && typeof(writeRestriction[object.const.id]) === 'undefined') {
				return;
			}
			
			let previousValue = target[key];
			
			// If same value as already set, do nothing.
			if (key in target) {
				if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
					return true;
				}
			}
			
			// Pulse start
			inPulse++;
			// observerNotificationPostponed++;
			let undefinedKey = !(key in target);
			
			// Perform assignment with regards to incoming structures.
			target[key] = value;

			
			// If assignment was successful, notify change
			if (undefinedKey) {
				if (typeof(this.const._enumerateObservers) !== 'undefined') {
					notifyChangeObservers(this.const._enumerateObservers);
				}
			} else {
				if (typeof(this.const._propertyObservers) !== 'undefined' && typeof(this.const._propertyObservers[key]) !== 'undefined') {
					notifyChangeObservers(this.const._propertyObservers[key]);
				}
			}

			// Emit event
			emitSetEvent(this, key, value, previousValue);
			
			// End pulse 
			// observerNotificationPostponed--;
			// proceedWithPostponedNotifications();
			if (--inPulse === 0) postPulseCleanup();
			return true;
		}
		*/

		// function isIndexParentOf(potentialParent, potentialIndex) {
			// if (!isObject(potentialParent) || !isObject(potentialIndex)) {  // what is actually an object, what 
			// // if (typeof(potentialParent) !== 'object' || typeof(potentialIndex) !== 'object') {
				// return false;
			// } else {
				// return (typeof(potentialIndex.indexParent) !== 'undefined') && potentialIndex.indexParent === potentialParent;
			// }
		// }
		
		
		
		function increaseIncomingCounter(value) {
			if (configuration.blockInitializeForIncomingReferenceCounters) blockingInitialize++;
			if (isObject(value)) {				
				if (typeof(value.const.incomingReferencesCount) === 'undefined') {
					value.const.incomingReferencesCount = 0;
				}
				value.const.incomingReferencesCount++;
			}
			if (configuration.blockInitializeForIncomingReferenceCounters) blockingInitialize--;
		}
		
		function decreaseIncomingCounter(value) {
			if (configuration.blockInitializeForIncomingReferenceCounters) blockingInitialize++;
			if (isObject(value)) {
				value.const.incomingReferencesCount--;
				if (value.const.incomingReferencesCount === 0) {
					removedLastIncomingRelation(value);
				}
			}
			if (configuration.blockInitializeForIncomingReferenceCounters) blockingInitialize--;
		}
		
		// if (state.useIncomingStructures) {
			// if (state.useIncomingStructures && state.incomingStructuresDisabled === 0) {	
				// increaseIncomingCounter(value);
				// decreaseIncomingCounter(previousValue);
				// decreaseIncomingCounter(previousIncomingStructure);
			// } else {
				// increaseIncomingCounter(value);
				// decreaseIncomingCounter(previousValue);					
			// }
		// }
		
		let trace = { basic : 0}; 
		
		
		function setHandlerObject(target, key, value) {
			// Ensure initialized
			if (trace.basic > 0) {
				log("setHandlerObject: " + this.const.name + "." + key + "= ");
				// throw new Error("What the actual fuck, I mean jesuz..!!!");
				logGroup();
			}
			ensureInitialized(this, target);
			
			// Overlays
			if (this.const.forwardsTo !== null) {
				if (trace.basic > 0) log("forward");
				let overlayHandler = this.const.forwardsTo.const.handler;
				if (trace.basic > 0) logUngroup();
				return overlayHandler.set.apply(overlayHandler, [overlayHandler.target, key, value]);
			} else {
				if (trace.basic > 0) log("no forward");
			}
			
			// logGroup();
			if (configuration.objectActivityList) registerActivity(this);
			if (trace.basic > 0) log("configuration.objectActivityList: " + configuration.objectActivityList);
			
			// Write protection
			if (!canWrite(this.const.object)) {
				if (trace.basic > 0) logUngroup();
				return;
			}
			if (trace.basic > 0) log("can write!");
			
			// Get previous value		// Get previous value
			let previousValue;
			let previousIncomingStructure;
			if (state.useIncomingStructures && state.incomingStructuresDisabled === 0) {  // && !isIndexParentOf(this.const.object, value) (not needed... )
				// console.log("causality.getHandlerObject:");
				// console.log(key);
				state.incomingStructuresDisabled++;
				activityListFrozen++;
				previousIncomingStructure = target[key];
				previousValue = findReferredObject(target[key]);
				activityListFrozen--;
				state.incomingStructuresDisabled--;
			} else {
				previousValue = target[key]; 
			}
			
			// If same value as already set, do nothing.
			if (key in target) {
				if (previousValue === value || (Number.isNaN(previousValue) && Number.isNaN(value)) ) {
					// if (configuration.name === 'objectCausality')  log("ALREAD SET");
					if (trace.basic > 0) logUngroup();
					return true;
				}
			}
			
			// If cumulative assignment, inside recorder and value is undefined, no assignment.
			if (configuration.cumulativeAssignment && inActiveRecording && (isNaN(value) || typeof(value) === 'undefined')) {
				// if (configuration.name === 'objectCausality')  log("CUMULATIVE");
				if (trace.basic > 0) logUngroup();
				return true;
			}
			
			// Pulse start
			inPulse++;
			observerNotificationPostponed++;
			let undefinedKey = !(key in target);
					
			// Perform assignment with regards to incoming structures.
			let incomingStructureValue;
			if (state.useIncomingStructures) {
				activityListFrozen++;
				increaseIncomingCounter(value);
				decreaseIncomingCounter(previousValue);
				decreaseIncomingCounter(previousIncomingStructure);
				if (state.incomingStructuresDisabled === 0) { // && !isIndexParentOf(this.const.object, value)
					state.incomingStructuresDisabled++;
					incomingStructureValue = createAndRemoveIncomingRelations(this.const.object, key, value, previousValue, previousIncomingStructure);
					increaseIncomingCounter(incomingStructureValue);
					target[key] = incomingStructureValue;
					state.incomingStructuresDisabled--;
				} else {
					target[key] = value;
				}
				activityListFrozen--;
			} else if (configuration.incomingReferenceCounters){
				activityListFrozen++;
				increaseIncomingCounter(value);
				decreaseIncomingCounter(previousValue);
				activityListFrozen--;
				target[key] = value;
			} else {
				target[key] = value;
			}
			
			// If assignment was successful, notify change
			if (undefinedKey) {
				if (typeof(this.const._enumerateObservers) !== 'undefined') {
					notifyChangeObservers(this.const._enumerateObservers);
				}
			} else {
				if (typeof(this.const._propertyObservers) !== 'undefined' && typeof(this.const._propertyObservers[key]) !== 'undefined') {
					notifyChangeObservers(this.const._propertyObservers[key]);
				}
			}

			// Emit event
			if (state.useIncomingStructures && state.incomingStructuresDisabled === 0) {// && !isIndexParentOf(this.const.object, value)) {
				// Emit extra event 
				state.incomingStructuresDisabled++
				emitSetEvent(this, key, incomingStructureValue, previousIncomingStructure);
				state.incomingStructuresDisabled--
			}
			emitSetEvent(this, key, value, previousValue);
			
			// End pulse 
			observerNotificationPostponed--;
			proceedWithPostponedNotifications();
			if (--inPulse === 0) postPulseCleanup();
			if (trace.basic > 0) logUngroup();
			return true;
		}

		function deletePropertyHandlerObject(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				overlayHandler.deleteProperty.apply(overlayHandler, [overlayHandler.target, key]);
				return true;
			}

			if (!canWrite(this.const.object)) return true;
			
			ensureInitialized(this, target);
			
			if (!(key in target)) {
				return true;
			} else {
				inPulse++;
				let previousValue;
				let previousIncomingStructure;
				if (state.useIncomingStructures && state.incomingStructuresDisabled === 0) {  // && !isIndexParentOf(this.const.object, value) (not needed... )
					// console.log("causality.getHandlerObject:");
					// console.log(key);
					previousIncomingStructure = target[key];
					previousValue = findReferredObject(target[key]);
				} else {
					previousValue = target[key]; 
				}
				
				if (state.useIncomingStructures) {
					decreaseIncomingCounter(previousValue);
					decreaseIncomingCounter(previousIncomingStructure);
					if (state.incomingStructuresDisabled === 0) { // && !isIndexParentOf(this.const.object, value)
						state.incomingStructuresDisabled++;
						removeIncomingRelation(this.const.object, key, previousValue);
						delete target[key];
						state.incomingStructuresDisabled--;
					} else {
						delete target[key];
					}
				} else if (configuration.incomingReferenceCounters){
					decreaseIncomingCounter(previousValue);
					delete target[key];
				} else {
					delete target[key];
				}
				delete target[key];
				if(!( key in target )) { // Write protected?
					emitDeleteEvent(this, key, previousValue);
					if (typeof(this.const._enumerateObservers) !== 'undefined') {
						notifyChangeObservers(this.const._enumerateObservers);
					}
				}
				if (--inPulse === 0) postPulseCleanup();
				if( key in target ) return false; // Write protected?
				return true;
			}
		}

		function ownKeysHandlerObject(target, key) { // Not inherited?
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.ownKeys.apply(overlayHandler, [overlayHandler.target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, "_enumerateObservers"));
			}
			let keys = Object.keys(target);
			return keys;
		}

		function hasHandlerObject(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.has.apply(overlayHandler, [overlayHandler.target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, "_enumerateObservers"));
			}
			return (key in target);
		}

		function definePropertyHandlerObject(target, key, descriptor) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.defineProperty.apply(overlayHandler, [overlayHandler.target, key]);
			}
					
			if (!canWrite(this.const.object)) return;

			ensureInitialized(this, target);
			
			inPulse++;
			let returnValue = Reflect.defineProperty(target, key, descriptor);
			// TODO: emitEvent here?

			if (typeof(this.const._enumerateObservers) !== 'undefined') {
				notifyChangeObservers(this.const._enumerateObservers);
			}
			if (--inPulse === 0) postPulseCleanup();
			return returnValue;
		}

		function getOwnPropertyDescriptorHandlerObject(target, key) {
			if (this.const.forwardsTo !== null) {
				let overlayHandler = this.const.forwardsTo.const.handler;
				return overlayHandler.getOwnPropertyDescriptor.apply(overlayHandler, [overlayHandler.target, key]);
			}
			
			ensureInitialized(this, target);
			
			if (inActiveRecording) {
				registerChangeObserver(getSpecifier(this.const, '_enumerateObservers'));
			}
			return Object.getOwnPropertyDescriptor(target, key);
		}


		/***************************************************************
		 *
		 *  Create
		 *
		 ***************************************************************/
		 
		function createImmutable(initial) {
			inPulse++;
			if (typeof(initial.const) === 'undefined') {			
				initial.const = {id : nextId++};
			} else {
				initial.const.id = nextId++;
			}
			
			emitImmutableCreationEvent(initial);
			if (--inPulse === 0) postPulseCleanup();
			return initial;
		} 
		 
		function create(createdTarget, cacheId) {
			if (trace.basic > 0) {
				log("create:");
				logGroup();
			}
			
			inPulse++;
			let id = nextId++;
			
			let initializer = null;
			if (typeof(createdTarget) === 'undefined') {
				createdTarget = {};
			} else if (typeof(createdTarget) === 'function') {
				initializer = createdTarget; 
				createdTarget = {};
			}
			if (typeof(cacheId) === 'undefined') {
				cacheId = null;
			}

			let handler;
			if (createdTarget instanceof Array) {
				handler = {
					id : id, // TODO: remove?
					// _arrayObservers : null,
					// getPrototypeOf: function () {},
					// setPrototypeOf: function () {},
					// isExtensible: function () {},
					// preventExtensions: function () {},
					// apply: function () {},
					// construct: function () {},
					get: getHandlerArray,
					set: setHandlerArray,
					deleteProperty: deletePropertyHandlerArray,
					ownKeys: ownKeysHandlerArray,
					has: hasHandlerArray,
					defineProperty: definePropertyHandlerArray,
					getOwnPropertyDescriptor: getOwnPropertyDescriptorHandlerArray,
					activityListNext : null,
					activityListPrevious : null				
				};
							// Optimization
				// if (!configuration.activateSpecialFeatures) {
					// handler.get = getHandlerArrayOptimized;
				// }
			} else {
				// let _propertyObservers = {};
				// for (property in createdTarget) {
				//     _propertyObservers[property] = {};
				// }
				handler = {
					id : id, // TODO: remove?
					// getPrototypeOf: function () {},
					// setPrototypeOf: function () {},
					// isExtensible: function () {},
					// preventExtensions: function () {},
					// apply: function () {},
					// construct: function () {},
					// _enumerateObservers : {},
					// _propertyObservers: _propertyObservers,
					get: getHandlerObject,
					set: setHandlerObject,
					deleteProperty: deletePropertyHandlerObject,
					ownKeys: ownKeysHandlerObject,
					has: hasHandlerObject,
					defineProperty: definePropertyHandlerObject,
					getOwnPropertyDescriptor: getOwnPropertyDescriptorHandlerObject,
					activityListNext : null,
					activityListPrevious : null				
				};
				// Optimization
				// if (!configuration.activateSpecialFeatures) {
					// handler.set = setHandlerObjectOptimized;
					// handler.get = getHandlerObjectOptimized;
				// }
			}

			handler.target = createdTarget;
			
			// createdTarget.const.id = id; // TODO ??? 
					
			let proxy = new Proxy(createdTarget, handler);
			
			handler.const = {
				incomingReferences : 0, 
				initializer : initializer,
				causalityInstance : causalityInstance,
				id: id,
				name: createdTarget.name,
				cacheId : cacheId,
				forwardsTo : null,
				target: createdTarget,
				handler : handler,
				object : proxy,
				
				// This inside these functions will be the Proxy. Change to handler?
				repeat : genericRepeatMethod.bind(proxy),
				tryStopRepeat : genericStopRepeatFunction.bind(proxy),

				observe: genericObserveFunction.bind(proxy),

				cached : genericCallAndCacheFunction.bind(proxy),
				cachedInCache : genericCallAndCacheInCacheFunction.bind(proxy),
				reCached : genericReCacheFunction.bind(proxy),
				reCachedInCache : genericReCacheInCacheFunction.bind(proxy),
				tryUncache : genericUnCacheFunction.bind(proxy),

				// reCache aliases
				project : genericReCacheFunction.bind(proxy),
				projectInProjectionOrCache : genericReCacheInCacheFunction.bind(proxy),

				// Identity and state
				mergeFrom : genericMergeFrom.bind(proxy),
				forwardTo : genericForwarder.bind(proxy),
				removeForwarding : genericRemoveForwarding.bind(proxy),
				mergeAndRemoveForwarding: genericMergeAndRemoveForwarding.bind(proxy)
			};
			if (typeof(createdTarget.const) !== 'undefined') {
				for (property in createdTarget.const) {
					handler.const[property] = createdTarget.const[property]; 
				}
			}
			
			handler.const.const = handler.const;
			// handler.const.nonForwardConst = handler.const;
			
			// TODO: consider what we should do when we have reverse references. Should we loop through createdTarget and form proper reverse structures?
			// Experiments: 
			// withoutEmittingEvents(function() {
				// for (property in createdTarget) {
					// proxy[property] = createdTarget[property];
				// }
			// });
			// However, will witout emitting events work for eternity? What does it want really?

			if (inReCache()) {
				if (cacheId !== null &&  typeof(context.cacheIdObjectMap[cacheId]) !== 'undefined') {
					// Overlay previously created
					let infusionTarget = context.cacheIdObjectMap[cacheId]; // TODO: this map should be compressed in regards to multi level zombies.
					infusionTarget.nonForwardConst.storedForwardsTo = infusionTarget.nonForwardConst.forwardsTo;
					infusionTarget.nonForwardConst.forwardsTo = proxy;
					context.newlyCreated.push(infusionTarget);
					return infusionTarget;   // Borrow identity of infusion target.
				} else {
					// Newly created in this reCache cycle. Including overlaid ones.
					context.newlyCreated.push(proxy);
				}
			}

			if (writeRestriction !== null) {
				writeRestriction[proxy.const.id] = true;
			}
			
			emitCreationEvent(handler);
			if (configuration.objectActivityList) registerActivity(handler);
			if (--inPulse === 0) postPulseCleanup();
			
			if (trace.basic > 0) logUngroup();
			
			return proxy;
		}

		function isObject(entity) {
			// console.log();
			// console.log("isObject:");
			// console.log(typeof(entity) === 'object');
			// if (typeof(entity) === 'object') {
				// console.log(entity !== null);
				// if (entity !== null) {
					// console.log(typeof(entity.const) !== 'undefined');
					// if (typeof(entity.const) !== 'undefined')
						// console.log(entity.const.causalityInstanceIdentity === causalityInstanceIdentity);				
				// }
			// }
			// TODO: Fix the causality identity somehow. 
			// return typeof(entity) === 'object' && entity !== null && typeof(entity.const) !== 'undefined' && entity.const.causalityInstanceIdentity === causalityInstanceIdentity;
			return typeof(entity) === 'object' && entity !== null && typeof(entity.const) !== 'undefined' && entity.const.causalityInstance === causalityInstance;
		}
		
		/**********************************
		 *
		 * Initialization
		 *
		 **********************************/
		 
		function ensureInitialized(handler, target) {
			if (handler.const.initializer !== null && blockingInitialize === 0) {
				if (trace.basic > 0) { log("initializing..."); logGroup() }
				let initializer = handler.const.initializer;
				handler.const.initializer = null;
				initializer(handler.const.object);
				if (trace.basic > 0) logUngroup();
			}
		}

		let blockingInitialize = 0;
		
		function blockInitialize(action) {
			blockingInitialize++;
			action();
			blockingInitialize--;
		}
		// function purge(object) {
			// object.target.
		// } 
		 
			
		/**********************************
		 *
		 * Security and Write restrictions
		 *
		 **********************************/

		let customCanWrite = null; 
		
		function setCustomCanWrite(value) {
			customCanWrite = value;
		}
		 
		function canWrite(object) {
			if (postPulseProcess > 0) {
				return true;
			}
			// log("CANNOT WRITE IN POST PULSE");
				// return false;
			// }
			if (writeRestriction !== null && typeof(writeRestriction[object.const.id]) === 'undefined') {
				return false;
			}
			if (customCanWrite !== null) {
				return customCanWrite(object);
			}
			return true;
		} 
		 
		let customCanRead = null; 

		function setCustomCanRead(value) {
			customCanRead = value;
		}

		function canRead(object) {
			if (customCanRead !== null) {
				return customCanRead(object);
			}
			return true;
		}

		/**********************************
		 *
		 *   Causality Global stack
		 *
		 **********************************/

		let causalityStack = [];
		let context = null;
		let microContext = null;

		let nextIsMicroContext = false;

		function inCachedCall() {
			if (context === null) {
				return false;
			} else {
				return context.type === "cached_call";
			}
		}

		function inReCache() {
			if (context === null) {
				return false;
			} else {
				return context.type === "reCache";
			}
		}

		function noContext() {
			return context === null;
		}

		let inActiveRecording = false;
		let activeRecording = null;

		function updateInActiveRecording() {
			inActiveRecording = (microContext === null) ? false : ((microContext.type === "recording") && recordingPaused === 0);
			activeRecording = inActiveRecording ? microContext : null;
		}

		function getActiveRecording() {
			return activeRecording;
			// if ((microContext === null) ? false : ((microContext.type === "recording") && recordingPaused === 0)) {
				// return microContext;
			// } else {
				// return null;
			// }
		}

		function inActiveRepetition() {
			return (microContext === null) ? false : ((microContext.type === "repeater") && recordingPaused === 0);
		}

		function getActiveRepeater() {
			if ((microContext === null) ? false : ((microContext.type === "repeater") && recordingPaused === 0)) {
				return microContext;
			} else {
				return null;
			}
		}


		function enterContextAndExpectMicroContext(type, enteredContext) {
			nextIsMicroContext = true;
			enterContext(type, enteredContext);
		}


		function removeChildContexts(context) {
			if (typeof(context.children) !== 'undefined' && context.children.length > 0) {
				context.children.forEach(function (child) {
					child.remove();
				});
				context.children = [];
			}
		}

		// occuring types: recording, repeater_refreshing, cached_call, reCache, block_side_effects
		function enterContext(type, enteredContext) {
			if (typeof(enteredContext.initialized) === 'undefined') {
				// Enter new context
				enteredContext.type = type;
				enteredContext.macro = null;

				enteredContext.directlyInvokedByApplication = (context === null);
				if (nextIsMicroContext) {
					// Build a micro context
					enteredContext.macro = microContext;
					microContext.micro = enteredContext;
					nextIsMicroContext = false;
				} else {
					// Build a new macro context
					enteredContext.children = [];

					if (context !== null && typeof(enteredContext.independent) === 'undefined') {
						context.children.push(enteredContext);
					}
					context = enteredContext;
				}
				microContext = enteredContext;

				enteredContext.initialized = true;
			} else {
				// Re-enter context
				let primaryContext = enteredContext;
				while (primaryContext.macro !== null) {
					primaryContext = primaryContext.macro
				}
				context = primaryContext;

				microContext = enteredContext;
			}

			// Debug printout of macro hierarchy
			// let macros = [enteredContext];
			// let macro =  enteredContext.macro;
			// while(macro !== null) {
			//     macros.unshift(macro);
			//     macro = macro.macro;
			// }
			// console.log("====== enterContext ======== " + causalityStack.length + " =" + macros.map((context) => { return context.type; }).join("->"));
			updateInActiveRecording();
			causalityStack.push(enteredContext);
			return enteredContext;
		}


		function leaveContext() {
			let leftContext = causalityStack.pop();
			if (causalityStack.length > 0) {
				microContext = causalityStack[causalityStack.length - 1];
				let scannedContext = microContext;
				while (scannedContext.macro !== null) {
					scannedContext = scannedContext.macro;
				}
				context = scannedContext;
			} else {
				context = null;
				microContext = null;
			}
			updateInActiveRecording();
			// console.log("====== leaveContext ========" + leftContext.type);
		}


		/**********************************
		 *  Pulse & Transactions
		 *
		 *  Upon change do
		 **********************************/

		let inPulse = 0;
		
		let postPulseProcess = 0; // Remove??
	 
		let pulseEvents = [];
		
		function pulse(action) {
			inPulse++;
			action();
			if (--inPulse === 0) postPulseCleanup();
		}

		let transaction = postponeObserverNotification;

		function postponeObserverNotification(action) {
			inPulse++;
			observerNotificationPostponed++;
			action();
			observerNotificationPostponed--;
			proceedWithPostponedNotifications();
			if (--inPulse === 0) postPulseCleanup();
		}

		let contextsScheduledForPossibleDestruction = [];

		function postPulseCleanup() {
			inPulse++; // block new pulses!
			postPulseProcess++; // Blocks any model writing during post pulse cleanup
			contextsScheduledForPossibleDestruction.forEach(function(context) {
				if (!context.directlyInvokedByApplication) {
					if (emptyObserverSet(context.contextObservers)) {
						context.remove();
					}
				}
			});
			contextsScheduledForPossibleDestruction = [];
			postPulseHooks.forEach(function(callback) {
				callback(pulseEvents);
			});
			pulseEvents = [];
			postPulseProcess--;
			inPulse--;
		}

		let postPulseHooks = [];
		function addPostPulseAction(callback) {
			postPulseHooks.push(callback);
		}


		/**********************************
		 *  Observe
		 *
		 *
		 **********************************/
		
		let emitEventPaused = 0;

		function withoutEmittingEvents(action) {
			inPulse++;
			emitEventPaused++;
			// log(configuration.name + "pause emitting events");
			// logGroup();
			// log(configuration.name + " inPulse: " + inPulse);
			action();
			// log("inPulse: " + inPulse);
			// log(configuration.name + " inPulse: " + inPulse);
			// logUngroup();
			emitEventPaused--;
			if (--inPulse === 0) postPulseCleanup();
		}

		function emitImmutableCreationEvent(object) {
			if (configuration.recordPulseEvents) {
				let event = { type: 'creation', object: object }
				if (configuration.recordPulseEvents) {
					pulseEvents.push(event);
				}
			}		
		} 
		
		function emitCreationEvent(handler) {
			if (configuration.recordPulseEvents) {
				emitEvent(handler, { type: 'creation' });
			}		
		} 
		 
		function emitSpliceEvent(handler, index, removed, added) {
			if (configuration.recordPulseEvents || typeof(handler.observers) !== 'undefined') {
				emitEvent(handler, { type: 'splice', index: index, removed: removed, added: added});
			}
		}

		function emitSpliceReplaceEvent(handler, key, value, previousValue) {
			if (configuration.recordPulseEvents || typeof(handler.observers) !== 'undefined') {
				emitEvent(handler, { type: 'splice', index: key, removed: [previousValue], added: [value] });
			}
		}

		function emitSetEvent(handler, key, value, previousValue) {
			if (configuration.recordPulseEvents || typeof(handler.observers) !== 'undefined') {
				emitEvent(handler, {type: 'set', property: key, newValue: value, oldValue: previousValue});
			}
		}

		function emitDeleteEvent(handler, key, previousValue) {
			if (configuration.recordPulseEvents || typeof(handler.observers) !== 'undefined') {
				emitEvent(handler, {type: 'delete', property: key, deletedValue: previousValue});
			}
		}

		function emitEvent(handler, event) {
			if (trace.basic) {
				log("emitEvent: ");// + event.type + " " + event.property);
				log(event);
			}
			if (emitEventPaused === 0) {
				// log("EMIT EVENT " + configuration.name + " " + event.type + " " + event.property + "=...");
				if (state.useIncomingStructures) {
					event.incomingStructureEvent = state.incomingStructuresDisabled !== 0
				}
				// console.log(event);
				// event.objectId = handler.const.id;
				event.object = handler.const.object; 
				if (configuration.recordPulseEvents) {
					pulseEvents.push(event);
				}
				if (typeof(handler.observers) !== 'undefined') {
					handler.observers.forEach(function(observerFunction) {
						observerFunction(event);
					});
				}
			}
		}
		
		function emitUnobservableEvent(event) {
			if (configuration.recordPulseEvents) {
				pulseEvents.push(event);
			}
		}

		function observeAll(array, callback) {
			array.forEach(function(element) {
				element.const.observe(callback);
			});
		}

		function genericObserveFunction(observerFunction) {
			let handler = this.const.handler;
			if (typeof(handler.observers) === 'undefined') {
				handler.observers = [];
			}
			handler.observers.push(observerFunction);
		}


		/**********************************
		 *  Actions
		 *
		 **********************************/
		 
		/**
		* Forms: 
		* 
		* createAction(function)
		* createAction(functionName, arglist)
		* createAction(functionPath, arglist)
		* createAction(object, methodName, arglist)
		*/
		function createAction() {
			arguments = argumentsToArray(arguments);
			let argumentsLength = arguments.length;
			if (argumentsLength === 1) {
				return arguments[0];
			} else if (argumentsLength === 2){
				if (arguments[0] instanceof Array) {
					return createImmutable({
						functionPath : createImmutable(arguments.unshift()),
						arguments : createImmutable(arguments) 
					});
				} else {
					return createImmutable({
						functionName : arguments.unshift(),
						arguments : createImmutable(arguments)
					});
				}
			} else if (argumentsLength === 3) {
				return createImmutable({
					object : arguments.unshift(),
					methodName : arguments.unshift(),
					arguments : createImmutable(arguments)
				});
			}
		}
		
		function performAction(action) {
			if (typeof(action) === 'function') {
				return action();
			} else {
				if (typeof(action.object) === 'undefined') {
					if (typeof(action.functionPath) === 'undefined') {
						// TODO: use window also...
						return global[action.methodName].apply(null, action.arglist);
					} else {
						let tmpFunction = null;
						action.functionPath.forEach(function(name) {
							if (tmpFunction === null) {
								tmpFunction = global[action.methodName];
							} else {
								tmpFunction = tmpFunction[name]; 
							}
						});
						return tmpFunction.apply(null, action.arglist);
					}
				} else {
					return action.object[action.methodName].apply(action.object, action.arglist);
				}
			}
		}
		

		/**********************************
		 *  Dependency recording
		 *
		 *  Upon change do
		 **********************************/

		function uponChangeDo() { // description(optional), doFirst, doAfterChange. doAfterChange cannot modify model, if needed, use a repeater instead. (for guaranteed consistency)
			// Arguments
			let doFirst;
			let doAfterChange;
			let description = null;
			if (arguments.length > 2) {
				description   = arguments[0];
				doFirst       = arguments[1];
				doAfterChange = arguments[2];
			} else {
				doFirst       = arguments[0];
				doAfterChange = arguments[1];
			}

			// Recorder context
			let context = createImmutable({
				nextToNotify: null,
				description: description,
				uponChangeAction: doAfterChange,
				remove : function() {
					this.sources.forEach(function(observerSet) {
						removeIncomingStructure(context.const.id, observerSet);
					});
					this.sources.lenght = 0;  // From repeater itself.
				}
			});
			createImmutableArrayIndex(context, "sources");
			
			enterContext('recording', context);
			let returnValue = performAction(doFirst);
			leaveContext();

			return returnValue;
		}

		let recordingPaused = 0;
		
		function assertNotRecording() {
			if (inActiveRecording) {
				throw new Error("Should not be in a recording right now...");
			}
		}
		
		function withoutRecording(action) {
			recordingPaused++;
			updateInActiveRecording();
			action();
			recordingPaused--;
			updateInActiveRecording();
		}

		function emptyObserverSet(observerSet) {
			return observerSet.contentsCounter === 0 && observerSet.first === null;
		}

		function registerAnyChangeObserver(observerSet) { // instance can be a cached method if observing its return value, object
			if (inActiveRecording) {
				registerChangeObserver(observerSet);
			}
		}
		
		function registerChangeObserver(observerSet) {
			// Find right place in the incoming structure.
			let incomingRelationChunk = intitializeAndConstructIncomingStructure(observerSet, activeRecording, activeRecording.const.id);
			if (incomingRelationChunk !== null) {
				activeRecording.sources.push(incomingRelationChunk);
			}
		}


		/** -------------
		 *  Upon change
		 * -------------- */

		let observersToNotifyChange = [];
		let nextObserverToNotifyChange = null;
		let lastObserverToNotifyChange = null;

		let observerNotificationPostponed = 0;
		let observerNotificationNullified = 0;

		function proceedWithPostponedNotifications() {
			if (observerNotificationPostponed == 0) {
				while (nextObserverToNotifyChange !== null) {
					let recorder = nextObserverToNotifyChange;
					nextObserverToNotifyChange = nextObserverToNotifyChange.nextToNotify;
					// blockSideEffects(function() {
					performAction(recorder.uponChangeAction);
					// });
				}
				lastObserverToNotifyChange = null;
			}
		}

		function nullifyObserverNotification(callback) {
			observerNotificationNullified++;
			callback();
			observerNotificationNullified--;
		}


		// Recorders is a map from id => recorder
		function notifyChangeObservers(observers) {
			if (typeof(observers.initialized) !== 'undefined') {
				if (observerNotificationNullified > 0) {
					return;
				}

				let contents = observers.contents;
				for (id in contents) {
					notifyChangeObserver(contents[id]);
				}

				if (typeof(observers.first) !== 'undefined') {
					let chainedObserverChunk = observers.first;
					while(chainedObserverChunk !== null) {
						let contents = chainedObserverChunk.contents;
						for (id in contents) {
							notifyChangeObserver(contents[id]);
						}
						chainedObserverChunk = chainedObserverChunk.next;
					}
				}
			}
		}

		function notifyChangeObserver(observer) {
			if (observer != microContext) {
				observer.remove(); // Cannot be any more dirty than it already is!
				if (observerNotificationPostponed > 0) {
					if (lastObserverToNotifyChange !== null) {
						lastObserverToNotifyChange.nextToNotify = observer;
					} else {
						nextObserverToNotifyChange = observer;
					}
					lastObserverToNotifyChange = observer;
				} else {
					// blockSideEffects(function() {
					performAction(observer.uponChangeAction);
					// });
				}
			}
		}


		/**********************************
		 *
		 *   Repetition
		 *
		 **********************************/

		let firstDirtyRepeater = null;
		let lastDirtyRepeater = null;

		function clearRepeaterLists() {
			recorderId = 0;
			let firstDirtyRepeater = null;
			let lastDirtyRepeater = null;
		}

		function detatchRepeater(repeater) {
			if (lastDirtyRepeater === repeater) {
				lastDirtyRepeater = repeater.previousDirty;
			}
			if (firstDirtyRepeater === repeater) {
				firstDirtyRepeater = repeater.nextDirty;
			}
			if (repeater.nextDirty) {
				repeater.nextDirty.previousDirty = repeater.previousDirty;
			}
			if (repeater.previousDirty) {
				repeater.previousDirty.nextDirty = repeater.nextDirty;
			}
		}

		function repeatOnChange() { // description(optional), action
			// Arguments
			let repeaterAction;
			let description = '';
			if (arguments.length > 1) {
				description    = arguments[0];
				repeaterAction = arguments[1];
			} else {
				repeaterAction = arguments[0];
			}

			// Activate!
			return refreshRepeater(createImmutable({
				description: description,
				action: repeaterAction,
				remove: function() {
					// console.log("removeRepeater: " + repeater.const.id + "." + repeater.description);
					removeChildContexts(this);
					detatchRepeater(this);
					this.micro.remove(); // Remove recorder!
				},
				nextDirty : null,
				previousDirty : null
			}));
		}

		function refreshRepeater(repeater) {
			enterContext('repeater_refreshing', repeater);
			// console.log("parent context type: " + repeater.parent.type);
			// console.log("context type: " + repeater.type);
			nextIsMicroContext = true;
			repeater.returnValue = uponChangeDo(
				repeater.action,
				function () {
					// unlockSideEffects(function() {
					repeaterDirty(repeater);
					// });
				}
			);
			leaveContext();
			return repeater;
		}

		function repeaterDirty(repeater) { // TODO: Add update block on this stage?
			removeChildContexts(repeater);

			if (lastDirtyRepeater === null) {
				lastDirtyRepeater = repeater;
				firstDirtyRepeater = repeater;
			} else {
				lastDirtyRepeater.nextDirty = repeater;
				repeater.previousDirty = lastDirtyRepeater;
				lastDirtyRepeater = repeater;
			}

			refreshAllDirtyRepeaters();
		}

		let refreshingAllDirtyRepeaters = false;

		function refreshAllDirtyRepeaters() {
			if (!refreshingAllDirtyRepeaters) {
				if (firstDirtyRepeater !== null) {
					refreshingAllDirtyRepeaters = true;
					while (firstDirtyRepeater !== null) {
						let repeater = firstDirtyRepeater;
						detatchRepeater(repeater);
						refreshRepeater(repeater);
					}

					refreshingAllDirtyRepeaters = false;
				}
			}
		}


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
					if (compareArraysShallow(functionArgumentHashCaches[i].functionArguments, functionArguments)) {
						return true;
					}
				}
				return false;
			}
		}

		let cachedCalls = 0;

		function cachedCallCount() {
			return cachedCalls;
		}

		function getObjectAttatchedCache(object, cacheStoreName, functionName) {
			// object = object.const.handler;
			// let functionCaches = getMap(object, cacheStoreName, functionName);
			if (typeof(object[cacheStoreName]) === 'undefined') {
				let cacheStore = createImmutable({});
				cacheStore.const.exclusiveReferer = object; // Only refered to by object. TODO: implement in more places...
				object[cacheStoreName] = cacheStore; // TODO: These are actually not immutable, more like unobservable. They can change, but changes needs to register manually.... 
			}
			if (typeof(object[cacheStoreName][functionName]) === 'undefined') {
				object[cacheStoreName][functionName] = createImmutable({});
			}
			return object[cacheStoreName][functionName];
		}
		
		// Get cache(s) for this argument hash
		// function caches has to be a full object.
		function getFunctionCacher(functionCaches, argumentList) {
			let uniqueHash = true;
			function makeArgumentHash(argumentList) {
				let hash  = "";
				let first = true;
				argumentList.forEach(function (argument) {
					if (!first) {
						hash += ",";
					}

					if (isObject(argument)) { //typeof(argument) === 'object' &&
						hash += "{id=" + argument.const.id + "}";
					} else if (typeof(argument) === 'number' || typeof(argument) === 'string') { // String or integer
						hash += argument;
					} else {
						uniqueHash = false;
						hash += "{}"; // Non-identifiable, we have to rely on the hash-bucket.
					}
				});
				return "(" + hash + ")";
			}
			let argumentsHash = makeArgumentHash(argumentList);

			return {
				cacheRecordExists : function() {
					// Figure out if we have a chache or not
					let result = null;
					if (uniqueHash) {
						return typeof(functionCaches[argumentsHash]) !== 'undefined';
					} else {
						if (typeof(functionCaches[argumentsHash]) !== 'undefined') {
							let cacheBucket = functionCaches[argumentsHash];
							for (let i = 0; i < cacheBucket.length; i++) {
								if (compareArraysShallow(cacheBucket[i].functionArguments, functionArguments)) {
									return true;
								}
							}
						}
						return false;
					}
				},

				deleteExistingRecord : function() {
					if (uniqueHash) {
						let result = functionCaches[argumentsHash];
						delete functionCaches[argumentsHash];
						emitUnobservableEvent({object: functionCaches, type: 'delete', oldValue: result});
						return result;
					} else {
						let cacheBucket = functionCaches[argumentsHash];					
						for (let i = 0; i < cacheBucket.length; i++) {
							if (compareArraysShallow(cacheBucket[i].functionArguments, functionArguments)) {
								let result = cacheBucket[i];
								cacheBucket.splice(i, 1);
								emitUnobservableEvent({object: functionCaches, type: 'splice', index: 1, added: [], removed: [result]});
								return result;
							}
						}
					}
				},

				getExistingRecord : function() {
					if (uniqueHash) {
						return functionCaches[argumentsHash]
					} else {
						let cacheBucket = functionCaches[argumentsHash]
						for (let i = 0; i < cacheBucket.length; i++) {
							if (compareArraysShallow(cacheBucket[i].functionArguments, functionArguments)) {
								return cacheBucket[i];
							}
						}
					}
				},
				
				createNewRecord : function() {
					if (uniqueHash) {
						let newCacheRecord = createImmutable({});
						functionCaches[argumentsHash] = newCacheRecord;
						emitUnobservableEvent({object: functionCaches, type: 'set', property: argumentsHash, oldValueUndefined: true , value: newCacheRecord});
						return functionCaches[argumentsHash];
					} else {
						if (typeof(functionCaches[argumentsHash]) === 'undefined') {
							let cacheBucket = createImmutable([]);
							functionCaches[argumentsHash] = cacheBucket;
							emitUnobservableEvent({object: functionCaches, type: 'set', property: argumentsHash , oldValueUndefined: true , value: cacheBucket});
						}
						let hashBucket = functionCaches[argumentsHash];
						let newCacheRecord = createImmutable({});
						hashBucket.push(newCacheRecord);
						emitUnobservableEvent({object: hashBucket, type: 'splice', index: "foo", removed: null , added: [newCacheRecord]});
						return newCacheRecord;
					}
				}
			};
		}


		/************************************************************************
		 *
		 *                    Generic repeat function
		 *
		 ************************************************************************/

		function genericRepeatMethod() {
			// Split arguments
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			
			repeatForUniqueArgumentLists(
				getObjectAttatchedCache(this, "_repeaters", functionName), 
				argumentsList,
				function() {
					return this[functionName].apply(this, argumentsList);
				}.bind(this)
			);
		}

		// function repeatForUniqueCall(repeatedFunction, argumentLists) {
			// if (typeof(repeatedFunction.__call_repeat_cache) === 'undefined') {
				// repeatedFunction.__call_repeat_cache = {};
			// }
			// let cache = repeatedFunction.__call_repeat_cache;
			// repeatForUniqueArgumentLists(
				// cache, 
				// argumentList, 
				// function() {
					// return repeatedFunction.apply(null, argumentsList); // Will this work if this is already bound?
				// }
			// );
		// }
		
		function repeatForUniqueArgumentLists(cache, argumentsList, repeatedFunction) {
			let functionCacher = getFunctionCacher(cache, argumentsList);
			
			if (!functionCacher.cacheRecordExists()) {
				// Never encountered these arguments before, make a new cache
				let cacheRecord = functionCacher.createNewRecord();
				cacheRecord.independent = true; // Do not delete together with parent
				cacheRecord.remove = function() {
					functionCacher.deleteExistingRecord();
					cacheRecord.micro.remove();
				};
				getSpecifier(cacheRecord, "contextObservers").noMoreObserversCallback = function() {
					contextsScheduledForPossibleDestruction.push(cacheRecord);
				};
				enterContext('cached_repeater', cacheRecord);
				nextIsMicroContext = true;

				// cacheRecord.remove = function() {}; // Never removed directly, only when no observers & no direct application call
				cacheRecord.repeaterHandle = repeatOnChange(repeatedFunction);
				leaveContext();

				registerAnyChangeObserver(cacheRecord.contextObservers);
				return cacheRecord.repeaterHandle; // return something else...
			} else {
				let cacheRecord = functionCacher.getExistingRecord();
				registerAnyChangeObserver(cacheRecord.contextObservers);
				return functionCacher.getExistingRecord().repeaterHandle;
			}
		}

		function genericStopRepeatFunction() {
			// Split arguments
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			
			let cache = getObjectAttatchedCache(this, "_repeaters", functionName);
			let functionCacher = getFunctionCacher(cache, argumentsList);

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

		function genericCallAndCacheInCacheFunction() {
			let argumentsArray = argumentsToArray(arguments);
			if (inCachedCall() > 0) {
				return this.const.cached.apply(this, argumentsArray);
			} else {
				let functionName = argumentsArray.shift();
				return this[functionName].apply(this, argumentsArray);
			}
		}
		
		function genericCallAndCacheFunction() {
			// Split arguments
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			
			return callAndCacheForUniqueArgumentLists(
				getObjectAttatchedCache(this, "_cachedCalls", functionName), 
				argumentsList,
				function() {
					return this[functionName].apply(this, argumentsList);
				}.bind(this)
			);
		}
		
		function callAndCacheForUniqueArgumentLists(cache, argumentsList, callAction) {
			let functionCacher = getFunctionCacher(cache, argumentsList);

			if (!functionCacher.cacheRecordExists()) {
				let cacheRecord = functionCacher.createNewRecord();
				cacheRecord.independent = true; // Do not delete together with parent

				// Is this call non-automatic
				cacheRecord.remove = function() {
					functionCacher.deleteExistingRecord();
					cacheRecord.micro.remove(); // Remove recorder
				};

				cachedCalls++;
				enterContext('cached_call', cacheRecord);
				nextIsMicroContext = true;
				// Never encountered these arguments before, make a new cache
				let returnValue = uponChangeDo(
					function () {
						let returnValue;
						// blockSideEffects(function() {
						returnValue = callAction();
						// }.bind(this));
						return returnValue;
					}.bind(this),
					function () {
						// Delete function cache and notify
						let cacheRecord = functionCacher.deleteExistingRecord();
						notifyChangeObservers(cacheRecord.contextObservers);
					}.bind(this));

					// Future design:
				// let returnValue = uponChangeDo(
					// function () {
						// return callAction();
					// }.bind(this),
					// createImmutable({
						// object: cacheRecord,
						// method: "notifyObservers"
					// })
				// );	
					
				leaveContext();
				cacheRecord.returnValue = returnValue;
				getSpecifier(cacheRecord, "contextObservers").noMoreObserversCallback = function() {
					contextsScheduledForPossibleDestruction.push(cacheRecord);
				};
				registerAnyChangeObserver(cacheRecord.contextObservers);
				return returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				let cacheRecord = functionCacher.getExistingRecord();
				registerAnyChangeObserver(cacheRecord.contextObservers);
				return cacheRecord.returnValue;
			}
		}
		

		function genericUnCacheFunction() {
			// Split arguments
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();

			// Cached
			let cache = getObjectAttatchedCache(this, "_cachedCalls", functionName);
			let functionCacher = getFunctionCacher(cache, argumentsList);

			if (functionCacher.cacheRecordExists()) {
				let cacheRecord = functionCacher.getExistingRecord();
				cacheRecord.directlyInvokedByApplication = false;
				contextsScheduledForPossibleDestruction.push(cacheRecord);
			}

			// Re cached
			cache = getObjectAttatchedCache(this, "_reCachedCalls", functionName);
			functionCacher = getFunctionCacher(cache, argumentsList);

			if (functionCacher.cacheRecordExists()) {
				let cacheRecord = functionCacher.getExistingRecord();
				cacheRecord.directlyInvokedByApplication = false;
				contextsScheduledForPossibleDestruction.push(cacheRecord);
			}
		}

		/************************************************************************
		 *
		 *  Splices
		 *
		 ************************************************************************/

		function differentialSplices(previous, array) {
			let done = false;
			let splices = [];

			let previousIndex = 0;
			let newIndex = 0;

			let addedRemovedLength = 0;

			let removed;
			let added;

			function add(sequence) {
				let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: [], added: added};
				addedRemovedLength += added.length;
				splices.push(splice);
			}

			function remove(sequence) {
				let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: removed, added: [] };
				addedRemovedLength -= removed.length;
				splices.push(splice);
			}

			function removeAdd(removed, added) {
				let splice = {type:'splice', index: previousIndex + addedRemovedLength, removed: removed, added: added};
				addedRemovedLength -= removed.length;
				addedRemovedLength += added.length;
				splices.push(splice);
			}

			while (!done) {
				while(
				previousIndex < previous.length
				&& newIndex < array.length
				&& previous[previousIndex] === array[newIndex]) {
					previousIndex++;
					newIndex++;
				}

				if (previousIndex === previous.length && newIndex === array.length) {
					done = true;
				} else if (newIndex === array.length) {
					// New array is finished
					removed = [];
					let index = previousIndex;
					while(index < previous.length) {
						removed.push(previous[index++]);
					}
					remove(removed);
					done = true;
				} else if (previousIndex === previous.length) {
					// Previous array is finished.
					added = [];
					while(newIndex < array.length) {
						added.push(array[newIndex++]);
					}
					add(added);
					done = true;
				} else {
					// Found mid-area of missmatch.
					let previousScanIndex = previousIndex;
					let newScanIndex = newIndex;
					let foundMatchAgain = false;

					while(previousScanIndex < previous.length && !foundMatchAgain) {
						newScanIndex = newIndex;
						while(newScanIndex < array.length && !foundMatchAgain) {
							if (previous[previousScanIndex] === array[newScanIndex]) {
								foundMatchAgain = true;
							}
							if (!foundMatchAgain) newScanIndex++;
						}
						if (!foundMatchAgain) previousScanIndex++;
					}
					removeAdd(previous.slice(previousIndex, previousScanIndex), array.slice(newIndex, newScanIndex));
					previousIndex = previousScanIndex;
					newIndex = newScanIndex;
				}
			}

			return splices;
		}


		/************************************************************************
		 *
		 *  Merge into & forwarding/overlay
		 *
		 ************************************************************************/

		// let overlayBypass = {  // maybe useful when direct const access?
			// 'forwardsTo' : true,
			// 'removeForwarding' : true,
			// 'mergeAndRemoveForwarding' : true
		// };

		function mergeInto(source, target) {
			// console.log("merge into!!");
			if (source instanceof Array) {
				let splices = differentialSplices(target.const.target, source.const.target);
				splices.forEach(function(splice) {
					let spliceArguments = [];
					spliceArguments.push(splice.index, splice.removed.length);
					spliceArguments.push.apply(spliceArguments, splice.added); //.map(mapValue))
					target.splice.apply(target, spliceArguments);
				});
				for (property in source) {
					if (isNaN(property)) {
						target[property] = source[property];
					}
				}
			} else {
				for (property in source) {
					target[property] = source[property];
				}
			}
			return target;
		}

		function mergeOverlayIntoObject(object) {
			let overlay = object.nonForwardConst.forwardsTo;
			object.nonForwardConst.forwardsTo = object.nonForwardConst.storedForwardsTo;
			delete object.nonForwardConst.storedForwardsTo;
			mergeInto(overlay, object);
		}

		function genericMergeFrom(otherObject) {
			return mergeInto(otherObject, this);
		}

		function genericForwarder(otherObject) {
			this.const.forwardsTo = otherObject; // Note: not in use
		}

		function genericRemoveForwarding() {
			this.nonForwardConst.forwardsTo = null; // Note: not in use
		}

		function genericMergeAndRemoveForwarding() {
			mergeOverlayIntoObject(this);
		}

		/************************************************************************
		 *
		 *  Projection (continous creation and infusion)
		 *
		 *  TODO: Deal with zombie objects that is already forwarding... 
		 *
		 ************************************************************************/

		function genericReCacheInCacheFunction() {
			let argumentsArray = argumentsToArray(arguments);
			if (inReCache() > 0) {
				return this.const.reCached.apply(this, argumentsArray);
			} else {
				let functionName = argumentsArray.shift();
				return this[functionName].apply(this, argumentsArray);
			}
		}

		function genericReCacheFunction() {
			// console.log("call reCache");
			// Split argumentsp
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			let cache = getObjectAttatchedCache(this, "_reCachedCalls", functionName);
			let functionCacher = getFunctionCacher(cache, argumentsList);

			if (!functionCacher.cacheRecordExists()) {
				// console.log("init reCache ");
				let cacheRecord = functionCacher.createNewRecord();
				cacheRecord.independent = true; // Do not delete together with parent

				cacheRecord.cacheIdObjectMap = {};
				cacheRecord.remove = function() {
					functionCacher.deleteExistingRecord();
					cacheRecord.micro.remove(); // Remove recorder
				};

				// Is this call non-automatic
				cacheRecord.directlyInvokedByApplication = noContext();

				// Never encountered these arguments before, make a new cache
				enterContext('reCache', cacheRecord);
				nextIsMicroContext = true;
				getSpecifier(cacheRecord, 'contextObservers').noMoreObserversCallback = function() {
					contextsScheduledForPossibleDestruction.push(cacheRecord);
				};
				cacheRecord.repeaterHandler = repeatOnChange(
					function () {
						cacheRecord.newlyCreated = [];
						let newReturnValue;
						// console.log("better be true");
						// console.log(inReCache());
						newReturnValue = this[functionName].apply(this, argumentsList);
						// console.log(cacheRecord.newlyCreated);

						// console.log("Assimilating:");
						withoutRecording(function() { // Do not observe reads from the overlays
							cacheRecord.newlyCreated.forEach(function(created) {
								if (created.nonForwardConst.forwardsTo !== null) {
									// console.log("Has overlay, merge!!!!");
									mergeOverlayIntoObject(created);
								} else {
									// console.log("Infusion id of newly created:");
									// console.log(created.const.cacheId);
									if (created.const.cacheId !== null) {

										cacheRecord.cacheIdObjectMap[created.const.cacheId] = created;
									}
								}
							});
						}.bind(this));

						// See if we need to trigger event on return value
						if (newReturnValue !== cacheRecord.returnValue) {
							cacheRecord.returnValue = newReturnValue;
							notifyChangeObservers(cacheRecord.contextObservers);
						}
					}.bind(this)
				);
				leaveContext();
				registerAnyChangeObserver(cacheRecord.contextObservers);
				return cacheRecord.returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				let cacheRecord = functionCacher.getExistingRecord();
				registerAnyChangeObserver(cacheRecord.contextObservers);
				return cacheRecord.returnValue;
			}
		}


		/************************************************************************
		 *
		 *  Block side effects
		 *
		 ************************************************************************/


		let throwErrorUponSideEffect = false;
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
				writeRestriction = sideEffectBlockStack[sideEffectBlockStack.length - 1];
			}
			return returnValue;
		}
		
		
		 
		/************************************************************************
		 *
		 *   Object activity list
		 *
		 ************************************************************************/
		 
		let activityListFirst = null; 
		let activityListLast = null; 
		let activityListFilter = null;
		
		function setActivityListFilter(filter) {
			activityListFilter = filter;
		}
		
		function getActivityListFirst() {
			return (activityListFirst !== null) ? activityListFirst.const.object : null;
		}
		
		function getActivityListLast() {
			return (activityListLast !== null) ? activityListLast.const.object : null;
		}

		function getActivityListPrevious(object) {
			return object.const.handler.activityListPrevious;
		}

		function getActivityListNext(object) {
			return object.const.handler.activityListNext;
		}
		
		function pokeObject(object) {
			let tmpFrozen = activityListFrozen;
			activityListFrozen = 0;
			registerActivity(object.const.handler);
			activityListFrozen = tmpFrozen;
		}

		function removeFromActivityList(proxy) {
			if (trace.basic) log("<<< removeFromActivityList : "  + proxy.const.name + " >>>");
			removeFromActivityListHandler(proxy.const.handler);
		}
		
		let activityListFrozen = 0;
		function freezeActivityList(action) {
			activityListFrozen++;
			action();
			activityListFrozen--;
		}
		
		function stacktrace() { 
			function st2(f) {
				return !f ? [] : 
					st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + f.arguments.join(',') + ')']);
			}
			return st2(arguments.callee.caller);
		}
		
		function logActivityList() {
			activityListFrozen++;
			blockingInitialize++;
		
			let current = activityListFirst;
			let result = "[";
			let first = true;
						// log("activityList: ");
			while(current !== null && typeof(current) !== 'undefined') {
				if (!first) {
					result += ", ";
				}
				result += current.const.name;
				// current = current.activityListPrevious;
				current = current.activityListNext;
				first = false;
			}
			
			log(result + "]");
			
			blockingInitialize--;
			activityListFrozen--;
		}
		
		function registerActivity(handler) {
			// log("registerActivity");
			if (activityListFrozen === 0 && activityListFirst !== handler ) {
				// log("here");
				activityListFrozen++;
				blockingInitialize++;
				
				if (activityListFilter === null || activityListFilter(handler.const.object)) {
					// log("here2");
								
					if (trace.basic) {
						// stacktrace();
						// throw new Error("see ya");
						log("<<< registerActivity: "  + handler.const.name + " >>>");
						// log(activityListFilter(handler.const.object));
					}
					logGroup();
					// log(handler.target);
					// Init if not initialized
					if (typeof(handler.activityListNext) === 'undefined') {
						handler.activityListNext = null;
						handler.activityListPrevious = null;
					}
					
					// Remove from wherever it is in the structure
					removeFromActivityListHandler(handler);

					// Add first
					handler.activityListPrevious = null;
					if (activityListFirst !== null) {
						activityListFirst.activityListPrevious = handler;
						handler.activityListNext = activityListFirst;
					} else {
						activityListLast = handler;
					}
					activityListFirst = handler;				
					
					if (trace.basic) logActivityList();
					logUngroup();
				}
				
				blockingInitialize--;
				activityListFrozen--;
			}
		}
		
		function removeFromActivityListHandler(handler) {
			// Remove from wherever it is in the structure
			if (handler.activityListNext !== null) {
				handler.activityListNext.activityListPrevious = handler.activityListPrevious;
			}
			if (handler.activityListPrevious !== null) {
				handler.activityListPrevious.activityListNext = handler.activityListNext;
			}
			if (activityListLast === handler) {
				activityListLast = handler.activityListPrevious;
			}
			if (activityListFirst === handler) {
				activityListFirst = handler.activityListNext;
			}
			handler.activityListNext = null;
			handler.activityListPrevious = null;
		}
		
		
		/************************************************************************
		 *
		 *  Debugging
		 *
		 ************************************************************************/
		 
		function getInPulse() {
			return inPulse;
		}
		
		/************************************************************************
		 *
		 *  Module installation and configuration
		 *
		 ************************************************************************/

		
		// Language extensions
		let languageExtensions = {
			// Object creation and identification
			create : create,
			c : create,
			isObject: isObject,
			
			// Reactive primitives
			uponChangeDo : uponChangeDo,
			repeatOnChange : repeatOnChange,
			repeat: repeatOnChange,
			
			// Global modifiers
			withoutSideEffects : withoutSideEffects,
			assertNotRecording : assertNotRecording,
			withoutRecording : withoutRecording,
			withoutNotifyChange : nullifyObserverNotification,
			withoutEmittingEvents : withoutEmittingEvents,
			disableIncomingRelations : disableIncomingRelations,
			blockInitialize : blockInitialize,
			
			// Pulses and transactions
			pulse : pulse, // A sequence of transactions, end with cleanup.
			transaction: transaction, // Single transaction, end with cleanup. 	
			
			// Incoming images
			forAllIncoming : forAllIncoming,
			createArrayIndex : createArrayIndex,
			setIndex : setIndex
		}
		
		// Debugging and testing
		let debuggingAndTesting = {
			observeAll : observeAll,
			cachedCallCount : cachedCallCount,
			clearRepeaterLists : clearRepeaterLists,
			resetObjectIds : resetObjectIds,
			getInPulse : getInPulse,
			trace : trace
		}
			
		/**
		 *  Module installation
		 * @param target
		 */
		function install(target) {
			if (typeof(target) === 'undefined') {
				target = (typeof(global) !== 'undefined') ? global : window;
			}

			Object.assign(target, languageExtensions);
			Object.assign(target, debuggingAndTesting);
			return target;
		}

		
		let causalityInstance = {
			state : state,
			
			// Install causality to global scope. 
			install : install,
			
			// Setup. Consider: add these to configuration instead? 
			addPostPulseAction : addPostPulseAction,
			setCustomCanRead : setCustomCanRead,
			setCustomCanWrite : setCustomCanWrite,
			addRemovedLastIncomingRelationCallback : addRemovedLastIncomingRelationCallback,
			
			// Id expressions
			isIdExpression : isIdExpression, 
			idExpression : idExpression, 
			extractIdFromExpression : extractIdFromExpression,
			transformPossibleIdExpression : transformPossibleIdExpression,
			
			// Activity list interface
			logActivityList : logActivityList,
			freezeActivityList : freezeActivityList,
			setActivityListFilter : setActivityListFilter,
			getActivityListLast : getActivityListLast,
			getActivityListFirst : getActivityListFirst,
			getActivityListNext : getActivityListNext,
			getActivityListPrevious : getActivityListPrevious,
			pokeObject : pokeObject,
			removeFromActivityList : removeFromActivityList
		}
		Object.assign(causalityInstance, languageExtensions);
		Object.assign(causalityInstance, debuggingAndTesting);
		return causalityInstance;
	}
	
	
	function sortedKeys(object) {
		let keys = Object.keys(object);
		keys.sort(function(a, b){
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		});
		let sortedObject = {};
		keys.forEach(function(key) {
			sortedObject[key] = object[key];
		});
		return sortedObject;
	}
	
	function getDefaultConfiguration() {
		return {
			// Main feature switch, turn off for performance! This property will be set automatically depending on the other settings.
			activateSpecialFeatures : false, 
						
			// Special features
			useIncomingStructures : false,
			incomingStructureChunkSize: 500,
			incomingChunkRemovedCallback : null,
			incomingStructuresAsCausalityObjects: false,
			incomingReferenceCounters : false, 
			blockInitializeForIncomingStructures: false, 
			blockInitializeForIncomingReferenceCounters: false, 
			
			cumulativeAssignment : false,
			directStaticAccess : false,
			objectActivityList : false,
			recordPulseEvents : false
		}
	}
	
	let configurationToSystemMap = {};
    return function(requestedConfiguration) {
		if(typeof(requestedConfiguration) === 'undefined') {
			requestedConfiguration = {};
		}
		
		// Create configuration 
		let defaultConfiguration = getDefaultConfiguration();
		Object.assign(defaultConfiguration, requestedConfiguration);
		let anySet = false;
		for (property in defaultConfiguration) {
			anySet = (defaultConfiguration[property] === true) || anySet;
		}
		if (anySet) {
			defaultConfiguration.activateSpecialFeatures = true;
		}
		
		// Create configuration signature
		let configuration = sortedKeys(defaultConfiguration);
		let signature = JSON.stringify(configuration);
		// console.log("================= REQUEST: ==========");
		// console.log(signature);
		
		if (typeof(configurationToSystemMap[signature]) === 'undefined') {
			configurationToSystemMap[signature] = createCausalityInstance(configuration);
		}
		return configurationToSystemMap[signature];
	};	
}));
