
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

	 
	/**
	* Get specifier
	*/	
	function getSpecifier(object, specifierName, createFunction) {
		if (typeof(object[specifierName] === 'undefined')) {
			if (typeof(createFunction) !== 'undefined') {
				object[specifierName] = createFunction({ _mirror_specifier_parent : object, _mirror_specifier_property : specifierName });
			} else {
				object[specifierName] = { _mirror_specifier_parent : object, _mirror_specifier_property : specifierName };				
			}
		}
		return object[specifierName];
	} 


	/**
	 * Mirror image
	 */
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
	
	return {
		getSpecifier : getSpecifier
	};
}));


	// createMirrorSpecifier(object, '_propertyObservers', property);



	// function create


	// let x = create(); 



		/**
		 *  Feather management
		 */	
		 /**
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
		
		