(function (platform, pluginMode, cordovaBaseUrl) {
    function onCordovaLoaded() {
        var channel = cordova.require('cordova/channel');
        channel.onNativeReady.subscribe(function () {

            // for Windows plaftform, redefine exec to bridge calls to exec on "native" side (i.e. webview container)
            if (platform === 'windows') {
                cordova.define.remove('cordova/exec');
                cordova.define('cordova/exec', function (require, exports, module) {
                    module.exports = function (completeCallback, failureCallback, service, action, args) {
                        var success, fail;

                        var command = 'http://.cordova/exec?service=' + service + '&action=' + action + '&args=' + encodeURIComponent(JSON.stringify(args));

                        if (typeof completeCallback === 'function') {
                            success = function (args) {
                                var result = args ? JSON.parse(decodeURIComponent(args)) : undefined;
                                completeCallback(result);
                            };
                        }

                        if (typeof failureCallback === 'function') {
                            fail = function (args) {
                                var err = args ? JSON.parse(decodeURIComponent(args)) : undefined;
                                failureCallback(err);
                            };
                        }

                        var callbackId = 0;
                        if (success || fail) {
                            callbackId = service + cordova.callbackId++;
                            cordova.callbacks[callbackId] = { success: success, fail: fail };
                        }

                        command += '&callbackId=' + encodeURIComponent(callbackId);

                        window.location.href = command;
                    };
                });
            }

            // change bridge mode in iOS to avoid Content Security Policy (CSP) issues with 'gap://' frame origin
            // Note that all bridge modes except IFRAME_NAV were dropped starting from cordova-ios@4.0.0 (see 
            // https://issues.apache.org/jira/browse/CB-9883), so plugins will *not* work correctly in pages that
            // restrict the gap:// origin
            if (platform === 'ios') {
                var exec = cordova.require('cordova/exec');
                if (exec.setJsToNativeBridgeMode && exec.jsToNativeModes && exec.jsToNativeModes.XHR_OPTIONAL_PAYLOAD) {
                    exec.setJsToNativeBridgeMode(exec.jsToNativeModes.XHR_OPTIONAL_PAYLOAD);                    
                }
            }

            // override plugin loader to handle script injection
            var pluginloader = cordova.require('cordova/pluginloader');
            var defaultInjectScript = pluginloader.injectScript;
            pluginloader.injectScript = function (url, onload, onerror) {

                var onloadHandler = onload, onerrorHandler = onerror;

                // check if script being injected is 'cordova_plugins.js'
                var cordovaPluginsScript = 'cordova_plugins.js';
                if (url.indexOf(cordovaPluginsScript, url.length - cordovaPluginsScript.length) !== -1) {

                    // In Windows platform, avoid loading scripts from the "native" side
                    if (platform === 'windows') {

                        // redefine onload to exclude scripts in 'www' folder
                        onloadHandler = function () {
                            var moduleList = cordova.require('cordova/plugin_list');
                            for (var i = moduleList.length - 1; i >= 0; i--) {
                                if (moduleList[i].file.indexOf('/www/') < 0) {
                                    moduleList.splice(i, 1);
                                }
                            }

                            onload();
                        };
                    }

                    // In server mode, rewrite url to retrieve platform specific file
                    if (pluginMode === 'server') {
                        url = url.replace(cordovaPluginsScript, 'cordova_plugins-' + platform + '.js');
                    }
                }

                // In client mode, call native side to load and inject the script from the app package
                if (pluginMode === 'client') {
                    return cordova.require('cordova/exec')(function (result) {

                        // native side did not handle the script--using default mechanism
                        if (!result) {
                            return defaultInjectScript(url, onloadHandler, onerrorHandler);
                        }

                        onloadHandler();
                    },
                    function (err) {
                        onerrorHandler(err);
                    },
                    'HostedWebApp', 'injectPluginScript', [url]);
                }

                if (pluginMode === 'server') {
                    url = cordovaBaseUrl + url;
                }

                defaultInjectScript(url, onloadHandler, onerrorHandler);
            };
        });
    }

    // inject the platform specific cordova.js file
    if (pluginMode === 'server') {
        function injectScript(url, onload) {
            var script = document.createElement('script');
            script.src = url;
            script.onload = onload;
            document.head.appendChild(script);
        }

        var cordovaSrc = cordovaBaseUrl + 'cordova-' + platform + '.js';
        injectScript(cordovaSrc, onCordovaLoaded);
    } else {
        onCordovaLoaded();
    }

})(window.hostedWebApp.platform, window.hostedWebApp.pluginMode, window.hostedWebApp.cordovaBaseUrl);
