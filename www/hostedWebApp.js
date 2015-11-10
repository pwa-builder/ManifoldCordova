var hostedwebapp = {
  loadManifest: function (successCallback, errorCallback, manifestFileName) {
    cordova.exec(successCallback, errorCallback, "HostedWebApp", "loadManifest", [manifestFileName]);
  },
  getManifest: function (successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, "HostedWebApp", "getManifest", []);
  },
  enableOfflinePage : function () {
    cordova.exec(undefined, undefined, "HostedWebApp", "enableOfflinePage", []);
  },
  disableOfflinePage : function () {
    cordova.exec(undefined, undefined, "HostedWebApp", "disableOfflinePage", []);
  }
}

module.exports = hostedwebapp;
