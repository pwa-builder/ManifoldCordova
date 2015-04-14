#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    downloader = require('./downloader'),
    createConfigParser = require('./createConfigParser'),
    pendingTasks = [],
    Q,
    projectRoot,
    config,
    etree;

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

function ensurePathExists(pathName, callback) {
  fs.mkdir(pathName, function (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        return ensurePathExists(path.dirname(pathName), function (err) {
          if (err && callback) {
            return callback && callback(err);
          }
          
          fs.mkdir(pathName, function (err) {
            if (err && err.code === 'EEXIST') { err = undefined; }
            callback && callback(err);
          });
        });
      } else if (err.code === 'EEXIST') {
        err = undefined;
      }
    }

    callback && callback(err);
  });
};

// normalize icon list and download to res folder
function getManifestIcons(manifest) {
    var iconList = [];
    if (manifest.icons && manifest.icons instanceof Array) {
        manifest.icons.forEach(function (icon) {
            var imageUrl = url.resolve(manifest.start_url, icon.src);
            icon.src = url.parse(imageUrl).pathname;
            var sizes = icon.sizes.toLowerCase().split(' ');
            sizes.forEach(function (iconSize) {
                var dimensions = iconSize.split('x');
                var element = { "src": icon.src, "width": dimensions[0], "height": dimensions[1], "density": icon.density };
                iconList.push(element);
            });

            var deferral = new Q.defer();
            pendingTasks.push(deferral.promise);
            var iconsPath = path.dirname(path.join(projectRoot, icon.src));
            ensurePathExists(iconsPath, function(err) {
              if (err && err.code !== 'EEXIST') {
                return logger.error("ERROR: Failed to create directory at: " + iconsPath + ' - ' + err.message);
              }

              downloader.downloadImage(imageUrl, iconsPath, function (err, data) {
                  if (err) {
                      var localPath = path.join(iconsPath, path.basename(icon.src));
                      if (!fs.existsSync(localPath)) {
                        logger.warn('WARNING: Failed to download icon file: ' + imageUrl + ' (' + err.message + ')');
                      }
                  } else {
                    if (data && data.statusCode !== 304) {
                      logger.log('Downloaded icon file: ' + data.path);
                    }
                  }

                  deferral.resolve(data);
              });
            }); 
        });
    }

    return iconList;
}

// Configure Cordova configuration parser
function configureParser(context) {
    var cordova_util = context.requireCordovaModule('cordova-lib/src/cordova/util'),
        ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
    etree = context.requireCordovaModule('cordova-lib/node_modules/elementtree');

    var xml = cordova_util.projectConfig(projectRoot);
    config = createConfigParser(xml, etree, ConfigParser);
}

function processAccessRules(manifestRules, scope) {
    // build the list of access rules
    var externalRules = false;
    var accessList = [];
    if (manifestRules && manifestRules instanceof Array) {
        manifestRules.forEach(function (rule) {
            var element = { "url": rule.url, "external": rule.external === true ? true : false };
            accessList.push(element);

            if (rule.external) {
              externalRules = true;
            }
        });
    }

    // add the scope rule to the access rules list (as an internal rule)
    if (scope) {
        var element = { "url": scope, "external": false };
        accessList.push(element);
    }

    // If there is a scope rule or there are external rules, remove the wildcard ('*') access rules
    if (scope || externalRules) {
        config.removeElements('.//access[@origin=\'*\']');
    }

    // Remove previous access rules
    config.removeElements('.//access[@hap-rule=\'yes\']');

    // get the android platform section and create it if it does not exist
    var androidRoot = config.doc.find('platform[@name=\'android\']');
    if (!androidRoot) {
        androidRoot = etree.SubElement(config.doc.getroot(), 'platform');
        androidRoot.set('name', 'android');
    }

    // add new access rules
    accessList.forEach(function (item) {
        if (item.external) {
            // add external rule to the android platform section
            var el = new etree.SubElement(androidRoot, 'access');
            el.set('hap-rule','yes');
            el.set('launch-external','yes');
            el.set('origin', item.url);
        }
        else {
            // add internal rule to the document's root level
            var el = new etree.SubElement(config.doc.getroot(), 'access');
            el.set('hap-rule','yes');
            el.set('origin', item.url);
        }
    });
}

function processIconsBySize(platform, manifestIcons, splashScreenSizes, iconSizes) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestIcons.forEach(function (element) {
        var size = element.width + "x" + element.height;
        if (splashScreenSizes.indexOf(size) >= 0) {
            for (var screen, i = 0; i < platformScreens.length; i++) {
                if (element.width === platformScreens[i].get('width') && element.height === platformScreens[i].get('height')) {
                    screen = platformScreens[i];
                    break;
                }
            }

            if (!screen) {
                screen = etree.SubElement(root, 'splash');
                screen.set('width', element.width);
                screen.set('height', element.height);
            }

            screen.set('src', element.src);
        }
        else if (iconSizes.indexOf(size) >= 0) {
            for (var icon, i = 0; i < platformIcons.length; i++) {
                if (element.width === platformIcons[i].get('width') && element.height === platformIcons[i].get('height')) {
                    icon = platformIcons[i];
                    break;
                }
            }

            if (!icon) {
                icon = etree.SubElement(root, 'icon');
                icon.set('width', element.width);
                icon.set('height', element.height);
            }

            icon.set('src', element.src);
        }
    });
}

