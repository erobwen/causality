var fs = require('fs'),
    includedFiles_ = {};

global.actualInclude = function(fileName) {
    // var sys = require('sys');
    console.log('Loading file: ' + fileName);
    var ev = require(fileName);
    for (var prop in ev) {
        global[prop] = ev[prop];
    }
    includedFiles_[fileName] = true;
};

global.include = function(fileName) {
    if (!includedFiles_[fileName]) {
        actualInclude(fileName);
    }
};

global.includeFolderOnce = function(folder) {
    // console.log(process.cwd());
    var file, fileName,
        // sys = require('sys'),
        files = fs.readdirSync(folder);

    var getFileName = function(str) {
            var splited = str.split('.');
            splited.pop();
            return splited.join('.');
        },
        getExtension = function(str) {
            var splited = str.split('.');
            return splited[splited.length - 1];
        };

    for (var i = 0; i < files.length; i++) {
        file = files[i];
        if (getExtension(file) === 'js') {
            fileName = getFileName(file);
            try {
                include(folder + '/' + file);
            } catch (err) {
                // if (ext.vars) {
                //   console.log(ext.vars.dump(err));
                // } else {
                console.log(err);
                // }
            }
        }
    }
};