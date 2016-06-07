var _manifest;
var _manifestError;
var _offlineView;
var _mainView;
var _zIndex = 10000;
var _enableOfflineSupport = true;
var _lastKnownLocation;
var _lastKnownLocationFailed = false;
var _whiteList = [];

function bridgeNativeEvent(e) {
    _mainView.invokeScriptAsync('eval', "cordova && cordova.fireDocumentEvent('" + e.type + "', null, true);").start();
}

//document.addEventListener('backbutton', bridgeNativeEvent, false);
document.addEventListener('pause', bridgeNativeEvent, false);
document.addEventListener('resume', bridgeNativeEvent, false);

// creates a webview to host content
function configureHost(url, zOrder, display) {
    var webView = document.createElement(cordova.platformId === 'windows8' ? 'iframe' : 'x-ms-webview');
    var style = webView.style;
    style.position = 'absolute';
    style.top = 0;
    style.left = 0;
    style.zIndex = zOrder;
    style.width = '100%';
    style.height = '100%';
    if (display) {
        style.display = display;
    }

    if (url) {
        webView.src = url;
    }

    webView.addEventListener("MSWebViewNavigationCompleted", navigationCompletedEvent, false);
    webView.addEventListener("MSWebViewNavigationStarting", navigationStartingEvent, false);

    document.body.appendChild(webView);

    return webView;
}

// handles webview's navigation starting event
function navigationStartingEvent(evt) {
    if (handleCordovaExecCalls(evt)) {
        evt.stopImmediatePropagation();
        evt.preventDefault();
        return;
    }

    if (evt.uri && evt.uri !== "") {
        var isInWhitelist = false;
        for (var i = 0; i < _whiteList.length; i++) {
            var rule = _whiteList[i];
            if (rule.test(evt.uri)) {
                isInWhitelist = true;
                break;
            }
        }

        // if the url to navigate to does not match any of the rules in the whitelist, open it outside de app
        if (!isInWhitelist) {
            evt.stopImmediatePropagation();
            evt.preventDefault();
            console.log("Whitelist rejection: url='" + evt.uri + "'");
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(evt.uri));
        }
    }
}

// handles webview's navigation completed event
function navigationCompletedEvent(evt) {
    if (evt.uri && evt.uri !== "") {
        if (evt.isSuccess) {
            _lastKnownLocationFailed = false;
            if (_offlineView) {
                _offlineView.style.display = 'none';
            }
        } else {
            _lastKnownLocationFailed = true;
        }

        _lastKnownLocation = evt.uri;
    }
}

function domContentLoadedEvent(evt) {
    console.log('Finished loading URL: ' + _mainView.src);

    hideExtendedSplashScreen();

    // inject Cordova
    if (isCordovaEnabled()) {
        var cordova = _manifest.mjs_cordova || {};

        var pluginMode = cordova.plugin_mode || 'client';
        var cordovaBaseUrl = (cordova.base_url || '').trim();
        if (cordovaBaseUrl.indexOf('/', cordovaBaseUrl.length - 1) === -1) {
            cordovaBaseUrl += '/';
        }

        _mainView.invokeScriptAsync('eval', 'window.hostedWebApp = { \'platform\': \'windows\', \'pluginMode\': \'' + pluginMode + '\', \'cordovaBaseUrl\': \'' + cordovaBaseUrl + '\'};').start();

        var scriptsToInject = [];
        if (pluginMode === 'client') {
            scriptsToInject.push('cordova.js');
        }

        scriptsToInject.push('hostedapp-bridge.js');
        injectScripts(scriptsToInject);
    }

    // inject import scripts
    if (_manifest && _manifest.mjs_import_scripts && _manifest.mjs_import_scripts instanceof Array) {
        var scriptFiles = _manifest.mjs_import_scripts
            .filter(isMatchingRuleForPage)
            .map(function (item) {
                return item.src;
            });

        if (scriptFiles.length) {
            injectScripts(scriptFiles);
        }
    }
}

// checks if Cordova runtime environment is enabled for the current page
function isCordovaEnabled() {
    var allow = true;
    var enableCordova = false;
    var accessRules = _manifest.mjs_api_access;
    if (accessRules) {
        accessRules.forEach(function (rule) {
            if (isMatchingRuleForPage(rule, true)) {
                var access = rule.access;
                if (!access || access === 'cordova') {
                    enableCordova = true;
                }
                else if (access === 'none') {
                    allow = false;
                }
                else {
                    console.log('Unsupported API access type \'' + access + '\' found in mjs_api_access rule.');
                }
            }
        });
    }

    return enableCordova && allow;
}

// check if an API access or custom script match rule applies to the current page
function isMatchingRuleForPage(rule, checkPlatform) {

    // ensure rule applies to current platform
    if (checkPlatform) {
        if (rule.platform && rule.platform.split(',')
            .map(function (item) { return item.trim(); })
            .indexOf('windows') < 0) {
                return false;
            }
    }

    // ensure rule applies to current page
    var match = rule.match;
    if (match) {
        if (typeof match === 'string' && match.length) {
            match = [match];
        }

        return match.some(function (item) { return convertPatternToRegex(item).test(_mainView.src); });
    }

    return true;
}

