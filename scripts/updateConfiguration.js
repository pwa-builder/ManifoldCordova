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
      console.log.apply(this, arguments);
    }
  },
  warn: function() {
    if (process.env.NODE_ENV !== 'test') {
      console.warn.apply(this, arguments);
    }
  },
  error: function() {
    if (process.env.NODE_ENV !== 'test') {
      console.error.apply(this, arguments);
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
                var element = {
                  "src": icon.src,
                  "width": dimensions[0],
                  "height": dimensions[1],
                  "density": icon.density,
                  "type": icon.type
                };

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

function processAccessRules(manifest) {
    // build the list of access rules
    var accessList = [];
    var manifestRules = manifest.mjs_access_whitelist;
    var scope = manifest.scope;
    var startUrl = manifest.start_url;
    if (manifestRules && manifestRules instanceof Array) {
        manifestRules.forEach(function (rule) {
            var element = { "url": rule.url, "external": rule.external === true ? true : false };
            accessList.push(element);
        });
    }

    // add the scope rule to the access rules list (as an internal rule)
    if (scope) {
        var element = { "url": scope, "external": false };
        accessList.push(element);
    }

    // Remove previous rules
    config.removeElements('.//allow-intent[@hap-rule=\'yes\']');
    config.removeElements('.//allow-navigation[@hap-rule=\'yes\']');
    config.removeElements('.//access[@hap-rule=\'yes\']');

    // Remove "full access"" rules
    config.removeElements('.//allow-intent[@href=\'http://*/*\']');
    config.removeElements('.//allow-intent[@href=\'https://*/*\']');
    config.removeElements('.//allow-intent[@href=\'*\']');
    config.removeElements('.//allow-navigation[@href=\'http://*/*\']');
    config.removeElements('.//allow-navigation[@href=\'https://*/*\']');
    config.removeElements('.//allow-navigation[@href=\'*\']');
    config.removeElements('.//access[@origin=\'http://*/*\']');
    config.removeElements('.//access[@origin=\'https://*/*\']');
    config.removeElements('.//access[@origin=\'*\']');

    // get the android platform section and create it if it does not exist
    var androidRoot = config.doc.find('platform[@name=\'android\']');
    if (!androidRoot) {
        androidRoot = etree.SubElement(config.doc.getroot(), 'platform');
        androidRoot.set('name', 'android');
    }

    // get the ios platform section and create it if it does not exist
    var iosRoot = config.doc.find('platform[@name=\'ios\']');
    if (!iosRoot) {
        iosRoot = etree.SubElement(config.doc.getroot(), 'platform');
        iosRoot.set('name', 'ios');
    }

    var el;

    // Add "full access" network request whitelist rule for android
    el = new etree.SubElement(androidRoot, 'access');
    el.set('origin', '*');
    el.set('hap-rule','yes');

    // Add rules to allow access to all routes belonging to the domain of the target site
    var hostUrl;
    if (startUrl) {
        var parsedStartUrl = url.parse(startUrl);
        hostUrl = startUrl.replace(parsedStartUrl.path, '/');
        var domainRule = hostUrl + '*';

        el = new etree.SubElement(config.doc.getroot(), 'allow-navigation');
        el.set('hap-rule','yes');
        el.set('href', domainRule);

        el = new etree.SubElement(iosRoot, 'access');
        el.set('hap-rule','yes');
        el.set('origin', domainRule);
    }

    // add new access rules
    accessList.forEach(function (item) {
        if (item.external) {
            // add intent whitelist rule
            var el = new etree.SubElement(config.doc.getroot(), 'allow-intent');
            el.set('hap-rule','yes');
            el.set('href', item.url);
        }
        else {
            if (hostUrl && item.url.indexOf(hostUrl) !== 0) {
                // add navigation whitelist rule
                el = new etree.SubElement(config.doc.getroot(), 'allow-navigation');
                el.set('hap-rule','yes');
                el.set('href', item.url);

                // add access rule for ios
                el = new etree.SubElement(iosRoot, 'access');
                el.set('origin', item.url);
                el.set('hap-rule','yes');
            }
        }
    });
}

function getFormatFromIcon(icon) {
  return icon.type || (icon.src && icon.src.split('.').pop());
}

function isValidFormat(icon, validFormats) {
  if (!validFormats || validFormats.length === 0) {
    return true;
  }

  var iconFormat = getFormatFromIcon(icon);

  for (var i = 0; i < validFormats.length; i++) {
    if (validFormats[i].toLowerCase() === iconFormat) {
      return true;
    }
  }

  return false;
}

function processIconsBySize(platform, manifestIcons, splashScreenSizes, iconSizes, validFormats) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestIcons.forEach(function (element) {
        if (!isValidFormat(element, validFormats)) {
          return;
        }

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

function processIconsByDensity(platform, manifestIcons, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap, validFormats) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestIcons.forEach(function (element) {
        if (!isValidFormat(element, validFormats)) {
            return;
        }

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

var validFormats = [
  'png',
  'image/png'
];

processIconsByDensity('android', manifestIcons, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap, validFormats);
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
        if (manifest.short_name) {
          config.setName(manifest.short_name.replace(/\//g,''));
        } else if (manifest.name) {
          config.setName(manifest.name.replace(/\//g,''));
        }

        config.setAttribute('content', 'src', manifest.start_url);
        config.setPreference('Orientation', (function(orientation){
          // map W3C manifest orientation options to Cordova orientation options
          switch (orientation){
            case "any":
            case "natural":
            return "default";

            case "landscape":
            case "landscape-primary":
            case "landscape-secondary":
            return "landscape";

            case "portrait":
            case "portrait-primary":
            case "portrait-secondary":
            return "portrait";
          }

        })(manifest.orientation));

        if (manifest.display) {
          config.setPreference('Fullscreen', manifest.display == 'fullscreen' ? 'true' : 'false');
        }

        // configure access rules
        processAccessRules(manifest);

        // configure manifest icons
        var manifestIcons = getManifestIcons(manifest);
        processiOSIcons(manifestIcons);
        processAndroidIcons(manifestIcons);
        processWindowsIcons(manifestIcons);
        processWindowsPhoneIcons(manifestIcons);

        // save the updated configuration
        config.write();

        Q.allSettled(pendingTasks).then(function () {
          task.resolve();
        });
      });
    });

    return task.promise;
}
