#!/usr/bin/env node

var createConfigParser = require('./createConfigParser'),
	fs = require('fs'),
	path = require('path'),
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
  
  var windowsDir = path.join(projectRoot, 'platforms', 'windows');
  if (fs.existsSync(windowsDir)) {
	  var windowsXml = cordova_util.projectConfig(windowsDir);
	  windowsConfig = createConfigParser(windowsXml, etree, ConfigParser);
  }
}

module.exports = function (context) {
  // create a parser for the Cordova configuration
  projectRoot = context.opts.projectRoot;
  configureParser(context);
  
  if (windowsConfig) {
    logger.log('Removing default images from windows configuration...');
    windowsConfig.removeElements('.//icon[@hap-default-image=\'yes\']');
    windowsConfig.removeElements('.//splash[@hap-default-image=\'yes\']');
    
    windowsConfig.write();
  }
}
