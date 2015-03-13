'use strict';

var path = require('path');
var fs = require('fs');

var copyRecursiveSync = function (src, dest) {
  if (!fs.existsSync(src)) { return; }
  if (fs.lstatSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) { fs.mkdirSync(dest); }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
};

var deleteRecursiveSync = function(src) {
  if (!fs.existsSync(src)) { return; }
  if (fs.lstatSync(src).isDirectory()) {
    fs.readdirSync(src).forEach(function(childItemName) {
      deleteRecursiveSync(path.join(src, childItemName))
    });
    fs.rmdirSync(src);
  } else {
    fs.unlinkSync(src);
  }
};

module.exports = {
  copyRecursiveSync : copyRecursiveSync,
  deleteRecursiveSync : deleteRecursiveSync
}
