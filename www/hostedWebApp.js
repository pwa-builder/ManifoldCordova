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

var _deviceReady = false;

function configureOfflineSupport() {
  // create offline UI
  offlineMessage = document.createElement("div");
  var style = offlineMessage.style;
  style.position = "absolute";
  style.top = 0;
  style.left = 0;
  style.width = window.innerWidth + "px";
  style.height = window.innerHeight + "px";
  style.textAlign = "center";
  style.backgroundColor = "red";
  style.color = "white";
  style.fontSize = "xx-large";
  style.display = "none";
  style.zIndex = 20000;
  offlineMessage.innerText = "It appears that network connectivity has been lost. The application is currently offline.";
  document.body.appendChild(offlineMessage);

  // handle network connectivity change events
  document.addEventListener('offline', function () { offlineMessage.style.display = "block"; }, false);
  document.addEventListener('online', function () { offlineMessage.style.display = "none"; }, false);
}

function onDeviceReady() {
  if (_deviceReady) return;
  _deviceReady = true;

  cordova.exec(function (data) {
    var manifestObject = JSON.parse(data);

    if (cordova.platformId === "windows" || cordova.platformId === "windows8") {
      var webView = document.createElement("x-ms-webview");
      var style = webView.style;
      style.position = "absolute";
      style.top = 0;
      style.left = 0;
      style.zIndex = 10000;
      style.width = window.innerWidth + "px";
      style.height = window.innerHeight + "px";
      webView.src = manifestObject.start_url;
      document.body.appendChild(webView);
      configureOfflineSupport();
  } else {
      window.location.href = manifestObject.start_url;
    }
  }, function (err) {
    console.log("Error loading Hosted Web App plugin: " + err);
  },
  "HostedWebApp", "getManifest", []);
}

document.addEventListener("deviceready", onDeviceReady, false);