// handles network connectivity change events
function connectivityEvent(evt) {
    console.log('Received a network connectivity change notification. The device is currently ' + evt.type + '.');
    if (_enableOfflineSupport) {
        if (evt.type === 'offline') {
            _offlineView.style.display = 'block';
        } else if (evt.type === 'online') {
            if (_lastKnownLocationFailed) {
                if (_lastKnownLocation) {
                    console.log("Reload last known location: '" + _lastKnownLocation + "'");
                    _mainView.src = _lastKnownLocation;
                }
            } else {
                _offlineView.style.display = 'none';
            }
        }
    }
}

// sets up a secondary webview to host the offline page
function configureOfflineSupport(offlinePage) {
    var offlinePageUrl = '///www/' + offlinePage;
    var url = new Windows.Foundation.Uri('ms-appx:' + offlinePageUrl);
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(
        function (file) {
            _offlineView = configureHost('ms-appx-web:' + offlinePageUrl, 10001, 'none');
        },
        function (err) {
            var message = 'It looks like you are offline. Please reconnect to use this application.';
            var offlinePageTemplate = '<html><body><div style="font-size: x-large; position: absolute; left: 0; top: 0; bottom: 0; right: 0; height: 0; text-align: center; margin: auto">' + message + '</div></body></html>';
            _offlineView = configureHost(null, _zIndex + 1, 'none');

            if (cordova.platformId === 'windows8') {
                _offlineView.style.backgroundColor = 'white';
                _offlineView.contentDocument.write(offlinePageTemplate);
            } else {
                _offlineView.navigateToString(offlinePageTemplate);
            }
        }).done(function () {
            document.addEventListener('offline', connectivityEvent, false);
            document.addEventListener('online', connectivityEvent, false);
        });
}

// escapes regular expression reserved symbols
function escapeRegex(str) {
    return ("" + str).replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}

// converts a string pattern to a regular expression
function convertPatternToRegex(pattern, excludeLineStart, excludeLineEnd) {
    var isNot = (pattern[0] == '!');
    if (isNot) { pattern = pattern.substr(1) };

    var regexBody = escapeRegex(pattern);

    excludeLineStart = !!excludeLineStart;
    excludeLineEnd = !!excludeLineEnd;

    regexBody = regexBody.replace(/\\\?/g, ".?").replace(/\\\*/g, ".*?");
    if (isNot) { regexBody = "((?!" + regexBody + ").)*"; }
    if (!excludeLineStart) { regexBody = "^" + regexBody; }
    if (!excludeLineEnd) { regexBody += "\/?$"; }

    return new RegExp(regexBody);
}

// initializes an array of the access rules defined in the manifest
function configureWhiteList(manifest) {
    if (manifest) {
        // Add base access rule based on the start_url and the scope
        var baseUrlPattern = new Windows.Foundation.Uri(manifest.start_url);
        if (manifest.scope && manifest.scope.length) {
            baseUrlPattern = baseUrlPattern.combineUri(manifest.scope);
        }

        baseUrlPattern = baseUrlPattern.combineUri('*');
        _whiteList.push(convertPatternToRegex(baseUrlPattern.absoluteUri));

        // add additional access rules from mjs_access_whitelist
        // TODO: mjs_access_whitelist is deprecated. Should be removed in future versions
        if (manifest.mjs_access_whitelist && manifest.mjs_access_whitelist instanceof Array) {
            manifest.mjs_access_whitelist.forEach(function (rule) {
                _whiteList.push(convertPatternToRegex(rule.url));
            });
        }

        // add additional access rules from mjs_extended_scope
        if (manifest.mjs_extended_scope && manifest.mjs_extended_scope instanceof Array) {
            manifest.mjs_extended_scope.forEach(function (rule) {
                _whiteList.push(convertPatternToRegex(rule));
            });
        }
    }
}

// hides the extended splash screen
function hideExtendedSplashScreen() {
    var extendedSplashScreen = document.getElementById("extendedSplashScreen");
    extendedSplashScreen.style.display = "none";
}

// handle the hardware backbutton
function navigateBack(e) {
    if (!_mainView.canGoBack) {
        return false;
    }

    try {
        _mainView.goBack();
    } catch (err) {
        return false;
    }

    return true;
}

var exec = require('cordova/exec');

