#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    etree,
  	projectRoot;

var logger = {
  log: function () {
    if (process.env.NODE_ENV !== 'test') {
      console.log.apply(this, arguments)
    }
  },
  warn: function() {
    if (process.env.NODE_ENV !== 'test') {
      console.warn.apply(this, arguments)
    }
  }
};

function copyFile(source, target, callback) {
  var cbCalled = false;

  function done(err) {
    if (!cbCalled) {
      callback(err);
      cbCalled = true;
    }
  }

  var rd = fs.createReadStream(source);
  rd.on('error', done);

  var wr = fs.createWriteStream(target);
  wr.on('error', done);
  wr.on('close', function() {
    done();
  });
  rd.pipe(wr);
};

function updateManifestFile(manifestPath) {
    var contents = fs.readFileSync(manifestPath, 'utf-8');
    if(contents) {
        //Windows is the BOM. Skip the Byte Order Mark.
        contents = contents.substring(contents.indexOf('<'));
    }
    
    var startPage = "www/wrapper.html";
    var manifest =  new etree.ElementTree(etree.XML(contents));   
    var appNode = manifest.find('.//Application');
    
    appNode.attrib.StartPage = startPage;
    
    // Write out manifest
    fs.writeFileSync(manifestPath, manifest.write({indent: 4}), 'utf-8');
}

function updateWindowsManifests() {  
  var MANIFEST_WINDOWS8   = 'package.windows80.appxmanifest',
      MANIFEST_WINDOWS    = 'package.windows.appxmanifest',
      MANIFEST_PHONE      = 'package.phone.appxmanifest',
      MANIFEST_WINDOWS10  = 'package.windows10.appxmanifest';
  
    // Apply appxmanifest changes
    [ MANIFEST_WINDOWS,
      MANIFEST_WINDOWS8,
      MANIFEST_PHONE,
      MANIFEST_WINDOWS10 ].forEach(
        function(manifestFile) {
            updateManifestFile(path.join(projectRoot, "platforms", "windows", manifestFile));
    });
}

module.exports = function (context) {
  projectRoot = context.opts.projectRoot;
  
  // if the windows folder does not exist, cancell the script
  var windowsPath = path.join(projectRoot, "platforms","windows");
  if (!fs.existsSync(windowsPath)) {
    return;
  }

  etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');
  
  // move contents of the assets folder to the windows platform dir
  var Q = context.requireCordovaModule('q');

  var filename = "wrapper";

  var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.html");
  var destPath = path.join(projectRoot, "platforms","windows", "www", filename + ".html");

  logger.log('Copying wrapper html file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

  var task = Q.defer();
  copyFile(sourcePath, destPath, function (err) {
    if (err) {
      console.error(err);
      return task.reject(err);
    }

    console.log("Finished copying wrapper html file for the windows platform.");

    var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.js");
    var destPath = path.join(projectRoot, "platforms", "windows", "www", "js", filename +".js");

    logger.log('Copying wrapper js file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

    copyFile(sourcePath, destPath, function (err) {
      if (err) {
        console.error(err);
        return task.reject(err);
      }

      console.log("Finished copying wrapper js file for the windows platform.");

      var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.css");
      var destPath = path.join(projectRoot, "platforms", "windows", "www", "css", filename + ".css");

      logger.log('Copying wrapper css file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

      copyFile(sourcePath, destPath, function (err) {
        if (err) {
          console.error(err);
          return task.reject(err);
        }

        console.log("Finished copying wrapper css file for the windows platform.");
        
        updateWindowsManifests();
        
        task.resolve();
      });
    });
  });

  return task.promise;
};
