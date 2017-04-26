
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
	
	
	/*-----------------------------------------------
	 *                Identifiable
	 *-----------------------------------------------*/

	let nextSpecifierId = 1;
	
    let sourcesObserverSetChunkSize = 500;
	/**
	* Get specifier
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
	
	function findIncomingRelation(referencedObject, relationName) {
		if (referencedObject._mirror_incoming_relation === true)  {
			// The referenced object is the incoming relation itself. 
			return referencedObject;
		} else if (typeof(referencedObject._mirror_incoming_relations) === 'undefined') {
			// The argument is the referenced object itself, dig down into the structure. 
			let mirrorIncomingRelations = { _mirror_incoming_relations : true };
			referencedObject._mirror_incoming_relations = mirrorIncomingRelations; 
			let mirrorIncomingRelation = { _mirror_incoming_relation : true };
			mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
			return mirrorIncomingRelation;
		} else {
			if (referencedObject._mirror_incoming_relations === true) {
				// The argument is the incoming relation set, will never happen?
				let mirrorIncomingRelation = { _mirror_incoming_relation : true };
				referencedObject[relationName] = mirrorIncomingRelation;
				return mirrorIncomingRelation;
			} else {
				// The argument is the referenced object itself, but has already incoming relations defined. 
				let mirrorIncomingRelations = referencedObject._mirror_incoming_relations;
				if (typeof(mirrorIncomingRelations[relationName]) === 'undefined') {
					mirrorIncomingRelation = { _mirror_incoming_relation : true };
					mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
					return mirrorIncomingRelation;
				} else {
					return mirrorIncomingRelations[relationName];
				}
			}
		}
	}
	
	function setProperty(object, property, value) {
		let referingObject = getReferingObject(object, property);
		let relationName = gottenReferingObjectRelation;
		
		let referencedValue = value;
		if (typeof(value) === 'object') { //TODO: limit backwards referenes to mirror objects only.
			let mirrorIncomingRelation = findIncomingRelation(referencedObject, property);
			
		}
		
		object[property] = referencedValue;
	}
	
	function getProperty(object, property) {
		
	}
	
	function addInArray(array, referencedObject) {
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
			
	function intitializeAndConstructMirrorStructure(mirrorIncomingRelation, referingObject) {
		let refererId = referingObject.id;
		
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
			let newChunk =
				{
					isRoot : false,
					contents: {},
					contentsCounter: 0,
					next: null,
					previous: null,
					parent: null
				};
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
			
	function clearArray(array) {
		let refererId = null;
		let referer = array;
		if (typeof(array._mirror_outgoing_parent) !== 'undefined') {
			// TODO: loop recursivley
			refererId = array._mirror_outgoing_parent.id;
			referer = array._mirror_outgoing_parent
		} else {
			refererId = array.id;
			referer = array;
		}
		
		array.forEach(function(observerSet) { // From observed object
			// let observerSetContents = getMap(observerSet, 'contents');
			// if (typeof(observerSet['contents'])) { // Should not be needed
			//     observerSet['contents'] = {};
			// }
			let observerSetContents = observerSet['contents'];
			delete observerSetContents[refererId];
			let noMoreObservers = false;
			observerSet.contentsCounter--;
			if (observerSet.contentsCounter == 0) {
				if (observerSet.isRoot) {
					if (observerSet.first === null && observerSet.last === null) {
						noMoreObservers = true;
					}
				} else {
					if (observerSet.parent.first === observerSet) {
						observerSet.parent.first === observerSet.next;
					}

					if (observerSet.parent.last === observerSet) {
						observerSet.parent.last === observerSet.previous;
					}

					if (observerSet.next !== null) {
						observerSet.next.previous = observerSet.previous;
					}

					if (observerSet.previous !== null) {
						observerSet.previous.next = observerSet.next;
					}

					observerSet.previous = null;
					observerSet.next = null;

					if (observerSet.parent.first === null && observerSet.parent.last === null) {
						noMoreObservers = true;
					}
				}

				if (noMoreObservers && typeof(observerSet.noMoreObserversCallback) !== 'undefined') {
					observerSet.noMoreObserversCallback();
				}
			}
		});
		array.lenght = 0;  // From repeater itself.
	}

	
				
	
	return {
		createArrayIndex : createArrayIndex,
		getSpecifier : getSpecifier,
		clearArray : clearArray,
		addInArray : addInArray
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
				let key = sourceImage.id + ":" + propertyName;
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
				let key = sourceImage.id + ":" + propertyName;
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
		
		