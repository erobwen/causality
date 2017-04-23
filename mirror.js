
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
			if (typeof(createFunction) !== 'undefined') {
				object[specifierName] = createFunction({ _mirror_specifier_parent : object, _mirror_specifier_property : specifierName });
			} else {
				object[specifierName] = { _mirror_specifier_id : nextSpecifierId++, _mirror_specifier_parent : object, _mirror_specifier_property : specifierName };						
			}
		}
		return object[specifierName];
	} 

	function addInArray(array , referencedObject) {
		// let relationName = null;
		
		// let mirrorIncomingRelation = null;
		// if (typeof(referencedObject._mirror_incoming_relation) !== 'undefined')  {
			// mirrorIncomingRelation = referencedObject;
		// } else if (typeof(referencedObject._mirror_incoming_relations) === 'undefined') {
			// let mirrorIncomingRelations = { _mirror_incoming_relations : true };
			// referencedObject._mirror_incoming_relations = mirrorIncomingRelations; 
			// mirrorIncomingRelation = { _mirror_incoming_relation : true };
			// mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
		// } else {
			// if (referencedObject._mirror_incoming_relations === true) {
				// mirrorIncomingRelation = { _mirror_incoming_relation : true };
				// referencedObject[relationName] = mirrorIncomingRelation;
			// } else {
				// let mirrorIncomingRelations = referencedObject._mirror_incoming_relations;
				// mirrorIncomingRelation = { _mirror_incoming_relation : true };
				// mirrorIncomingRelations[relationName] = mirrorIncomingRelation;
			// }
		// }
		
		// console.log(activeRecorder);
		if (typeof(referencedObject.initialized) === 'undefined') {
			referencedObject.description = ""; // TODO;
			referencedObject.isRoot = true;
			referencedObject.contents = {};
			referencedObject.contentsCounter = 0;
			referencedObject.initialized = true;
			referencedObject.first = null;
			referencedObject.last = null;
		}

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

		if (typeof(referencedObject.contents[refererId]) !== 'undefined') {
			return;
		}

		if (referencedObject.contentsCounter === sourcesObserverSetChunkSize && referencedObject.last !== null) {
			referencedObject = referencedObject.last;
			if (typeof(referencedObject.contents[refererId]) !== 'undefined') {
				return;
			}
		}
		if (referencedObject.contentsCounter === sourcesObserverSetChunkSize) {
			let newChunk =
				{
					isRoot : false,
					contents: {},
					contentsCounter: 0,
					next: null,
					previous: null,
					parent: null
				};
			if (referencedObject.isRoot) {
				newChunk.parent = referencedObject;
				referencedObject.first = newChunk;
				referencedObject.last = newChunk;
			} else {
				referencedObject.next = newChunk;
				newChunk.previous = referencedObject;
				newChunk.parent = referencedObject.parent;
				referencedObject.parent.last = newChunk;
			}
			referencedObject = newChunk;
		}

		// Add repeater on object beeing observed, if not already added before
		let referencedObjectContents = referencedObject.contents;
		if (typeof(referencedObjectContents[refererId]) === 'undefined') {
			referencedObject.contentsCounter = referencedObject.contentsCounter + 1;
			referencedObjectContents[refererId] = referer;

			// Note dependency in repeater itself (for cleaning up)
			// activeRecorder.sources.push(referencedObject);
			array.push(referencedObject);
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
		
		