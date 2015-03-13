#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    rex = require('./rex'),
    url = require('url'),
    downloader = require('./downloader'),
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
  }
};

function ensurePathExists(path, cb) {
    try {
        fs.mkdirSync(path);
    }
    catch (err) {
        if (err.code != 'EEXIST') {
            throw "Error creating directory at: " + path;
        }
    }
}

// normalize icon list and download to res folder
function getManifestIcons(manifest) {
    var iconList = [];
    if (manifest.icons && manifest.icons instanceof Array) {
        var resPath = path.join(projectRoot, 'res');
        ensurePathExists(resPath);
        var iconsPath = path.join(resPath, 'icons');
        ensurePathExists(iconsPath);

        manifest.icons.forEach(function (icon) {
            var imageUrl = url.resolve(manifest.start_url, icon.src);
            icon.src = url.resolve('res/icons/', path.basename(icon.src));
            var sizes = icon.sizes.toLowerCase().split(' ');
            sizes.forEach(function (iconSize) {
                var dimensions = iconSize.split('x');
                var element = { "src": icon.src, "width": dimensions[0], "height": dimensions[1], "density": icon.density, "inUse": false };
                iconList.push(element);
            });
                
            var deferral = new Q.defer();
            pendingTasks.push(deferral.promise);
            downloader.downloadImage(imageUrl, iconsPath, function (err, data) {
                if (err) {
                    console.error('Error downloading icon file: ' + imageUrl + '\n' + err);
                    deferral.reject(err);
                    return;
                }
                    
                console.log('Downloaded icon file: ' + data.path);
                deferral.resolve(data);
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
    config = new ConfigParser(xml);

    // set the text for an element
    config.setElement = function (name, text) {
        if (text) {
            var el = this.doc.find(name);
            if (!el) {
                var root = this.doc.getroot();
                el = new etree.SubElement(root, name);
            }

            el.text = text;
        }
    };

    // TODO: replace this
    config.setAttribute = function (elname, attname, value) {
        if (value) {
            var el = this.doc.find(elname);
            if (!el) {
                var root = this.doc.getroot();
                el = new etree.SubElement(root, elname);
            }

            el.set(attname, value);
        }
    };

    // set the value of a "preference" element
    config.setPreference = function (name, value) {
        if (value) {
            var el = this.doc.find('preference[@name=\'' + name + '\']'); 
            if (!el) {
                var root = this.doc.getroot();
                el = new etree.SubElement(root, 'preference');
                el.set('name', name);
            }

            el.set('value', value);
        }
    };

    // get all elements with the specified name
    config.getElements = function (name) {
        return this.doc.findall(name);
    }
}

function processAccessRules(popoutRules, scope) {
    // build the list of popout rules    
    var popoutList = [];
    if (popoutRules && popoutRules instanceof Array) {
        popoutRules.forEach(function (url) {
            var element = { "url": url, "inUse": false };
            popoutList.push(element);
        });
    }

    // scan existing access rules and enable launch-external on any rule matching 
    // a popout URL in the manifest. Also, update the wildcard rule ('*') to match 
    // the manifest scope (if available)
    var setScope = true;
    var accessList = config.getElements('access');
    accessList.forEach(function (el) {
        var origin = el.get('origin');
        if (origin === '*' && scope) {
            el.set('origin', scope);
            if (el.get('launch-external') === 'yes') {
                el.set('launch-external', 'no');
            }

            setScope = false;
        }

        popoutList.forEach(function (item) {
            if (item.url === origin) {
                el.set('launch-external', 'yes');
                item.inUse = true;
            }
        });
    });

    // insert any rules in the manifest that were not already there 
    // and enable launch-external
    popoutList.forEach(function (item) {
        if (!item.inUse) {
            var el = new etree.SubElement(config.doc.getroot(), 'access');
            el.set('origin', item.url);
            el.set('launch-external', 'yes');
        }
    });

    // add a rule for the manifest scope, if it had not already been configured
    if (setScope) {
        config.setAttribute('access', 'origin', scope);
    }
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
                if (element.density === platformIcons[i].get('density')) {
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
        "800x480": "hdpi",
        "320x200": "ldpi",
        "480x320": "mdpi",
        "1280x720":"xhdpi",
        "480x800": "hdpi",
        "200x320": "ldpi",
        "320x480": "mdpi",
        "720x1280":"xhdpi"
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
    var manifestPath = path.join(projectRoot, 'www', 'manifest.json');
    var manifestJson = fs.readFileSync(manifestPath).toString().replace(/^\uFEFF/, '');
    var manifest = JSON.parse(manifestJson);

    // update name, orientation, and fullscreen from manifest
    config.setName(manifest.name);
    config.setPreference('Orientation', manifest.orientation);
    if (manifest.display) {
        config.setPreference('Fullscreen', manifest.display == 'fullscreen' ? 'true' : 'false');
    }

    // configure access rules
    processAccessRules(manifest.wat_popout, manifest.scope);

    // configure manifest icons
    var manifestIcons = getManifestIcons(manifest);
    processiOSIcons(manifestIcons);
    processAndroidIcons(manifestIcons);
    processWindowsIcons(manifestIcons);
    processWindowsPhoneIcons(manifestIcons);

    // save the updated configuration
    config.write();

    return Q.all(pendingTasks);
}
