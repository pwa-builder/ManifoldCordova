#!/usr/bin/env node

var createConfigParser = require('./createConfigParser'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    pendingTasks = [],
    Q,
    config,
  	projectRoot,
  	etree;

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

function deleteFile(path) {
  var t = Q.defer();
  pendingTasks.push(t);

  logger.log('Deleting ' + path + ' file for the windows platform.');

  fs.unlink(path, function (err) {
    if (err) {
      console.log(err);
      return t.reject();
    }

    t.resolve();
  });
}

// Configure Cordova configuration parser
function configureParser(context) {
  var cordova_util = context.requireCordovaModule('cordova-lib/src/cordova/util');
  var ConfigParser;
  try {
    ConfigParser = context.requireCordovaModule('cordova-lib/node_modules/cordova-common').ConfigParser;
  } catch (err) {
    // Fallback to old location of config parser (old versions of cordova-lib)
    ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
  }

  etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

  var xml = cordova_util.projectConfig(context.opts.projectRoot);
  config = createConfigParser(xml, etree, ConfigParser);
}

module.exports = function (context) {
  // If the plugin is not being removed, cancel the script
  if (context.opts.plugins.indexOf(context.opts.plugin.id) == -1) {
    return;
  }
  
  var projectRoot = context.opts.projectRoot;
  
  // if the windows folder does not exist, cancell the script
  var windowsPath = path.join(projectRoot, "platforms","windows");
  if (!fs.existsSync(windowsPath)) {
    return;
  }
  
  Q = context.requireCordovaModule('q');
  var task = Q.defer();

  var destPath = path.join(projectRoot, "platforms", "windows", "www", "wrapper.html");
  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  destPath = path.join(projectRoot, "platforms", "windows", "www", "js", "wrapper.js");

  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  destPath = path.join(projectRoot, "platforms", "windows", "www", "css", "wrapper.css");

  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  Q.allSettled(pendingTasks).then(function (e) {
    console.log("Finished removing assets for the windows platform.");

    // restore content source to index.html in all platforms.
    configureParser(context);
    if (config) {
      console.log("Restoring content source value to index.html");
      config.setAttribute('content', 'src', 'index.html');
      config.write();
    }
    else {
      console.log("could not load config.xml file");
    }

    task.resolve();
  });

  return task.promise;
};
