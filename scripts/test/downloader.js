'use strict';
process.env.NODE_ENV = 'test';

var path = require('path');
var fs = require('fs');

var http = require('http');
var https = require('https');

var url = require('url');

var assert = require('assert');

var downloader = require('../downloader');

var tu = require('./test-utils');

var assetsDirectory = path.join(__dirname, 'assets');
var tmpDirectory = path.join(__dirname, 'tmp');

var responseFunction;

var server = http.createServer(function (req, res) {
  if (responseFunction) {
    responseFunction(req, res);
  } else {
    var fileName = url.parse(req.url).pathname.split('/').pop();
    var filePath = path.join(assetsDirectory, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end();
    }

    res.writeHead(200, { 'content-type':'image/png' });
    fs.createReadStream(filePath)
      .pipe(res);
  }
});

describe('downloader module', function () {
  describe('downloadImage()', function () {
    before(function () {
      server.listen(8042);
    });

    beforeEach(function () {
      if (!fs.existsSync(tmpDirectory)) {
        fs.mkdirSync(tmpDirectory);
      }
    });

    it('Should return an Error if download path is invalid', function (done) {
      downloader.downloadImage('http://localhost:8042/logo.png', undefined, function(err, data) {
        assert(err);
        done();
      });
    });

    it('Should return an Error if server returns invalid status code', function (done) {
      responseFunction = function(req, res) {
        res.writeHead(404);
        res.end();
      };

      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(err);
        done();
      });
    });

    it('Should return an Error if content type is not an image', function (done) {
      responseFunction = function(req, res) {
        res.writeHead(200, {'content-type':'text/html'});
        res.end();
      };

      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(err);
        done();
      });
    });

    it('Should take image name from url', function (done) {
      var expectedFileName = 'logo.png';

      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(data.path);
        assert(data.path === path.join(tmpDirectory, expectedFileName));
        done();
      });
    });

    it('Should save image in download directory', function (done) {
      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(fs.existsSync(data.path));
        done();
      });
    });

    it('Should replace image in download directory', function (done) {
      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
          assert(fs.existsSync(data.path));
          done();
        });
      });
    });

    it('Should download an image if a redirect response is received', function (done) {
      responseFunction = function(req, res) {
        if (req.url.indexOf('redirect') > -1) {
          res.writeHead(302, {'location': 'http://localhost:8042/logo.png'});
          res.end();
        } else {
          var fileName = url.parse(req.url).pathname.split('/').pop();
          var filePath = path.join(assetsDirectory, fileName);

          if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end();
          }

          res.writeHead(200, {'content-type':'image/png'});
          fs.createReadStream(filePath)
            .pipe(res);
        }
      };

      var expectedFileName = 'logo.png';

      downloader.downloadImage('http://localhost:8042/redirect', tmpDirectory, function(err, data) {
        assert(data.path);
        assert(data.path === path.join(tmpDirectory, expectedFileName));
        assert(fs.existsSync(data.path));
        done();
      });
    });

    it('Should not download an image if a Not Modified response is received', function (done) {
      downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        responseFunction = function(req, res) {
          res.writeHead(304);
          res.end();
        };

        var expectedLastModified = new Date(fs.lstatSync(data.path).mtime);
        assert(data.path);

        downloader.downloadImage('http://localhost:8042/logo.png', tmpDirectory, function(err, data) {
          var actualLastModified = new Date(fs.lstatSync(data.path).mtime);
          assert(data.path);
          assert(fs.existsSync(data.path));
          assert(expectedLastModified.toUTCString() === actualLastModified.toUTCString());
          done();
        });
      });
    });

    it('Should download an image if protocol is https', function (done) {
      // set timeout to 20 seconds as we are downloading a file from internet.
      this.timeout(20 * 1000);
      
      var fileName = 'Wiki.png';
      var filePath = path.join(assetsDirectory, fileName);

      downloader.downloadImage('https://upload.wikimedia.org/wikipedia/en/b/bc/Wiki.png', tmpDirectory, function(err, data) {
        assert(fs.existsSync(data.path));
        done();
      });
    });

    it('Should return an Error if invalid protocol is provided', function (done) {
      downloader.downloadImage('ftp://localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(err);
        done();
      });
    });

    it('Should use http as protocol by default', function (done) {
      downloader.downloadImage('localhost:8042/logo.png', tmpDirectory, function(err, data) {
        assert(fs.existsSync(data.path));
        done();
      });
    });

    afterEach(function () {
      responseFunction = undefined;
      tu.deleteRecursiveSync(tmpDirectory);
    });

    after(function () {
      server.close();
    });
  });
});
