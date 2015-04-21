#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    pendingTasks = [],
    etree;

var appxManifests = [
  {
    name : 'package.phone.appxmanifest',
    elementPrefix : "m3:"
  },
  {
    name : 'package.windows.appxmanifest',
    elementPrefix : "m2:"
  },
  {
    name : 'package.windows80.appxmanifest',
    elementPrefix : ""
  }
];

var createElement = function (el, rotations, prefix) {
  console.log(etree);

  var rotationEl = etree.SubElement(el, prefix + "InitialRotationPreference");
  rotations.forEach(function(rotation, index, array){
    // create rotation preference element
    var rotationSub = etree.SubElement(rotationEl, prefix + ":Rotation");
    rotationSub.attrib["Preference"] = rotation;
  });
};

var logger = {
  log: function () {
    if (process.env.NODE_ENV !== 'test') {
      console.log.apply(this, arguments)
    }
  }
};

var mapToWindowsRotation = function (configRotation) {
  var rotations = [];

  switch (configRotation) {
    case "portrait":
    rotations.push("portrait");
    rotations.push("portraitFlipped");
    break;

    case "portrait-primary":
    rotations.push("portrait");
    break;

    case "portrait-secondary":
    rotations.push("portraitFlipped");
    break;

    case "landscape":
    rotations.push("landscape");
    rotations.push("landscapeFlipped");
    break;

    case "landscape-primary":
    rotations.push("landscape");
    break;

    case "landscape-secondary":
    rotations.push("landscapeFlipped");
    break;

    case "any":
    case "natural":
    rotations.push("portrait");
    rotations.push("portraitFlipped");
    rotations.push("landscape");
    rotations.push("landscapeFlipped");
    break;
  }

  return rotations;
};

var loadManifestRotations = function () {
  // read W3C manifest
  var manifestPath = 'manifest.json';
  var manifestJson = fs.readFileSync(manifestPath).toString().replace(/^\uFEFF/, '');
  var manifest = JSON.parse(manifestJson);
  var windowsRotations = mapToWindowsRotation(manifest.orientation);
  console.log(windowsRotations);
  return windowsRotations;
};


module.exports = function (context) {
    logger.log('Updating Cordova configuration...');

    etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

    // create a parser for the Cordova configuration
    var projectRoot = context.opts.projectRoot;

    // get the selected rotations from config
    var rotations = loadManifestRotations();

    appxManifests.forEach(function(val, index, array) {
      var appManifestPath = path.join(projectRoot, 'platforms', 'windows', val.name);

      var data = fs.readFileSync(appManifestPath).toString();
      if (data) {
        // Remove Byte-Order-Mark (BOM)
        var cleanedString = data.replace("\ufeff", "");
        parsedAppManifest = etree.parse(cleanedString);

        // find VisualAssets element
        var elementPath = "*/Application/" + val.elementPrefix + "VisualElements";
        var el = parsedAppManifest.findall(elementPath)[0];
        if (el) {
            // create InitialRotationPreference
            createElement(el, rotations, val.elementPrefix);
        }

       // save the updated configuration
        var updatedManifest = parsedAppManifest.write();
        fs.writeFileSync(appManifestPath, updatedManifest);
      }
    });
}
