'use strict';
process.env.NODE_ENV = 'test';

var updateConfiguration = require('../updateConfiguration');
var tu = require('./test-utils');

var assert = require('assert');

var path = require('path');
var fs = require('fs');

var assetsDirectory = path.join(__dirname, 'assets');
var workingDirectory = path.join(__dirname, 'tmp');

function initializeContext(ctx) {
  if (!ctx) {
    ctx = {};
  }

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

describe('updateConfiguration.js', function (){
  beforeEach(function () {
    tu.copyRecursiveSync(assetsDirectory, workingDirectory);
  });

  it('Should update name with value from manifest.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>WAT Documentation</name>') > -1);
  });

  it('Should not update name if it is missing in manifest.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>HelloWorld</name>') > -1);
  });

  it('Should add name if XML element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>WAT Documentation</name>') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<name>WAT Documentation</name>') < content.indexOf('</widget>'));
  });

  it('Should update orientation with value from manifest.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') > -1);
  });

  it('Should not update orientation if it is missing in manifest.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="default" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Orientation" value="default" />') < content.indexOf('</widget>'));
  });

  it('Should add orientation if XML element element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') < content.indexOf('</widget>'));
  });

  it('Should update fullscreen with value from manifest.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);
  });

  it('Should not update fullscreen if it is missing in manifest.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);
  });

  it('Should add fullscreen if XML element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') < content.indexOf('</widget>'));
  });

  it('Should remove wildcard access rule from config.xml', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="*" />') == -1);
  });

  it('Should keep wildcard access rule if scope and external rules not present', function (){
    var testDir = path.join(workingDirectory, 'noExternalRulesNorScope');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="*" />') > -1);
  });

  it('Should add launch-external attribute to existing access rule', function (){
    var testDir = path.join(workingDirectory, 'updateAccessRules');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
      opts : {
        projectRoot : testDir
      }
    };
    initializeContext(ctx);
    
    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access hap-rule="yes" launch-external="yes" origin="http://wat.codeplex.com" />') > -1);
    assert(content.indexOf('<access hap-rule="yes" origin="http://wat.codeplex.com" />') == -1);
  });
  
  it('Should remove launch-external attribute from existing access rule', function (){
    var testDir = path.join(workingDirectory, 'updateAccessRules');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
      opts : {
        projectRoot : testDir
      }
    };
    initializeContext(ctx);
    
    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access hap-rule="yes" origin="http://ajax.googleapis.com/*" />') > -1);
    assert(content.indexOf('<access hap-rule="yes" launch-external="yes" origin="http://ajax.googleapis.com/*" />') == -1);
  });

  it('Should keep existing access rule unchanged in config.xml', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="http://com.example.hello/home" />') > -1);
  });

  it('Should add internal access rule from hap_access list', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access hap-rule="yes" origin="http://ajax.googleapis.com/*" />') > -1);  
  });

  it('Should add internal access rule from scope property', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access hap-rule="yes" origin="http://wat-docs.azurewebsites.net/*" />') > -1);
  });

  it('Should add external access rule to android section', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };
    initializeContext(ctx);

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access hap-rule="yes" launch-external="yes" origin="http://wat.codeplex.com" />') > -1);
    assert(content.indexOf('<access hap-rule="yes" launch-external="yes" origin="http://wat.codeplex.com" />') > content.indexOf('<platform name="android">'));
    assert(content.indexOf('<access hap-rule="yes" launch-external="yes" origin="http://wat.codeplex.com" />') < content.indexOf('</platform>'));
  });
  
  afterEach(function () {
    tu.deleteRecursiveSync(workingDirectory);
  });
});
