var setupExtendedSplashScreen, updateSplashScreenPositioning,
    splashScreen, splashScreenEl, splashScreenImageEl,
    isWindows = navigator.appVersion.indexOf("Windows Phone") === -1,
    isWindowsPhone10 = navigator.appVersion.indexOf("Windows Phone 10") !== -1;

// TODO: Need to fix styling issues whith the extended splash screen for Windows Phone 10 (disabled for now)
if (!isWindowsPhone10) {
    WinJS.Application.addEventListener("activated", function (e) {
        if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            splashScreen = e.detail.splashScreen;

            // Listen for window resize events to reposition the extended splash screen image accordingly.
            // This is important to ensure that the extended splash screen is formatted properly in response to snapping, unsnapping, rotation, etc...
            window.addEventListener("resize", updateSplashPositioning, false);

            var previousExecutionState = e.detail.previousExecutionState;
            var state = Windows.ApplicationModel.Activation.ApplicationExecutionState;
            if (previousExecutionState === state.notRunning
                || previousExecutionState === state.terminated
                || previousExecutionState === state.closedByUser) {
                setupExtendedSplashScreen();
            }
        }
    }, false);
}

setupExtendedSplashScreen = function () {
    splashScreenEl = document.getElementById("extendedSplashScreen");
    splashScreenImageEl = (splashScreenEl && splashScreenEl.querySelector(".extendedSplashImage"));
    splashLoadingEl = (splashScreenEl && splashScreenEl.querySelector(".loading-progress"));

    if (!splashScreen || !splashScreenEl || !splashScreenImageEl) { return; }

    var imgSrc = "/images/splashScreenPhone.png"
    if (isWindows) {
        imgSrc = "/images/SplashScreen.png"
    }

    splashScreenImageEl.setAttribute("src", imgSrc);

    updateSplashPositioning();

    // Once the extended splash screen is setup, apply the CSS style that will make the extended splash screen visible.
    splashScreenEl.style.display = "block";
};

updateSplashPositioning = function () {
    if (!splashScreen || !splashScreenImageEl) { return; }
    // Position the extended splash screen image in the same location as the system splash screen image.
    if (isWindows) {
        splashScreenImageEl.style.top = splashScreen.imageLocation.y + "px";
        splashScreenImageEl.style.left = splashScreen.imageLocation.x + "px";
        splashScreenImageEl.style.height = splashScreen.imageLocation.height + "px";
        splashScreenImageEl.style.width = splashScreen.imageLocation.width + "px";
    } else {
        var curOrientation = Windows.Devices.Sensors.SimpleOrientationSensor.getDefault().getCurrentOrientation();
        if ((curOrientation == Windows.Devices.Sensors.SimpleOrientation.rotated270DegreesCounterclockwise || curOrientation == Windows.Devices.Sensors.SimpleOrientation.rotated90DegreesCounterclockwise) &&
             Windows.Graphics.Display.DisplayInformation.autoRotationPreferences != Windows.Graphics.Display.DisplayOrientations.portrait) {
            splashScreenImageEl.src = "/images/splashscreen.png";
        } else {
            splashScreenImageEl.src = "/images/splashScreenPhone.png";
        }
        splashScreenImageEl.style.width = "100%";
        splashScreenImageEl.style.height = "100%";
    }

    if (splashLoadingEl) {
        if (isWindows) {
            splashLoadingEl.style.top = (splashScreen.imageLocation.y + splashScreen.imageLocation.height + 20) + "px";
        } else {
            splashLoadingEl.style.top = (window.innerHeight * 0.8) + "px";
        }
    }
};
