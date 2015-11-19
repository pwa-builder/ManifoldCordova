#!/usr/bin/env node

var createConfigParser = require('./createConfigParser'),
	fs = require('fs'),
	path = require('path'),
	config,
  windowsConfig,
  androidConfig,
  iosConfig,
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
  var cordova_util = context.requireCordovaModule('cordova-lib/src/cordova/util');
  var ConfigParser;
  try {
    ConfigParser = context.requireCordovaModule('cordova-lib/node_modules/cordova-common').ConfigParser;
  } catch (err) {
    // Fallback to old location of config parser (old versions of cordova-lib)
    ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
  }
    
  etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

  var xml = cordova_util.projectConfig(projectRoot);
  config = createConfigParser(xml, etree, ConfigParser);
    
  var windowsDir = path.join(projectRoot, 'platforms', 'windows');
  if (fs.existsSync(windowsDir)) {
	  var windowsXml = cordova_util.projectConfig(windowsDir);
	  windowsConfig = createConfigParser(windowsXml, etree, ConfigParser);
  }
  
  var androidDir = path.join(projectRoot, 'platforms', 'android', 'res', 'xml');
  if (fs.existsSync(androidDir)) {
	  var androidXml = cordova_util.projectConfig(androidDir);
	  androidConfig = createConfigParser(androidXml, etree, ConfigParser);
  }
  
  var iosProjectName = config.name();
  if (iosProjectName) {
    var iosDir = path.join(projectRoot, 'platforms', 'ios', iosProjectName);
    if (fs.existsSync(iosDir)) {
  	  var iosXml = cordova_util.projectConfig(iosDir);
  	  iosConfig = createConfigParser(iosXml, etree, ConfigParser);
    }
  }
}

module.exports = function (context) {
  // create a parser for the Cordova configuration
  projectRoot = context.opts.projectRoot;
  configureParser(context);

  logger.log('Removing default images from Cordova configuration...');

  // Remove default images from root configuration file
  config.removeElements('.//icon[@hap-default-image=\'yes\']');
  config.removeElements('.//splash[@hap-default-image=\'yes\']');

  // save the updated configuration
  config.write();

  if (windowsConfig) {
    // Remove default images from windows configuration file
    windowsConfig.removeElements('.//icon[@hap-default-image=\'yes\']');
    windowsConfig.removeElements('.//splash[@hap-default-image=\'yes\']');
    
    windowsConfig.write();
  }
  
  if (androidConfig) {
    // Remove default images from android configuration file
    androidConfig.removeElements('.//icon[@hap-default-image=\'yes\']');
    androidConfig.removeElements('.//splash[@hap-default-image=\'yes\']');
    
    androidConfig.write();
  }
  
  if (iosConfig) {
    // Remove default images from ios configuration file
    iosConfig.removeElements('.//icon[@hap-default-image=\'yes\']');
    iosConfig.removeElements('.//splash[@hap-default-image=\'yes\']');
    
    iosConfig.write();
  }
}
