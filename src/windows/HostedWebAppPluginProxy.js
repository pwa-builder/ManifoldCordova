var _manifest;
var _manifestJson;

function _loadManifestAsync(fileName, successCallback, errorCallback) {
    var configFile = "ms-appx:///www/" + fileName;
    var uri = new Windows.Foundation.Uri(configFile);
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then(
        function (file) {
            Windows.Storage.FileIO.readTextAsync(file).then(function (data) {
                _manifestJson = data;
                if (successCallback) {
                    successCallback(_manifestJson);
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
