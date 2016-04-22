#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    downloader = require('./downloader'),
    createConfigParser = require('./createConfigParser'),
    pendingTasks = [],
    Q,
    defaultIconsBaseDir,
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
  },
  error: function() {
    if (process.env.NODE_ENV !== 'test') {
      console.error.apply(this, arguments)
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

function downloadImage(imageUrl, imagesPath, imageSrc) {
  var deferral = new Q.defer();
  pendingTasks.push(deferral.promise);
  
  ensurePathExists(imagesPath, function(err) {
    if (err && err.code !== 'EEXIST') {
      return logger.error("ERROR: Failed to create directory at: " + imagesPath + ' - ' + err.message);
    }

    downloader.downloadImage(imageUrl, imagesPath, function (err, data) {
        if (err) {
            var localPath = path.join(imagesPath, path.basename(imageSrc));
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
}

// normalize image list and download images to project folder
function processImageList(images, baseUrl) {
  var imageList = [];
  if (images && images instanceof Array) {
    images.forEach(function (image) {
      var imageUrl = url.resolve(baseUrl, image.src);
      image.src = url.parse(imageUrl).pathname;
      var sizes = image.sizes.toLowerCase().split(' ');
      sizes.forEach(function (imageSize) {
        var dimensions = imageSize.split('x');
        var element = {
          "src": image.src,
          "width": dimensions[0],
          "height": dimensions[1],
          "density": image.density,
          "type": image.type
        };

        imageList.push(element);
      });

      var imagePath = path.dirname(path.join(projectRoot, image.src));
            
      downloadImage(imageUrl, imagePath, image.src);
    });
  }

  return imageList;
}

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
}

function processAccessRules(manifest) {
    if (manifest && manifest.start_url) {
  
        // Remove previous rules added by the hook
        config.removeElements('.//allow-intent[@hap-rule=\'yes\']');
        config.removeElements('.//allow-navigation[@hap-rule=\'yes\']');
        config.removeElements('.//access[@hap-rule=\'yes\']');
    
        // Remove "generic" rules to open external URLs outside the app
        config.removeElements('.//allow-intent[@href=\'http://*/*\']');
        config.removeElements('.//allow-intent[@href=\'https://*/*\']');
        config.removeElements('.//allow-intent[@href=\'*\']');
        
        // determine base rule based on the start_url and the scope
        var baseUrlPattern = manifest.start_url;
        if (manifest.scope && manifest.scope.length) {
            var parsedScopeUrl = url.parse(manifest.scope);
            if (parsedScopeUrl.protocol) {
              baseUrlPattern = manifest.scope;
            } else {
              baseUrlPattern = url.resolve(baseUrlPattern, manifest.scope);
            }
        }
        
        // If there are no wildcards in the pattern, add '*' at the end
        if (baseUrlPattern.indexOf('*') === -1) {
            baseUrlPattern = url.resolve(baseUrlPattern, '*');
        }
               
        // add base rule as a navigation rule
        var navigationBaseRule = new etree.SubElement(config.doc.getroot(), 'allow-navigation');
        navigationBaseRule.set('hap-rule','yes');
        navigationBaseRule.set('href', baseUrlPattern);
        
        var baseUrl = baseUrlPattern.substring(0, baseUrlPattern.length - 1);;
    
        // add additional navigation rules from mjs_access_whitelist
        // TODO: mjs_access_whitelist is deprecated. Should be removed in future versions
        if (manifest.mjs_access_whitelist && manifest.mjs_access_whitelist instanceof Array) {
            manifest.mjs_access_whitelist.forEach(function (item) {
                // To avoid duplicates, add the rule only if it does not have the base URL as a prefix
                if (item.url.indexOf(baseUrl) !== 0 ) {  
                    // add as a navigation rule
                    var navigationEl = new etree.SubElement(config.doc.getroot(), 'allow-navigation');
                    navigationEl.set('hap-rule','yes');
                    navigationEl.set('href', item.url);  
                }
            });
        }
        
        // add additional navigation rules from mjs_extended_scope
        if (manifest.mjs_extended_scope && manifest.mjs_extended_scope instanceof Array) {
            manifest.mjs_extended_scope.forEach(function (item) {
                // To avoid duplicates, add the rule only if it does not have the base URL as a prefix
                if (item.indexOf(baseUrl) !== 0 ) {  
                    // add as a navigation rule
                    var navigationEl = new etree.SubElement(config.doc.getroot(), 'allow-navigation');
                    navigationEl.set('hap-rule','yes');
                    navigationEl.set('href', item);  
                }
            });
        }
    }
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

function processImagesBySize(platform, manifestImages, splashScreenSizes, iconSizes, validFormats) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestImages.forEach(function (element) {
        if (!isValidFormat(element, validFormats)) {
          return;
        }
        
        // Don't process the icon if the icon file does not exist
        if (!fs.existsSync(path.join(projectRoot, element.src))) {
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

function processImagesByDensity(platform, manifestImages, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap, validFormats) {
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }

    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    manifestImages.forEach(function (element) {
        if (!isValidFormat(element, validFormats)) {
            return;
        }
        
        // Don't process the icon if the icon file does not exist
        if (!fs.existsSync(path.join(projectRoot, element.src))) {
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

function processDefaultIconsByDensity(platform, screenDensities, iconDensities) {   
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }
    
    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    
    iconDensities.forEach(function (iconDensity) {
        for (var icon, i = 0; i < platformIcons.length; i++) {
            if (iconDensity === platformIcons[i].get('density')) {
                icon = platformIcons[i];
                break;
            }
        }
               
        if (!icon) {
            var iconSrc = defaultIconsBaseDir + '/' + platform + '/' + iconDensity + '.png';
            
            icon = etree.SubElement(root, 'icon');
            icon.set('hap-default-image', 'yes');
            icon.set('density', iconDensity);
            icon.set('src', iconSrc);
        }
    });
    
    screenDensities.forEach(function (screenDensity) {
        for (var screen, i = 0; i < platformScreens.length; i++) {
            if (screenDensity === platformScreens[i].get('density')) {
                screen = platformScreens[i];
                break;
            }
        }
        
        if (!screen) {
            var screenSrc = defaultIconsBaseDir + '/' + platform + '/' + screenDensity + '.png';
          
            screen = etree.SubElement(root, 'splash');
            screen.set('hap-default-image', 'yes');
            screen.set('density', screenDensity);
            screen.set('src', screenSrc); 
        }
    });
}

function processDefaultIconsBySize(platform, screenSizes, iconSizes) {   
    // get platform section and create it if it does not exist
    var root = config.doc.find('platform[@name=\'' + platform + '\']');
    if (!root) {
        root = etree.SubElement(config.doc.getroot(), 'platform');
        root.set('name', platform);
    }
    
    var platformIcons = root.findall('icon');
    var platformScreens = root.findall('splash');
    
    iconSizes.forEach(function (iconSize) {
        var dimensions = iconSize.split('x');
        var iconWidth = dimensions[0];
        var iconHeight = dimensions[1];
      
        for (var icon, i = 0; i < platformIcons.length; i++) {
            if (iconWidth === platformIcons[i].get('width') && iconHeight === platformIcons[i].get('height')) {
                icon = platformIcons[i];
                break;
            }
        }
               
        if (!icon) {
            var iconSrc = defaultIconsBaseDir + '/' + platform + '/' + iconSize + '.png';
            
            icon = etree.SubElement(root, 'icon');
            icon.set('hap-default-image', 'yes');            
            icon.set('width', iconWidth);
            icon.set('height', iconHeight);
            icon.set('src', iconSrc);
        }
    });
    
    screenSizes.forEach(function (screenSize) {
        var dimensions = screenSize.split('x');
        var screenWidth = dimensions[0];
        var screenHeight = dimensions[1];
      
        for (var screen, i = 0; i < platformScreens.length; i++) {
            if (screenWidth === platformScreens[i].get('width') && screenHeight === platformScreens[i].get('height')) {
                screen = platformScreens[i];
                break;
            }
        }
        
        if (!screen) {
            var screenSrc = defaultIconsBaseDir + '/' + platform + '/' + screenSize + '.png';
          
            screen = etree.SubElement(root, 'splash');
            screen.set('hap-default-image', 'yes');
            screen.set('width', screenWidth);
            screen.set('height', screenHeight);
            screen.set('src', screenSrc); 
        }
    });
}

function processiOSIcons(manifestIcons, manifestSplashScreens) {
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

    processImagesBySize('ios', manifestIcons, splashScreenSizes, iconSizes);
    processImagesBySize('ios', manifestSplashScreens, splashScreenSizes, []);
    processDefaultIconsBySize('ios', splashScreenSizes, iconSizes);
}

function processAndroidIcons(manifestIcons, manifestSplashScreens) {
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
    
    var iconDensities = [];
    for (var size in iconSizeToDensityMap) {
        if (iconSizeToDensityMap.hasOwnProperty(size)) {
          iconDensities.push(iconSizeToDensityMap[size]);
        }
    }

    var screenDensities = [];
    for (var size in screenSizeToDensityMap) {
        if (screenSizeToDensityMap.hasOwnProperty(size)) {
          screenDensities.push(screenSizeToDensityMap[size]);
        }
    }

    var validFormats = [
      'png',
      'image/png'
    ];
    
    processImagesByDensity('android', manifestIcons, screenSizeToDensityMap, iconSizeToDensityMap, dppxToDensityMap, validFormats);   
    processImagesByDensity('android', manifestSplashScreens, screenSizeToDensityMap, [], dppxToDensityMap, validFormats);   
    processDefaultIconsByDensity('android', screenDensities, iconDensities);
}

function processWindowsIcons(manifestIcons, manifestSplashScreens) {
    var iconSizes = [
        "30x30",
        "44x44",
        "106x106",
        "70x70",
        "71x71",
        "170x170",
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

    processImagesBySize('windows', manifestIcons, splashScreenSizes, iconSizes);
    processImagesBySize('windows', manifestSplashScreens, splashScreenSizes, []);
    processDefaultIconsBySize('windows', splashScreenSizes, iconSizes);
};

function processWindowsPhoneIcons(manifestIcons, manifestSplashScreens) {
    var iconSizes = [
        "62x62",
        "173x173"
    ];

    var splashScreenSizes = [
        "480x800"
    ];

    processImagesBySize('wp8', manifestIcons, splashScreenSizes, iconSizes);
    processImagesBySize('wp8', manifestSplashScreens, splashScreenSizes, []);
    processDefaultIconsBySize('wp8', splashScreenSizes, iconSizes);
};

module.exports = function (context) {
    logger.log('Updating Cordova configuration from W3C manifest...');

    Q = context.requireCordovaModule('q');

    // Get base path for default icons
    defaultIconsBaseDir = 'plugins/' + context.opts.plugin.id + '/assets/defaultImages';

    // create a parser for the Cordova configuration
    projectRoot = context.opts.projectRoot;
    configureParser(context);

    // read W3C manifest
    var task = Q.defer();
    
    var manifestPath = path.join(projectRoot, 'manifest.json');
    fs.readFile(manifestPath, function (err, data) {
      if (err) {
        logger.warn('Failed to read manifest at \'' + manifestPath + '\'. Proceeding to point config.xml to sample url of https://www.npmjs.com/package/cordova-plugin-hostedwebapp.');
        data = JSON.stringify({ 'start_url': 'https://www.npmjs.com/package/cordova-plugin-hostedwebapp', 'short_name' : 'PlaceholderSite'});
      }

      var manifestJson = data.toString().replace(/^\uFEFF/, '');

      var appManifestPath = path.join(projectRoot, 'www', 'manifest.json');
      fs.writeFile(appManifestPath, manifestJson, function (err) {
        if (err) {
          logger.error('Failed to copy manifest to \'www\' folder.');
          return task.reject(err);
        }

        var manifest = JSON.parse(manifestJson);

        // The start_url member is required and must be a full URL.
        // Even though a relative URL is a valid according to the W3C spec, a full URL 
        // is needed because the plugin cannot determine the manifest's origin.
        var start_url;
        if (manifest.start_url) {
          start_url = url.parse(manifest.start_url);
        }

        if (!(start_url && start_url.hostname && start_url.protocol)) { 
          logger.error('Invalid or incomplete W3C manifest.');
          var err = new Error('The start_url member in the manifest is required and must be a full URL.');
          return task.reject(err);
        }

        // update name, start_url, orientation, and fullscreen from manifest
        if (manifest.short_name) {
          config.setName(manifest.short_name.replace(/\//g,'').replace(/\s/g,''));
        } else if (manifest.name) {
          config.setName(manifest.name.replace(/\//g,'').replace(/\s/g,''));
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

        // Obtain and download the icons and splash screens specified in the manifest.
        // Currently, splash screens specified in the splash_screens section of the manifest 
        // take precedence over similarly sized splash screens in the icons section.
        var manifestIcons = processImageList(manifest.icons, manifest.start_url);
        var manifestSplashScreens = processImageList(manifest.splash_screens, manifest.start_url);

        Q.allSettled(pendingTasks).then(function () {
            
          // Configure the icons once all icon files are downloaded
          processiOSIcons(manifestIcons, manifestSplashScreens);
          processAndroidIcons(manifestIcons, manifestSplashScreens);
          processWindowsIcons(manifestIcons, manifestSplashScreens);
          processWindowsPhoneIcons(manifestIcons, manifestSplashScreens);
          
          // save the updated configuration
          config.write();
          
          task.resolve();
        });
      });
    });

    return task.promise;
}
