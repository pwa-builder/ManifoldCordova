#!/usr/bin/env node

var createConfigParser = require('./createConfigParser'),
	fs = require('fs'),
	path = require('path'),
	config,
	windowsConfig,
	projectRoot,
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

  var xml = cordova_util.projectConfig(projectRoot);
  config = createConfigParser(xml, etree, ConfigParser);
  
  var windowsDir = path.join(projectRoot, 'platforms', 'windows');
  if (fs.existsSync(windowsDir)) {
	  var windowsXml = cordova_util.projectConfig(windowsDir);
	  windowsConfig = createConfigParser(windowsXml, etree, ConfigParser);
  }
}

module.exports = function (context) {
  logger.log('Removing default images from cordova configuration...');

  // create a parser for the Cordova configuration
  projectRoot = context.opts.projectRoot;
  configureParser(context);

  // Remove default images from configuration file
  config.removeElements('.//icon[@hap-default-image=\'yes\']');
  config.removeElements('.//splash[@hap-default-image=\'yes\']');

  // save the updated configuration
  config.write();
  
  if (windowsConfig) {
	  // Patch for windows: restoring the start page to index.html
	  logger.log('Applying windows fix...');
	  windowsConfig.setAttribute('content', 'src', 'index.html');
	  windowsConfig.write();
  }
}
