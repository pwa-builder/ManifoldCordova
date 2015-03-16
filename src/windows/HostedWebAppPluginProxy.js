var _manifest;
var _offlineView;
var _mainView;

function configureHost(url, zOrder, display) {
    var webView = document.createElement(cordova.platformId === "windows8" ? "iframe" : "x-ms-webview");
    var style = webView.style;
    style.position = "absolute";
    style.top = 0;
    style.left = 0;
    style.zIndex = zOrder;
    style.width = window.innerWidth + "px";
    style.height = window.innerHeight + "px";
    if (display) {
        style.display = display;
    }

    if (url) {
        webView.src = url;
    }

    document.body.appendChild(webView);

    return webView;
}

function configureOfflineSupport(offlinePage) {
    var url = new Windows.Foundation.Uri('ms-appx:///www/' + offlinePage);
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(
        function (file) {
            _offlineView = configureHost(url.absoluteUri, 10001, 'none');
        },
        function (err) {
            var message = 'It looks like you are offline. Please reconnect to use this application.';
            var offlinePageTemplate = '<html><body><div style="background-color:white;height:100%;position:absolute;top:0;bottom:0;left:0;right:0;font-size:x-large;text-align:center;">' + message + '</div></body></html>';
            _offlineView = configureHost(null, 10001, 'none');
            _offlineView.contentDocument.write(offlinePageTemplate);
        }).done(function () {
            // handle network connectivity change events
            document.addEventListener('offline', function (e) {
                _offlineView.style.display = "block";
                console.log('The application is currently offline.');
            }, false);
            document.addEventListener('online', function () { _offlineView.style.display = "none"; }, false);
        });
}

function _loadManifestAsync(fileName, successCallback, errorCallback) {
    var configFile = "ms-appx:///www/" + fileName;
    var uri = new Windows.Foundation.Uri(configFile);
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then(
        function (file) {
            Windows.Storage.FileIO.readTextAsync(file).then(function (data) {
                _manifest = JSON.parse(data);
                if (successCallback) {
                    successCallback(_manifest);
                }
            });
        },
        errorCallback);
}

module.exports = {
    initialize: function (successCallback, errorCallback, args) {
        _manifest = args[0];
    },

    load: function (successCallback, errorCallback, args) {
        if (args && args.length > 0) {
            _loadManifestAsync(args[0], successCallback, errorCallback);
        }
        else if (_manifest) {
            successCallback(_manifest);
        }
        else {
            errorCallback("Manifest has not been loaded!");
        }
    }
}; // exports

cordova.commandProxy.add("HostedWebApp", module.exports);

_loadManifestAsync('manifest.json',
    function (manifest) {
        _mainView = configureHost(manifest.start_url, 10000);
        configureOfflineSupport('Xoffline.html');
    },
    function () {

    });