function injectScripts(files, successCallback, errorCallback) {

    var script = (arguments.length > 3 && typeof arguments[3] === 'string') ? arguments[3] : '';
    var fileList = (arguments.length > 4 && typeof arguments[4] === 'string') ? arguments[4] : '';

    if (typeof files === 'string') {
        files = files.length ? [files] : [];
    }

    var fileName = files.shift();
    if (!fileName) {
        var asyncOp = _mainView.invokeScriptAsync('eval', script);
        asyncOp.oncomplete = function () { successCallback && successCallback(true); };
        asyncOp.onerror = function (err) {
            console.log('Error injecting script file(s): ' + fileList + ' - ' + asyncOp.error);
            errorCallback && errorCallback(err);
        };

        asyncOp.start()
        return;
    }

    console.log('Injecting script file: ' + fileName);
    var uri = new Windows.Foundation.Uri('ms-appx:///www/', fileName);

    var onSuccess = function (content) {
        script += '\r\n//# sourceURL=' + fileName + '\r\n' + content;
        injectScripts(files, successCallback, errorCallback, script, (fileList ? ', ' : '') + fileName);
    };

    var onError = function (err) {
        console.log('Error retrieving script file from app package: ' + fileName + ' - ' + err);
        if (errorCallback) {
            errorCallback(err);
        }
    };

    if (uri.schemeName == 'ms-appx') {
        Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri)
            .done(function (file) {
                Windows.Storage.FileIO.readTextAsync(file)
                    .done(onSuccess, onError);
            }, onError);
    } else {
        var httpClient = new Windows.Web.Http.HttpClient();
        httpClient.getStringAsync(uri).done(onSuccess, onError);
        httpClient.close();
    }
}

function handleCordovaExecCalls(evt) {
    if (evt.uri) {
        var targetUri = new Windows.Foundation.Uri(evt.uri);
        if (targetUri.host === '.cordova' && targetUri.path === '/exec') {
            var service = targetUri.queryParsed.getFirstValueByName('service');
            var action = targetUri.queryParsed.getFirstValueByName('action');
            var args = JSON.parse(decodeURIComponent(targetUri.queryParsed.getFirstValueByName('args')));
            var callbackId = targetUri.queryParsed.getFirstValueByName('callbackId');

            var success, fail;
            if (callbackId !== '0') {
                success = function (args) {
                    var params = args ? '"' + encodeURIComponent(JSON.stringify(args)) + '"' : '';
                    var script = 'cordova.callbacks["' + callbackId + '"].success(' + params + ');';
                    _mainView.invokeScriptAsync('eval', script).start();
                };

                fail = function (err) {
                    var params = args ? '"' + encodeURIComponent(JSON.stringify(err)) + '"' : '';
                    var script = 'cordova.callbacks["' + callbackId + '"].fail(' + params + ');';
                    _mainView.invokeScriptAsync('eval', script).start();
                };
            }

            exec(success, fail, service, action, args);

            return true;
        }
    }

    return false;
}

module.exports = {
    // loads the W3C manifest file and parses it
    loadManifest: function (successCallback, errorCallback, args) {
        var manifestFileName = (args && args instanceof Array && args.length > 0) ? args[0] : 'manifest.json';
        var configFile = 'ms-appx:///www/' + manifestFileName;
        var uri = new Windows.Foundation.Uri(configFile);
        Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then(
            function (file) {
                Windows.Storage.FileIO.readTextAsync(file).then(function (data) {
                    try {
                        _manifest = JSON.parse(data);
                        cordova.fireDocumentEvent("manifestLoaded", { manifest: _manifest });
                        successCallback &&  successCallback(_manifest);
                    } catch (err) {
                        _manifestError = 'Error parsing manifest file: ' + manifestFileName + ' - ' + err.message;
                        console.log(_manifestError);
                    }
                });
            },
            function (err) {
                _manifestError = 'Error reading manifest file: ' + manifestFileName + ' - ' + err;
                console.log(_manifestError);
                errorCallback && errorCallback(err);
            });
    },

    // returns the currently loaded manifest
    getManifest: function (successCallback, errorCallback) {
        if (_manifest) {
            successCallback && successCallback(_manifest);
        } else {
            errorCallback && errorCallback(new Error(_manifestError));
        }
    },

    // enables offline page support
    enableOfflinePage: function (successCallback, errorCallback) {
        _enableOfflineSupport = true;
        successCallback && successCallback();
    },

    // disables offline page support
    disableOfflinePage: function (successCallback, errorCallback) {
        _enableOfflineSupport = false;
        successCallback && successCallback();
    },

    getWebView: function () {
      return _mainView;
    },

    injectPluginScript: function (successCallback, errorCallback, file) {
        injectScripts(file, successCallback, errorCallback);
    }
}; // exports

cordova.commandProxy.add('HostedWebApp', module.exports);

module.exports.loadManifest(
    function (manifest) {
        if (manifest.mjs_offline_feature === false) {
            _enableOfflineSupport = false;
        } else {
            configureOfflineSupport('offline.html');
        }
        configureWhiteList(manifest);
        _mainView = configureHost(manifest ? manifest.start_url : 'about:blank', _zIndex);
        _mainView.addEventListener("MSWebViewDOMContentLoaded", domContentLoadedEvent, false);

        cordova.fireDocumentEvent("webviewCreated", { webView: _mainView });
        WinJS.Application.onbackclick = navigateBack;
    });
