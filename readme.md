<!---
 license: MIT License
-->

# Hosted Web Application
This plugin enables the creation of a hosted web application from a [W3C manifest](http://www.w3.org/2008/webapps/manifest/) that provides metadata associated with a web site. It uses properties in the manifest to update corresponding properties in the Cordova configuration file to enable using content hosted in the site inside a Cordova application.

**Typical manifest** 
<pre>
{
  "lang": "en",
  "name": "Super Racer 2000",
  "short_name": "Racer2K",
  "icons": [{
        "src": "icon/lowres",
        "sizes": "64x64",
        "type": "image/webp"
      }, {
        "src": "icon/hd_small",
        "sizes": "64x64"
      }, {
        "src": "icon/hd_hi",
        "sizes": "128x128",
        "density": 2
      }],
  "scope": "/racer/",
  "start_url": "http://www.racer2k.net/racer/start.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "theme_color": "aliceblue"
}
</pre>

The W3C manifest enables the configuration of the application’s name, its starting URL, default orientation, and the icons it uses. In addition, it will update the application’s security policy to control access to external domains. 

When the application is launched, the plugin automatically handles navigation to the site’s starting URL.

> **Note:** Although the W3C specs for the Web App manifest consider absolute and relative URLs valid for the _start_url_ value (e.g. _http://www.racer2k.net/racer/start.html_ and _/start.html_ are both valid), the plugin requires this URL **to be an absolute URL**. Otherwise, the installed applications won't be able to navigate to the web site.

The plugin enables the injection of additional Cordova plugins and app-specific scripts that consume them allowing you to take advantage of native features in your hosted web apps.

Lastly, since network connectivity is essential to the operation of a hosted web application, the plugin implements a basic offline feature that will show an offline page whenever connectivity is lost and will prevent users from interacting with the application until the connection is restored.

## Installation
`cordova plugin add cordova-plugin-hostedwebapp`

> **IMPORTANT:** Before using the plugin, make sure to copy the W3C manifest file to the **root** folder of the Cordova application, alongside **config.xml**, and name it **manifest.json**.

## Design
The plugin behavior is mostly implemented at build time by mapping properties in the W3C manifest to standard Cordova settings defined in the **config.xml** file. 

This mapping process is handled by a hook that executes during the **before_prepare** stage of the Cordova build process. The hook updates the **config.xml** file with values obtained from the manifest. 

The plugin hook also handles downloading any icons that are specified in the manifest and copies them to the application’s directory, using their dimensions, and possibly their pixel density, to classify them as either an icon or a splash screen, as well as determining the platform for which they are suitable (e.g. iOS, Android, Windows, etc.). It uses this information to configure the corresponding icon and splash elements for each supported platform.

## Getting Started

The following tutorial requires you to install the [Cordova Command-Line Inteface](http://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface).

### Hosting a Web Application
The plugin enables using content hosted in a web site inside a Cordova application by providing a manifest that describes the site.

1. Create a new Cordova application.  
	`cordova create sampleapp yourdomain.sampleapp SampleHostedApp`

1. Go to the **sampleapp** directory created by the previous command.

1. Download or create a [W3C manifest](http://www.w3.org/2008/webapps/manifest/) describing the website to be hosted by the Cordova application and copy this file to its **root** folder, alongside **config.xml**. If necessary, rename the file as **manifest.json**.

	> **Note:** You can find a sample manifest file at the start of this document. 
 
1. Add the **Hosted Web Application** plugin to the project.  
	`cordova plugin add cordova-plugin-hostedwebapp`

1. Add one or more platforms, for example, to support Android.  
	`cordova platform add android`

1. Build the application.  
	`cordova build`

1. Launch the application in the emulator for one of the supported platforms. For example:  
	`cordova emulate android`

	> **Note:** The plugin updates the Cordova configuration file (config.xml) with the information in the W3C manifest. If the information in the manifest changes, you can reapply the updated manifest settings at any time by executing prepare. For example:  
	`cordova prepare`

### Using Cordova Plugins in Hosted Web Apps
The plugin supports the injection of Cordova and the plugin interface scripts into the pages of a hosted site. There are two different plugin modes: '_server_' and '_client_'. In '_client_' mode, the **cordova.js** file and the plugin interface script files are retrieved from the app package. In '_server_' mode, these files are downloaded from the server along with the rest of the app's content. The plugin also provides a mechanism for injecting scripts that can be used, among other things, to consume the plugins added to the app. Imported scripts can be retrieved from the app package or downloaded from a remote source.

Very briefly, these are the steps that are needed to use plugins:

- Add one or more Cordova plugins to the app.

- Enable API access in any pages where Cordova and the plugins will be used. This injects the Cordova runtime environment and is configured via a custom extension in the W3C manifest. The **match** and **platform** attributes specifies the pages and platforms where you will use Cordova.
 
  ```
  {
    ...
    "mjs_api_access": [
      { "match": "http://yoursite.com/path1/*", "platform": "android, ios, windows", "access": "cordova" },
      ...
    ]
  }
  ```
- Optionally, choose a plugin mode. The default mode is _client_.

    **Client mode**
    ```
    {
    ...
      "mjs_cordova": {
        "plugin_mode": "client"
      }
    }
    ```

    **Server mode**
    ```
    {
      ...
      "mjs_cordova": {
        "plugin_mode": "server",
        "base_url": "js/cordova"
      }
    }
    ```

    (In '_server_' mode, the Cordova files and plugin interface scripts must be deployed to the site to the path specified in **base_url**. Also, the **cordova.js** and **cordova_plugins.js** files for each platform need to be renamed to specify the platform in their names so that **cordova.js** and **cordova_plugins.js** become, in the case of Android for example, **cordova-android.js** and **cordova_plugins-android.js** respectively.)

To inject scripts into the hosted web content:

- Update the app's manifest to list the imported scripts in a custom **mjs_import_scripts** section.
  ```
  {
    ...
    "mjs_import_scripts": [
      { "src": "js/alerts.js" },
      { "src": "http://yoursite.com/js/app/contacts.js" },
      { "src": "js/camera.js", "match": "http://yoursite.com/profile/*" },
      ...
    ]
  }
  ```

- For app-hosted scripts, copy the script files to the Cordova project. The path in **mjs_import_scripts** must be specified relative to the '_www_' folder of the project. Server-hosted scripts must be deployed to the site.

The following [wiki article](https://github.com/manifoldjs/ManifoldJS/wiki/Using-Cordova-Plugins-in-Hosted-Web-Apps) provides additional information about these features.

### Offline Feature
The plugin implements an offline feature that will show an offline page whenever network connectivity is lost.

The feature is enabled by default, but can be disabled with the following property in the manifest.json file.

```
{
  ...
  "mjs_offline_feature": false
  ...
}
```

By default, the page shows a suitable message informing the user about the loss of connectivity. To customize the offline experience, a page named **offline.html** can be placed in the **www** folder of the application and it will be used instead.

1. To test the offline feature, interrupt the network connection to show the offline page and reconnect it to hide it. 

	> **Note:** The procedure for setting offline mode varies depending on whether you are testing on an actual device or an emulator. In devices, you can simply set the device to airplane mode. In the case of simulators there is no single method. For example, in [Ripple](http://ripple.incubator.apache.org/), you can simulate a network disconnection by setting the Connection Type to 'none' under Network Status. On the other hand, for the iOS Simulator, you may need to physically disconnect the network cable or turn off the WiFi connection of the host machine.

1. Optionally, replace the default offline UI by adding a new page with the content to be shown while in offline mode. Name the page **offline.html** and place it in the **www** folder of the project.

### Icons and Splash Screens
The plugin uses any icons specified in the W3C manifest to configure the Cordova application. However, specifying icons in the manifest is not mandatory. If the W3C manifest does not specify any, the application will continue to use the default Cordova icon set or you can enter icon and splash elements manually in the **config.xml** file and they will be used instead. However, be aware that the plugin does replace any such elements if it finds an icon in the manifest that matches its size. Typically, manifest entries reference icons hosted by the target site itself and should reference suitable icons for each platform supported by the application, as described in the [W3C spec](http://www.w3.org/2008/webapps/manifest/#icon-object-and-its-members). The plugin takes care of downloading the corresponding files and copies them to the correct locations in the project.

When you run **cordova prepare**, the plugin will download from the hosted site all image assets in the manifest, if they are available, and it will store them inside the Cordova project using their relative paths as specified in the manifest. You can add any icons missing from the site or replace any icons that were downloaded by simply copying them to the correct location inside the project always making sure that they match the relative path in the manifest. Once the images are in place, building the project will copy the icons to each platform specific folder at the correct locations.

For example, the following manifest references icons from the _/resources_ path of the site, for example, _/resources/android/icons/icon-36-ldpi.png_. The plugin expects the corresponding icon file to be stored in the same path relative to the root of the Cordova project.

<pre>
{
    "name": "Super Racer 2000",
    "short_name": "Racer2K",
    "icons": [
        {
            "src": "/resources/android/icons/icon-36-ldpi.png",
            "sizes": "36x36"
        },
        {
            "src": "/resources/android/icons/icon-48-mdpi.png",
            "sizes": "48x48"
        },
        ...
        {
            "src": "/resources/ios/icons/icon-40-2x.png",
            "sizes": "80x80"
        },
        ...
        {
            "src": "/resources/windows/icons/Square44x44Logo.scale-240.png",
            "sizes": "106x106"
        },
        ...
    ],
    "scope": "/racer/",
    "start_url": "http://www.racer2k.net/racer/start.html",
    "display": "fullscreen",
    "orientation": "portrait"
}
</pre>

### Navigation Scope
For a hosted web application, the W3C manifest defines a scope that restricts the URLs to which the application can navigate. Additionally, the manifest can include a proprietary setting named **mjs_extended_scope** that defines an array of scope rules each one indicating whether URLs matching the rule should be navigated to by the application. Non-matching URLs will be launched externally.

Typically, Cordova applications define scope rules to implement a security policy that controls access to external domains. To configure the security policy, the plugin hook maps the scope rules in the W3C manifest (**manifest.json**) to suitable `<allow-navigation>` elements in the Cordova configuration file (**config.xml**). For example:

**Manifest.json**
<pre>
...
   "start_url": "http://www.xyz.com/",
   "scope":  "/", 
   "mjs_extended_scope": [
     { "url": "http//otherdomain.com/*" },
     { "url": "http//login.anotherdomain.com/" }
   ]
...
</pre>

**Config.xml**
<pre>
...
&lt;allow-navigation href="http://www.xyz.com/*" /&gt;
&lt;allow-navigation href="http://otherdomain.com/*" /&gt; 
&lt;allow-navigation href="http://login.anotherdomain.com/" /&gt;
...
</pre>

## Methods
Even though the following methods are available, it should be pointed out that calling them is not required as the plugin will provide most of its functionality by simply embedding a W3C manifest in the application package.

### loadManifest
Loads the specified W3C manifest.
 
`hostedwebapp.loadManifest(successCallback, errorCallback, manifestFileName)`
  
|**Parameter**     |**Description**                                                            |
|:-----------------|:--------------------------------------------------------------------------|
|_successCallback_ |A callback that is passed a manifest object.                               |
|_errorCallback_   |A callback that executes if an error occurs when loading the manifest file.|
|_manifestFileName_|The name of the manifest file to load.                                     |

### getManifest
Returns the currently loaded manifest.

`hostedwebapp.getManifest(successCallback, errorCallback)`

|**Parameter**     |**Description**                                                            |
|:-----------------|:--------------------------------------------------------------------------|
|_successCallback_ |A callback that is passed a manifest object.                               |
|_errorCallback_   |A callback that executes if a manifest is not currently available.         |

### enableOfflinePage
Enables offline page support.

`hostedwebapp.enableOfflinePage()`

### disableOfflinePage
Disables offline page support.

`hostedwebapp.disableOfflinePage()`

## Supported Platforms
Windows 8.1  
Windows Phone 8.1  
iOS  
Android

### Windows and Windows Phone Quirks

Cordova for Android and iOS platforms provide a security policy to control which network requests triggered by the page (css, js, images, XHRs, etc.) are allowed to be made; this means that they will be blocked if they don't match the `origin` attribute of any of the `<access>` elements defined in the Cordova configuration file (**config.xml**).

The Windows and Windows Phone platforms do not provide control for these kind of requests, and they will be allowed.

## Changelog

Releases are documented in [GitHub](https://github.com/manifoldjs/ManifoldCordova/releases).
