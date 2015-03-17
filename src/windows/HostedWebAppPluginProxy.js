var _manifest;
var _offlineView;
var _mainView;

// creates a webview to host content
function configureHost(url, zOrder, display) {
    var webView = document.createElement(cordova.platformId === 'windows8' ? 'iframe' : 'x-ms-webview');
    var style = webView.style;
    style.position = 'absolute';
    style.top = 0;
    style.left = 0;
    style.zIndex = zOrder;
    style.width = window.innerWidth + 'px';
    style.height = window.innerHeight + 'px';
    if (display) {
        style.display = display;
    }

    if (url) {
        webView.src = url;
    }

    document.body.appendChild(webView);

    return webView;
}

// handle network connectivity change events
function connectivityEvent(evt) {
    if (evt.type === 'offline') {
        _offlineView.style.display = 'block';
        console.log('The application is currently offline.');
    } else if (evt.type === 'online') {
        _offlineView.style.display = 'none';
        console.log('The application is currently online.');
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
            _offlineView = configureHost(null, 10001, 'none');

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

// loads the W3C manifest file
function _loadManifestAsync(fileName, successCallback, errorCallback) {
    var configFile = 'ms-appx:///www/' + fileName;
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
    load: function (successCallback, errorCallback, args) {
        if (args && args.length > 0) {
            _loadManifestAsync(args[0], successCallback, errorCallback);
        }
        else if (_manifest) {
            successCallback(_manifest);
        }
        else {
            errorCallback('Manifest has not been loaded!');
        }
    }
}; // exports

cordova.commandProxy.add('HostedWebApp', module.exports);

_loadManifestAsync('manifest.json',
    function (manifest) {
        _mainView = configureHost(manifest.start_url, 10000);
        configureOfflineSupport('offline.html');
    },
    function () {

    });