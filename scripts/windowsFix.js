#!/usr/bin/env node

var fs = require('fs'),
path = require('path'),
createConfigParser = require('./createConfigParser'),
pendingTasks = [],
Q,
projectRoot,
config,
etree;

var logger = {
  log: function () {
    if (process.env.NODE_ENV !== 'test') {
      console.log.apply(this, arguments)
    }
  }
};

// Configure Cordova configuration parser
function configureParser(context) {
  var cordova_util = context.requireCordovaModule('cordova-lib/src/cordova/util'),
  ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
  etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

  var windowsConfig = path.join(projectRoot, 'platforms', 'windows');
  var xml = cordova_util.projectConfig(windowsConfig);
  config = createConfigParser(xml, etree, ConfigParser);
}

module.exports = function (context) {
  logger.log('Applying windows fix...');

  Q = context.requireCordovaModule('q');

  // create a parser for the Cordova configuration
  projectRoot = context.opts.projectRoot;
  configureParser(context);

  // read W3C manifest
  var manifestPath = path.join(projectRoot, 'manifest.json');
  var manifestJson = fs.readFileSync(manifestPath).toString().replace(/^\uFEFF/, '');
  var manifest = JSON.parse(manifestJson);

  // update name, start_url, orientation, and fullscreen from manifest
  config.setAttribute('content', 'src', 'index.html');

  // save the updated configuration
  config.write();
}
