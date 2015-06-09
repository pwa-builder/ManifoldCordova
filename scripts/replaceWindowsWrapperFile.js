#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
  	projectRoot;

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

function copyFile(source, target, callback) {
  var cbCalled = false;

  function done(err) {
    if (!cbCalled) {
      callback(err);
      cbCalled = true;
    }
  }

  var rd = fs.createReadStream(source);
  rd.on('error', done);

  var wr = fs.createWriteStream(target);
  wr.on('error', done);
  wr.on('close', function() {
    done();
  });
  rd.pipe(wr);
};

module.exports = function (context) {
  // move contents of the assets folder to the windows platform dir
  var Q = context.requireCordovaModule('q');

  // create a parser for the Cordova configuration
  projectRoot = context.opts.projectRoot;
  var filename = "wrapper";

  var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.html");
  var destPath = path.join(projectRoot, "platforms","windows", "www", filename + ".html");

  logger.log('Copying wrapper html file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

  var task = Q.defer();
  copyFile(sourcePath, destPath, function (err) {
    if (err) {
      console.error(err);
      return task.reject();
    }

    console.log("Finished copying wrapper html file for the windows platform.");

    var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.js");
    var destPath = path.join(projectRoot, "platforms", "windows", "www", "js", filename +".js");

    logger.log('Copying wrapper js file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

    copyFile(sourcePath, destPath, function (err) {
      if (err) {
        console.error(err);
        return task.reject();
      }

      console.log("Finished copying wrapper js file for the windows platform.");

      var sourcePath = path.resolve(__dirname, "..", "assets", "windows", "wrapper.css");
      var destPath = path.join(projectRoot, "platforms", "windows", "www", "css", filename + ".css");

      logger.log('Copying wrapper css file for the windows platform from '+ sourcePath + ' to ' + destPath + '.');

      copyFile(sourcePath, destPath, function (err) {
        if (err) {
          console.error(err);
          return task.reject();
        }

        console.log("Finished copying wrapper css file for the windows platform.");

        task.resolve();
      });
    });
  });

  return task.promise;
};
