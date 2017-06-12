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
	
	function createCausalityInstance(configuration) {
		let settingA = configuration.settingA;
		let settingB = configuration.settingB;
		let settingC = configuration.settingC;

		function featureA() {
			//...
		}

		function featureB() {
			//...
		}

		function featureC() {
			//...
		}
		
		return {
			featureA : featureA,
			featureB : featureB,
			featureC : featureC,
		};
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
	}
	
	function getDefaultConfiguration() {
		return {
			settingA : true,
			settingB : true,
			settingC : true
		};
	}
	
	let configurationToSystemMap = {};
    return function(requestedConfiguration) {
		if(typeof(requestedConfiguration) === 'undefined') {
			requestedConfiguration = {};
		}
		
		let defaultConfiguration = getDefaultConfiguration();
		Object.assign(defaultConfiguration, requestedConfiguration);
		let configuration = sortKeys(defaultConfiguration);
		let signature = JSON.toString(configuration);
		
		if (typeof(configurationToSystemMap[signature]) !== 'undefined') {
			configurationToSystemMap[signature] = createCausalityInstance(configuration);
		}
		return configurationToSystemMap[signature];
	};
}));