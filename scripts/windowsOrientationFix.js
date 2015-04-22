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

var createElement = function (el, orientations, prefix) {
  var rotationEl = etree.SubElement(el, prefix + "InitialRotationPreference");

  for (var i = 0; i < orientations.length; i++){
    // create rotation preference element
    console.log("create Rotation element for " + orientations[i]);
    var orientationsub = etree.SubElement(rotationEl, prefix + "Rotation");
    orientationsub.attrib["Preference"] = orientations[i];
  }
};

var logger = {
  log: function () {
    if (process.env.NODE_ENV !== 'test') {
      console.log.apply(this, arguments)
    }
  }
};

var mapToWindowsOrientation = function (configOrientation) {
  var orientations = [];

  switch (configOrientation) {
    case "portrait":
    orientations.push("portraitFlipped");
    orientations.push("portrait");
    break;

    case "portrait-primary":
    orientations.push("portrait");
    break;

    case "portrait-secondary":
    orientations.push("portraitFlipped");
    break;

    case "landscape":
    orientations.push("landscape");
    orientations.push("landscapeFlipped");
    break;

    case "landscape-primary":
    orientations.push("landscape");
    break;

    case "landscape-secondary":
    orientations.push("landscapeFlipped");
    break;

    case "any":
    case "natural":
    orientations.push("portrait");
    orientations.push("landscape");
    break;
  }

  return orientations;
};

module.exports = function (context) {
    // read W3C manifest
    var manifestPath = 'manifest.json';
    var manifestJson = fs.readFileSync(manifestPath).toString().replace(/^\uFEFF/, '');
    var manifest = JSON.parse(manifestJson);

    if (!manifest.orientation){
      return;
    }

    var orientations = mapToWindowsOrientation(manifest.orientation);
    console.log(orientations.length);
    logger.log('Updating Cordova configuration...');

    etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

    // create a parser for the Cordova configuration
    var projectRoot = context.opts.projectRoot;

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
            console.log("creating InitialRotiationPreference element in " + val.name);
            createElement(el, orientations, val.elementPrefix);
        }

       // save the updated configuration
        var updatedManifest = parsedAppManifest.write();
        fs.writeFileSync(appManifestPath, updatedManifest);
      }
    });
}