function processIconsByDensity(platform, manifestIcons, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestIcons.forEach(function (element) {
        var size = element.width + "x" + element.height;
        var density = dppxToDensityMap[element.density];
        var isScreen = screenSizeToDensityMap[size];
        if (density && isScreen) {
            density = ((element.width > element.height) ? "land-" : "port-") + density;
        }

        var isIcon = iconSizeToDensityMap[element.width];
        var screenDensity = density || isScreen;
        var iconDensity = density || isIcon;
        if (screenDensity && isScreen) {
            for (var screen, i = 0; i < platformScreens.length; i++) {
                if (screenDensity === platformScreens[i].get('density')) {
                    screen = platformScreens[i];
                    break;
                }
            }

            if (!screen) {
                screen = etree.SubElement(root, 'splash');
                screen.set('density', screenDensity);
            }

            screen.set('src', element.src);
        }
        else if (iconDensity && isIcon) {
            for (var icon, i = 0; i < platformIcons.length; i++) {
                if (iconDensity === platformIcons[i].get('density')) {
                    icon = platformIcons[i];
                    break;
                }
            }

            if (!icon) {
                icon = etree.SubElement(root, 'icon');
                icon.set('density', iconDensity);
            }

            icon.set('src', element.src);
        }
    });
}

function processiOSIcons(manifestIcons) {
    var iconSizes = [
        "40x40",
        "80x80",
        "50x50",
        "100x100",
        "57x57",
        "114x114",
        "60x60",
        "120x120",
        "180x180",
        "72x72",
        "144x144",
        "76x76",
        "152x152",
        "29x29",
        "58x58"
    ];

    var splashScreenSizes = [
        "1024x768",
        "2048x1536",
        "768x1024",
        "1536x2048",
        "640x1136",
        "2208x1242",
        "320x480",
        "640x960",
        "750x1334",
        "1242x2208"
    ];

    processIconsBySize('ios', manifestIcons, splashScreenSizes, iconSizes);
}

function processAndroidIcons(manifestIcons, outputConfiguration, previousIndent) {
    var iconSizeToDensityMap = {
        36: 'ldpi',
        48: 'mdpi',
        72: 'hdpi',
        96: 'xhdpi',
        144: 'xxhdpi',
        192: 'xxxhdpi'
    };

    var dppxToDensityMap = {
        0.75:   'ldpi',
        1:      'mdpi',
        1.5:    'hdpi',
        2:      'xhdpi',
        3:      'xxhdpi',
        4:      'xxxhdpi'
    };

    var screenSizeToDensityMap = {
        "800x480": "land-hdpi",
        "320x200": "land-ldpi",
        "480x320": "land-mdpi",
        "1280x720":"land-xhdpi",
        "480x800": "port-hdpi",
        "200x320": "port-ldpi",
        "320x480": "port-mdpi",
        "720x1280":"port-xhdpi"
    };

    processIconsByDensity('android', manifestIcons, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap);
}

function processWindowsIcons(manifestIcons) {
    var iconSizes = [
        "30x30",
        "106x106",
        "70x70",
        "170x170",
        "57x57",
        "150x150",
        "360x360",
        "310x310",
        "50x50",
        "120x120",
        "310x150",
        "744x360"
    ];

    var splashScreenSizes = [
        "620x300",
        "1152x1920"
    ];

    processIconsBySize('windows', manifestIcons, splashScreenSizes, iconSizes);
};

function processWindowsPhoneIcons(manifestIcons) {
    var iconSizes = [
        "62x62",
        "173x173"
    ];

    var splashScreenSizes = [
        "480x800"
    ];

    processIconsBySize('wp8', manifestIcons, splashScreenSizes, iconSizes);
};

module.exports = function (context) {
    logger.log('Updating Cordova configuration from W3C manifest...');

    Q = context.requireCordovaModule('q');

    // create a parser for the Cordova configuration
    projectRoot = context.opts.projectRoot;
    configureParser(context);

    // read W3C manifest
    var task = Q.defer();
    pendingTasks.push(task.promise);
    var manifestPath = path.join(projectRoot, 'manifest.json');
    fs.readFile(manifestPath, function (err, data) {
      if (err) {
        logger.error('ERROR: Failed to read manifest in at \'' + manifestPath + '\'.');
        return task.reject(err);
      }

      var manifestJson = data.toString().replace(/^\uFEFF/, '');
      var appManifestPath = path.join(projectRoot, 'www', 'manifest.json');
      fs.writeFile(appManifestPath, manifestJson, function (err) {
        if (err) {
          logger.error('ERROR: Failed to copy manifest to \'www\' folder.');
          return task.reject(err);
        }

        var manifest = JSON.parse(manifestJson);

        // update name, start_url, orientation, and fullscreen from manifest
        if (manifest.name) {
          config.setName(manifest.name);
        }

        config.setAttribute('content', 'src', manifest.start_url);
        config.setPreference('Orientation', manifest.orientation);
        if (manifest.display) {
          config.setPreference('Fullscreen', manifest.display == 'fullscreen' ? 'true' : 'false');
        }

        // configure access rules
        processAccessRules(manifest.hap_urlAccess, manifest.scope);

        // configure manifest icons
        var manifestIcons = getManifestIcons(manifest);
        processiOSIcons(manifestIcons);
        processAndroidIcons(manifestIcons);
        processWindowsIcons(manifestIcons);
        processWindowsPhoneIcons(manifestIcons);

        // save the updated configuration
        config.write();
        task.resolve();
      });
    });

    return Q.all(pendingTasks);
}
