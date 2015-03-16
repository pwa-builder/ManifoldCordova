var hostedwebapp = {
  load: function (successCallback, errorCallback, manifestPath) {
    cordova.exec(successCallback, errorCallback, "HostedWebApp", "load", [manifestPath]);
  },
  showOfflineOverlay: function () {
    cordova.exec(null, null, "HostedWebApp", "showOfflineOverlay", []);
  },
  hideOfflineOverlay: function () {
    cordova.exec(null, null, "HostedWebApp", "hideOfflineOverlay", []);
  },
}

module.exports = hostedwebapp;
