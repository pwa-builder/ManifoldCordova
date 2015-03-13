'use strict';
process.env.NODE_ENV = 'test';

var updateConfiguration = require('../updateConfiguration');
var tu = require('./test-utils');

var assert = require('assert');

var path = require('path');
var fs = require('fs');

var assetsDirectory = path.join(__dirname, 'assets');
var workingDirectory = path.join(__dirname, 'tmp');

describe('updateConfiguration.js', function (){
  beforeEach(function () {
    tu.copyRecursiveSync(assetsDirectory, workingDirectory);
  });

  it('Should update config.xml name with value from config.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>WAT Documentation</name>') > -1);
  });

  it('Should not update config.xml name if it is missing in config.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>HelloWorld</name>') > -1);
  });

  it('Should update config.xml name if XML element is upper case', function (){
    var testDir = path.join(workingDirectory, 'xmlCasing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<NAME>WAT Documentation</NAME>') > -1);
  });

  it('Should add config.xml name if XML element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<name>WAT Documentation</name>') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<name>WAT Documentation</name>') < content.indexOf('</widget>'));
  });

  it('Should update config.xml orientation with value from config.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') > -1);
  });

  it('Should not update config.xml orientation if it is missing in config.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="default" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Orientation" value="default" />') < content.indexOf('</widget>'));
  });

  it('Should update config.xml orientation if XML element is upper case', function (){
    var testDir = path.join(workingDirectory, 'xmlCasing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<PREFERENCE NAME="Orientation" value="landscape" />') > -1);
  });

  it('Should add config.xml orientation if XML element element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Orientation" value="landscape" />') < content.indexOf('</widget>'));
  });

  it('Should update config.xml fullscreen with value from config.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);
  });

  it('Should not update config.xml fullscreen if it is missing in config.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > -1);
  });

  it('Should update config.xml fullscreen if XML element is upper case', function (){
    var testDir = path.join(workingDirectory, 'xmlCasing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<PREFERENCE NAME="Fullscreen" value="true" />') > -1);
  });

  it('Should add config.xml fullscreen if XML element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<preference name="Fullscreen" value="true" />') < content.indexOf('</widget>'));
  });

  it('Should update config.xml access with value from config.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="*" />') > -1);
  });

  it('Should comment out extra access XML element if scope is defined', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<!--<access origin="http://com.example.hello/services" />-->') > -1);
  });

  it('Should not update config.xml access if it is missing in config.json', function (){
    var testDir = path.join(workingDirectory, 'jsonEmpty');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="http://com.example.hello/home" />') > -1);
  });

  it('Should update config.xml access if XML element is upper case', function (){
    var testDir = path.join(workingDirectory, 'xmlCasing');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<ACCESS origin="*" />') > -1);
  });

  it('Should add config.xml access if XML element is missing', function (){
    var testDir = path.join(workingDirectory, 'xmlEmptyWidget');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="*" />') > content.indexOf('<widget id="com.example.hello" version="0.0.1">'));
    assert(content.indexOf('<access origin="*" />') < content.indexOf('</widget>'));
  });

  it('Should add config.xml access external with value from config.json', function (){
    var testDir = path.join(workingDirectory, 'normalFlow');
    var configXML = path.join(testDir, 'config.xml');
    var ctx = {
                opts : {
                  projectRoot : testDir
                }
              };

    updateConfiguration(ctx);

    var content = fs.readFileSync(configXML).toString();
    assert(content.indexOf('<access origin="http://www.google.com/*" launch-external="yes" />') > -1);
    assert(content.indexOf('<access origin="http://www.facebook.com/*" launch-external="yes" />') > -1);
  });


  afterEach(function () {
    tu.deleteRecursiveSync(workingDirectory);
  });
});
