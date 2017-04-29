
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
	/*-----------------------------------------------
	 *           Helpers
	 *-----------------------------------------------*/

	// Helper to quickly get a child object
	function getMap() {
		var argumentList = argumentsToArray(arguments);
		var object = argumentList.shift();
		while (argumentList.length > 0) {
			var key = argumentList.shift();
			if (typeof(object[key]) === 'undefined') {
				object[key] = {};
			}
			object = object[key];
		}
		return object;
	}

	function getProperty(object, property, defaultValue) {
		if (typeof(object[property]) === 'undefined') {
			object[property] = defaultValue;
		}
		return object[property]
	}


	/*-----------------------------------------------
	 *                Identifiable
	 *-----------------------------------------------*/

	/**
	 * Identifiable
	 */
	let nextId = 1;

	function getNextId() {
		return nextId++;
	}

	function createIdentifiable() {
		return { 
			_i_id : getNextId(),
			toString : function() { 
				this._i_id.toString(); 
			} 
		};
	}

	function isIdentifiable() {
		return (ypeof(value) === 'object' && typeof(value._i_id) !== 'undefined')
	}
	
	function create() {
		return {
			_mirror_is_reflected : true,
			_mirror_reflects : true
		};
	}
		
	/*-----------------------------------------------
	 *                Getters and setters
	 *-----------------------------------------------*/

	function forAllIncoming(object, property, callback) {
		if (typeof(object._mirror_incoming_relations) !== 'undefined') {
			let relations = object._mirror_incoming_relations;
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
	} 
	 
	function setupMirrorReference(object, property, value, createFunction) {
		if (!property.startsWith("_mirror_")) {
			let referingObject = getReferingObject(object, property);
			let relationName = gottenReferingObjectRelation;
			// console.log("setProperty:");
			// console.log(referingObject);
			// console.log(referingObject.__id);
					
			let referencedValue = value;
			if (typeof(value) === 'object' && typeof(value._mirror_reflects) !== 'undefined') { //TODO: limit backwards referenes to mirror objects only.
				let mirrorIncomingRelation = findIncomingRelation(referencedValue, property, createFunction);
				let incomingRelationChunk = intitializeAndConstructMirrorStructure(mirrorIncomingRelation, referingObject, createFunction);
				if (incomingRelationChunk !== null) {
					referencedValue = incomingRelationChunk;
				}
			}
			return referencedValue;
		} else {
			return value;
		}
	} 
	 
	function setProperty(object, property, value, createFunction) {
		let previousValue = object[property];
		removeMirrorStructure(object.__id, previousValue);
		setupMirrorReference(object, property, value, createFunction);
		object[property] = referencedValue;
	}
	
	function getProperty(object, property) {
		// if (typeof(property) === 'string') {
			// console.log("mirror.getProperty:");
			// property = "" + property;
			// console.log(property);
		if (property.startsWith("_mirror_")) {
			return object[property];
		} else {
			// console.log("Here!");
			let referedEntity = object[property];
			// console.log(referedEntity);
			return findReferredObject(referedEntity);
		}			
		// }
	}
	
	function addInArray(array, referencedObject) { // TODO: Push in array
		// Find relation name
		let referingObject = getReferingObject(array, "[]");
		let relationName = gottenReferingObjectRelation;

		// Find right place in the incoming structure.
		let mirrorIncomingRelation = findIncomingRelation(referencedObject, relationName);
		let incomingRelationChunk = intitializeAndConstructMirrorStructure(mirrorIncomingRelation, referingObject);
		if (incomingRelationChunk !== null) {
			array.push(incomingRelationChunk);
		}
	}

			
	function clearArray(array) {
		// let refererId = null;
		// let referer = array;
		// if (typeof(array._mirror_index_parent) !== 'undefined') {
			// TODO: loop recursivley
			// refererId = array._mirror_index_parent.__id;
			// referer = array._mirror_index_parent
		// } else {
			// refererId = array.__id;
			// referer = array;
		// }
		// Find relation name
		let referingObject = getReferingObject(array, "[]");
		// let relationName = gottenReferingObjectRelation;
		
		
		array.forEach(function(observerSet) {
			removeMirrorStructure(referingObject.__id, observerSet);
		});
		array.lenght = 0;  // From repeater itself.
	}
	

	
	/*-----------------------------------------------
	 *                Specifiers
	 *-----------------------------------------------*/

	let nextSpecifierId = 1;
	
    let sourcesObserverSetChunkSize = 500;
	
	/**
	* Creater helpers
	*/	
	function getSpecifier(object, specifierName, createFunction) {
		if (typeof(object[specifierName]) === 'undefined' || object[specifierName] === null) {
			let specifier = { 
				_mirror_specifier_parent : object, 
				_mirror_specifier_property : specifierName, 
				_mirror_incoming_relation : true   // This is a reuse of this object as incoming node as well.
			}
			if (typeof(createFunction) !== 'undefined') {
				object[specifierName] = createFunction(specifier);
			} else {
				object[specifierName] = specifier;
			}
		}
		return object[specifierName];
	} 

	function createArrayIndex(object, property) {
		let index = [];
		index._mirror_index_parent = object;
		index._mirror_index_parent_relation = property;
		index._mirror_outgoing_parent = object;
		object[property] = index;
		return index;
	}
	
	
	/*-----------------------------------------------
	 *            Relation structures
	 *-----------------------------------------------*/
	
	/**
	 * Traverse the index structure
	 */
	
	let gottenReferingObject;
	let gottenReferingObjectRelation;
	function getReferingObject(possibleIndex, relationFromPossibleIndex) {
		gottenReferingObject = possibleIndex;
		gottenReferingObjectRelation = relationFromPossibleIndex;
		while (typeof(gottenReferingObject._mirror_index_parent) !== 'undefined') {
			gottenReferingObjectRelation = gottenReferingObject._mirror_index_parent_relation;
			gottenReferingObject = gottenReferingObject._mirror_index_parent;
		}
		
		return gottenReferingObject;
	}
	
	
	/**
	 * Traverse the incoming relation structure
	 */
	
	function findReferredObject(referredItem) {
		if (typeof(referredItem) === 'object' && typeof(referredItem._mirror_referencedObject) !== undefined) {
			return referredItem._mirror_referencedObject;
		} else {
			return referredItem;
		}
	}
	
	function findIncomingRelation(referencedObject, relationName, createFunction) {
		if (referencedObject._mirror_incoming_relation === true)  {
			// The referenced object is the incoming relation itself. 
			return referencedObject;
		} else if (typeof(referencedObject._mirror_incoming_relations) === 'undefined') {
			// The argument is the referenced object itself, dig down into the structure. 
			let mirrorIncomingRelations = { _mirror_incoming_relations : true, _mirror_referencedObject: referencedObject };
			if (typeof(createFunction) !== 'undefined') mirrorIncomingRelations = createFunction(mirrorIncomingRelations); 
			
			referencedObject._mirror_incoming_relations = mirrorIncomingRelations; 
			let mirrorIncomingRelation = { _mirror_incoming_relation : true, _mirror_referencedObject: referencedObject };
			if (typeof(createFunction) !== 'undefined') mirrorIncomingRelation = createFunction(mirrorIncomingRelation); 
			
			mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
			return mirrorIncomingRelation;
		} else {
			if (referencedObject._mirror_incoming_relations === true) {
				// The argument is the incoming relation set, will never happen?
				let mirrorIncomingRelation = { _mirror_incoming_relation : true, _mirror_referencedObject: referencedObject };
				if (typeof(createFunction) !== 'undefined') mirrorIncomingRelation = createFunction(mirrorIncomingRelation); 
				referencedObject[relationName] = mirrorIncomingRelation;
				return mirrorIncomingRelation;
			} else {
				// The argument is the referenced object itself, but has already incoming relations defined. 
				let mirrorIncomingRelations = referencedObject._mirror_incoming_relations;
				if (typeof(mirrorIncomingRelations[relationName]) === 'undefined') {
					mirrorIncomingRelation = { _mirror_incoming_relation : true, _mirror_referencedObject: referencedObject };
					if (typeof(createFunction) !== 'undefined') mirrorIncomingRelation = createFunction(mirrorIncomingRelation);
					mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
					return mirrorIncomingRelation;
				} else {
					return mirrorIncomingRelations[relationName];
				}
			}
		}
	}
	
	
	/**
	* Structure helpers
	*/				
	function removeMirrorStructure(refererId, referedEntity) {
		if (typeof(referedEntity._mirror_incoming_relation) !== 'undefined') {
			let incomingRelation = referedEntity;
			let incomingRelationContents = incomingRelation['contents'];
			delete incomingRelationContents[refererId];
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

					incomingRelation.previous = null;
					incomingRelation.next = null;

					if (incomingRelation.parent.first === null && incomingRelation.parent.last === null) {
						noMoreObservers = true;
					}
				}

				if (noMoreObservers && typeof(incomingRelation.noMoreObserversCallback) !== 'undefined') {
					incomingRelation.noMoreObserversCallback();
				}
			}
		}
	}
	
	function intitializeAndConstructMirrorStructure(mirrorIncomingRelation, referingObject, createFunction) {
		let refererId = referingObject.__id;
		// console.log("intitializeAndConstructMirrorStructure:");
		// console.log(referingObject);
		
		
		// console.log(activeRecorder);
		if (typeof(mirrorIncomingRelation.initialized) === 'undefined') {
			mirrorIncomingRelation.isRoot = true;
			mirrorIncomingRelation.contents = {};
			mirrorIncomingRelation.contentsCounter = 0;
			mirrorIncomingRelation.initialized = true;
			mirrorIncomingRelation.first = null;
			mirrorIncomingRelation.last = null;
		}

		// Already added as relation
		if (typeof(mirrorIncomingRelation.contents[refererId]) !== 'undefined') {
			return null;
		}

		// Move on to new chunk?
		if (mirrorIncomingRelation.contentsCounter === sourcesObserverSetChunkSize) {
			let newChunk = {
				isRoot : false,
				contents: {},
				contentsCounter: 0,
				next: null,
				previous: null,
				parent: null
			};
			if (typeof(createFunction) !== 'undefined') {
				newChunk = createFunction(newChunk);
			}

			if (mirrorIncomingRelation.isRoot) {
				newChunk.parent = mirrorIncomingRelation;
				mirrorIncomingRelation.first = newChunk;
				mirrorIncomingRelation.last = newChunk;
			} else {
				mirrorIncomingRelation.next = newChunk;
				newChunk.previous = mirrorIncomingRelation;
				newChunk.parent = mirrorIncomingRelation.parent;
				mirrorIncomingRelation.parent.last = newChunk;
			}
			mirrorIncomingRelation = newChunk;
		}

		// Add repeater on object beeing observed, if not already added before
		let mirrorIncomingRelationContents = mirrorIncomingRelation.contents;
		if (typeof(mirrorIncomingRelationContents[refererId]) === 'undefined') {
			mirrorIncomingRelation.contentsCounter = mirrorIncomingRelation.contentsCounter + 1;
			mirrorIncomingRelationContents[refererId] = referingObject;

			// Note dependency in repeater itself (for cleaning up)
			// activeRecorder.sources.push(mirrorIncomingRelation);
			return mirrorIncomingRelation;
		} else {
			return null;
		}
	}
				
	
	return {
		create : create,
		createArrayIndex : createArrayIndex,
		getSpecifier : getSpecifier,
		clearArray : clearArray,
		addInArray : addInArray,
		getProperty : getProperty,
		setProperty : setProperty,
		removeMirrorStructure : removeMirrorStructure, 
		setupMirrorReference : setupMirrorReference,
		getNextId : getNextId,
		forAllIncoming : forAllIncoming 
	};
}));


	// createMirrorSpecifier(object, '_propertyObservers', property);



	// function create


	// let x = create(); 



		/**
		 *  Feather management
		 */	
		 /**
		 
	
	function setM(object, property, value) {
		let oldValue = object[property];
		
		if (oldValue !== value) {
			if(isIdentifiable(object) 
				&& typeof(object._mirror_isReflected) !== 'undefined'
				&& typeof(value) === 'object'
				&& typeof(value._mirror_reflects) !== 'undefined') {
				
				let reflections = getMap(value, '_mirror_reflections');
				let propertyReflections = getMap(reflections, property);
				if (getProperty(propertyReflections, 'count', 0) < 200) {
					// Reflections map small enought
					
				} else {
					// Reflections map not big enough
					
				}
			} else {
				object[property] = value;
			}		
		}
	}

	function getM(object, property) {
		
	}
	
	
		removeBackReferenceFromFeather : function(sourceImage, propertyName, targetImage) {
			if (sourceImage[propertyName] === targetImage) {
				// Internal back reference
				let incomingIntegrated = this.getMap(targetImage, 'incomingIntegrated');
				let key = sourceImage.__id + ":" + propertyName;
				delete incomingIntegrated[key];
				this.setDirty(targetImage, ['incomingIntegrated', key]);			
			} else {
				// Feather back reference
				let featherBarb = sourceImage[propertyName];
				delete featherBarb[sourceImage.__persistentId];
				this.setDirty(featherBarb);
			}
		},
		 
		storeBackReferenceInFeather : function(sourceImage, propertyName, targetImage) {
			let incomingIntegrated = this.getMap(targetImage, 'incomingIntegrated');
			if (Object.keys(incomingIntegrated).count < 100) {
				let key = sourceImage.__id + ":" + propertyName;
				incomingIntegrated[key] = sourceImage;
				this.setDirty(targetImage, ['incomingIntegrated', key]);
			} else {
				let incomingFeathers = this.getMapInImage(targetImage, targetImage, 'incomingFeathers');
				let propertyFeatherShaft = this.getMapInImage(targetImage, incomingFeathers, propertyName);
				
				// Get or create last feather strand
				if (typeof(propertyFeatherShaft.first) === 'undefined') {
					this.setDirty(targetImage);
					let newFeatherBarb = this.newPersistentFeatherImage(targetImage);
					propertyFeatherShaft.first = newFeatherBarb;
					propertyFeatherShaft.last = newFeatherBarb;
				}
				let lastFeatherBarb = propertyFeatherShaft.last;
				this.ensureLoaded(lastFeatherBarb);
				
				// If last feather strand is full, create a new one
				if(Object.keys(lastFeatherBarb) >= 512) {
					let newFeatherBarb = this.newPersistentFeatherImage(targetImage);
					
					lastFeatherBarb.next = newFeatherBarb;
					this.setDirty(lastFeatherBarb);
					
					propertyFeatherShaft.last = newFeatherBarb;
					this.setDirty(targetImage);
					
					newFeatherBarb.previous = lastFeatherBarb;
					this.setDirty(newFeatherBarb);
					
					lastFeatherBarb = newFeatherBarb;
				}
				
				// Add back reference and note strand as dirty
				lastFeatherBarb[sourceImage.__persistentId] = sourceImage;
				this.setDirty(lastFeatherBarb);
				
				return lastFeatherBarb;
			}
		},
		*/
		
		