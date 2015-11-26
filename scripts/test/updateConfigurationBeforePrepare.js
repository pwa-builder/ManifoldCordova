'use strict';
process.env.NODE_ENV = 'test';

var updateConfiguration = require('../updateConfigurationBeforePrepare');
var tu = require('./test-utils');

var assert = require('assert');

var path = require('path');
var fs = require('fs');

var assetsDirectory = path.join(__dirname, 'assets');
var workingDirectory = path.join(__dirname, 'tmp');

function initializeContext(testDir) {
  
  var ctx = {
    opts : {
      plugin: {
        id: 'cordova-plugin-hostedwebapp'
      },
      projectRoot : testDir
    }
  };
            
  var requireCordovaModule = ctx.requireCordovaModule;

  ctx.requireCordovaModule = function(moduleName) {
    if (!moduleName) {
      if (requireCordovaModule) {
        return requireCordovaModule(moduleName);
      }
      else {
        return;
      }
    }

    if (moduleName === 'q') {
      return require('q');
    }

    if (moduleName === 'cordova-lib/src/cordova/util') {
      return require('cordova-lib/src/cordova/util');
    }

    if (moduleName === 'cordova-lib/node_modules/cordova-common') {
      return require('cordova-lib/node_modules/cordova-common');
    }

    if (moduleName === 'cordova-lib/src/configparser/ConfigParser') {
      return require('cordova-lib/src/configparser/ConfigParser');
    }

    if (moduleName === 'cordova-lib/node_modules/elementtree') {
      return require('cordova-lib/node_modules/elementtree');
    }

    if (requireCordovaModule) {
      return requireCordovaModule(moduleName);
    }
  };

  return ctx;
}

describe('updateConfigurationBeforePrepare.js', function (){
  beforeEach(function () {
    tu.copyRecursiveSync(assetsDirectory, workingDirectory);
  });

  it('Should update name with short_name value (without spaces) from manifest.json', function (done){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function() {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<name>WATDocs</name>') > -1);
      
      done();
    });
  });

  it('Should update name with name value (without spaces) from manifest.json if short_name is missing', function (done){
    var testDir = path.join(workingDirectory, 'shortNameMissing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function() {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<name>WATDocumentation</name>') > -1);
      
      done();
    });
  });
  
  it('Should ignore slashes when updating name from manifest.json', function (done) {
    var testDir = path.join(workingDirectory, 'shortNameWithSlashes');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<name>WATDocs</name>') > -1);
      
      done();
    });
  });

  it('Should not update name if it is missing in manifest.json', function (done) {
    var testDir = path.join(workingDirectory, 'jsonPropertiesMissing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<name>HelloWorld</name>') > -1);
      
      done();
    });
  });

  it('Should add name if XML element is missing', function (done){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<name>WATDocumentation</name>') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
      assert(content.indexOf('<name>WATDocumentation</name>') < content.indexOf('</widget>'));
      done();
    });
  });

 
  it('Should update orientation with value from manifest.json', function (done){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Orientation" value="landscape" />') > -1);
      
      done();
    });


  });

  it('Should not update orientation if it is missing in manifest.json', function (done){
    var testDir = path.join(workingDirectory, 'jsonPropertiesMissing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Orientation" value="default" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
      assert(content.indexOf('<preference name="Orientation" value="default" />') < content.indexOf('</widget>'));
      
      done();
    });
  });

  it('Should add orientation if XML element element is missing', function (done){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Orientation" value="landscape" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
      assert(content.indexOf('<preference name="Orientation" value="landscape" />') < content.indexOf('</widget>'));
      
      done();
    });
  });

  it('Should update fullscreen with value from manifest.json', function (done){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);    
    
      done();
    });
  });

  it('Should not update fullscreen if it is missing in manifest.json', function (done){
    var testDir = path.join(workingDirectory, 'jsonPropertiesMissing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);
    
      done();
    });
  });

  it('Should add fullscreen if XML element is missing', function (done){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<preference name="Fullscreen" value="true" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
      assert(content.indexOf('<preference name="Fullscreen" value="true" />') < content.indexOf('</widget>'));
    
      done();
    });
  });

  it('Should keep existing access rules unchanged in config.xml', function (done){
    var testDir = path.join(workingDirectory, 'jsonPropertiesMissing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<allow-navigation href="general-navigation-rule" />') > -1);        
      assert(content.indexOf('<allow-intent href="general-intent-rule" />') > -1); 
      assert(content.indexOf('<access origin="ios-access-rule" />') > -1); 
               
      done();
    });
  });

  it('Should keep generic network access rules from config.xml', function (done){
    var testDir = path.join(workingDirectory, 'fullAccessRules');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<access origin="https://*/*" />') > 0);
      assert(content.indexOf('<access origin="http://*/*" />') > 0);
      
      done();
    });
  });
  
  it('Should remove generic allow-intent rules from config.xml', function (done){
    var testDir = path.join(workingDirectory, 'fullAccessRules');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      assert(content.indexOf('<allow-intent href="https://*/*" />') === -1);
      assert(content.indexOf('<allow-intent href="http://*/*" />') === -1);
      assert(content.indexOf('<allow-intent href="*" />') === -1);
      
      done();
    });
  });

  it('Should add allow-navigation rule for web site domain in config.xml if scope is missing', function (done){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();

      assert(content.indexOf('<allow-navigation hap-rule="yes" href="http://wat-docs.azurewebsites.net/*" />') > 0);
      
      done();
    });
  });

  it('Should add allow-navigation rule for scope in config.xml if scope is a relative URL', function (done){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();

      assert(content.indexOf('<allow-navigation hap-rule="yes" href="http://wat-docs.azurewebsites.net/scope-path/*" />') > 0);
      
      done();
    });
  });

  it('Should add allow-navigation rules for scope in config.xml if scope is a full URL', function (done){
    var testDir = path.join(workingDirectory, 'fullUrlForScope');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();

      assert(content.indexOf('<allow-navigation hap-rule="yes" href="http://www.domain.com/*" />') > 0);
      
      done();
    });
  });

  it('Should add allow-navigation rule for scope in config.xml if scope is a full URL with wildcard as subdomain', function (done){
    var testDir = path.join(workingDirectory, 'wildcardSubdomainForScope');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();

      assert(content.indexOf('<allow-navigation hap-rule="yes" href="http://*.domain.com" />') > 0);

      done();
    });
  });

  it('Should add allow-navigation rules from mjs_access_whitelist list', function (done){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = initializeContext(testDir);

    updateConfiguration(ctx).then(function () {
      var content = fs.readFileSync(configXML).toString();
      
      assert(content.indexOf('<allow-navigation hap-rule="yes" href="whitelist-rule-1" />') > 0);
      assert(content.indexOf('<allow-navigation hap-rule="yes" href="whitelist-rule-2" />') > 0);

      done();
    });
  });

  afterEach(function () {
    tu.deleteRecursiveSync(workingDirectory);
  });
});
