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

//var _deviceReady = false;
//
//function onDeviceReady() {
//  if (_deviceReady) return;
//  _deviceReady = true;
//
//  cordova.exec(function (data) {
//    var manifestObject = JSON.parse(data);
//
//    // hostedwebapp.navigateToStartUrl();   // TODO: plugin should expose this method
//    if (cordova.platformId === "windows" || cordova.platformId === "windows8") {
//      webView.src = manifestObject.start_url;
//    } else {
//      window.location.href = manifestObject.start_url;
//    }
//  }, function (err) {
//    console.log("Error loading Hosted Web App plugin: " + err);
//  },
//  "HostedWebApp", "getManifest", []);
//}
//
//document.addEventListener("deviceready", onDeviceReady, false);
