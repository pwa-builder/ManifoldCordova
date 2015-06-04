#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    pendingTasks = [],
    Q;

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

module.exports = function (context) {
  Q = context.requireCordovaModule('q');
  var task = Q.defer();

  var destPath = path.resolve("platforms\\windows\\www\\wrapper.html");
  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  destPath = path.resolve("platforms\\windows\\www\\js\\wrapper.js");

  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  destPath = path.resolve("platforms\\windows\\www\\css\\wrapper.css");

  if (fs.existsSync(destPath)) {
    deleteFile(destPath);
  }

  Q.allSettled(pendingTasks).then(function (e) {
    console.log("Finished removing assets for the windows platform.");
    task.resolve();
  });

  return task.promise;
};
