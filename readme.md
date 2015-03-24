PRELIMINARY DOCUMENTATION

<!---
 license: TBD
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
  "scope": "/",
  "start_url": "/racer/start.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "theme_color": "aliceblue"
}
</pre>

The W3C manifest enables the configuration of the application’s name, its starting URL, default orientation, and the icons it uses. In addition, it will update the application’s security policy to control access to external domains. 

When the application is launched, the plugin automatically handles navigation to the site’s starting URL.

Lastly, since network connectivity is essential to the operation of a hosted web application, the plugin implements a basic offline feature that will show an offline page whenever connectivity is lost and will prevent users from interacting with the application until the connection is restored.

## Installation
> **Note:** These are temporary installation steps until the plugin is published.

`cordova plugin add https://github.com/southworkscom/meteorite.git#:/dev/cordovaApps/plugins/com.microsoft.hostedwebapp`

> **IMPORTANT:** Before using the plugin, make sure to copy the W3C manifest file to the **www** folder of the Cordova application and name it **manifest.json**.

## Design
The plugin behavior is mostly implemented at build time by mapping properties in the W3C manifest to standard Cordova settings defined in the **config.xml** file. 

This mapping process is handled by a hook that executes during the **before_prepare** stage of the Cordova build process. The hook updates the **config.xml** file with values obtained from the manifest. 

The plugin hook also handles downloading any icons that are specified in the manifest and copies them to the application’s **res/icons** directory, using their dimensions, and possibly their pixel density, to classify them as either an icon or a splash screen, as well as determining the platform for which they are suitable (e.g. iOS, Android, Windows, etc.). It uses this information to configure the corresponding icon and splash elements for each supported platform.

## Getting Started

The following tutorial requires you to install the [Cordova Command-Line Inteface](http://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface).

### Hosting a Web Application
The plugin enables using content hosted in a web site inside a Cordova application by providing a manifest that describes the site.

1. Create a new Cordova application.  
	`cordova create sampleapp yourdomain.sampleapp SampleHostedApp`

1. Go to the **sampleapp** directory created by the previous command.

1. Download or create a [W3C manifest](http://www.w3.org/2008/webapps/manifest/) describing the website to be hosted by the Cordova application and copy this file to its **www** folder. If necessary, rename the file as **manifest.json**.

	> **Note:** You can find a sample manifest file at **/dev/cordovaApps/assets/manifest.json** in this repository. This sample manifest references the http://wat-docs.azurewebsites.net site. 
 
1. Add the **Hosted Web Application** plugin to the project.  
	`cordova plugin add https://github.com/southworkscom/meteorite.git#:/dev/cordovaApps/plugins/com.microsoft.hostedwebapp`

	> **Note:** These are temporary installation steps until the plugin is published.

1. Add one or more platforms, for example, to support Android.  
	`cordova platform add android`

1. Build the application.  
	`cordova build`

1. Launch the application in the emulator for one of the supported platforms. For example:  
	`cordova emulate android`

	> **Note:** The plugin updates the Cordova configuration file (config.xml) with the information in the W3C manifest. If the information in the manifest changes, you can reapply the updated manifest settings at any time by executing prepare. For example:  
	`cordova prepare`

### Offline Feature
The plugin implements a basic offline feature that will show an offline page whenever network connectivity is lost. By default, the page shows a suitable message alerting the user about the loss of connectivity. To customize the offline experience, a page named **offline.html** can be placed in the **www** folder of the application and it will be used instead.

1. To test the offline feature, interrupt the network connection to show the offline page and reconnect it to hide it. 

	> **Note:** The procedure for setting offline mode varies depending on whether you are testing on an actual device or an emulator. In devices, you can simply set the device to airplane mode. In the case of simulators there is no single method. For example, in [Ripple](http://ripple.incubator.apache.org/), you can simulate a network disconnection by setting the Connection Type to 'none' under Network Status. On the other hand, for the iOS Simulator, you may need to physically disconnect the network cable or turn off the WiFi connection of the host machine.

1. Optionally, replace the default offline UI by adding a new page with the content to be shown while in offline mode. Name the page **offline.html** and place it in the **www** folder of the project.

### Using Icons and Splash Screens
The plugin uses any icons and splash screens specified in the manifest to configure the Cordova application.

The sample manifest in the **assets** folder does not specify any icons for the web application. If you use this file for testing, the application will use the default Cordova icon set. To experiment with the plugin's icon and splash screen support, you need to update the manifest to reference suitable icons for each platform supported by the application, as described in the [W3C spec](http://www.w3.org/2008/webapps/manifest/#icon-object-and-its-members). Ideally, these icon files should be served by the target site. The plugin handles downloading the icon files and copying them to the appropriate locations in the project.

In this repository, you can find a sample **/sandbox/cordova-icons/www/manifest.json** file that uses absolute URLs to reference icon files hosted locally even though the **start_url** member of the manifest points to a remote site (http://wat-docs.azurewebsites.net). It is intended for testing sites that do not yet publish their own icon files. To use it successfully, you need to launch a local web server to serve the local content, as described below.

1. Open a command prompt and change the current directory to  **/sandbox/cordova-icons** in this repository.

1. Launch a local web server to serve the icon files stored in the **/sandbox/cordova-icons/www** directory from **http://localhost:8080/**.  
	`node site.js`

> **Note:** You can, of course, replace the starting URL in the manifest with a site of your choice as well as replace the image files with suitable icons and splash screens for the target site.

### URL Access Rules
For a hosted web application, the W3C manifest defines a scope that restricts the URLs to which the application can navigate. Additionally, the manifest can include a proprietary setting named **hap_urlAccess** that defines an array of access rules, each one consisting of a _url_ attribute that identifies the target of the rule and a boolean attribute named _external_ that indicates whether URLs matching the rule should be navigated to by the application or launched in an external browser.

Typically, Cordova applications define access rules to implement a security policy that controls access to external domains. The access rules must not only allow access to the scope defined by the W3C manifest but also to external content used within the site, for example, to reference script files hosted by a  CDN origin. It must also handle any URLs that should be launched externally. 

To configure the security policy, the plugin hook maps the scope and URL access rules in the W3C manifest (**manifest.json**) to suitable access elements in the Cordova configuration file (**config.xml**). For example:

**Manifest.json**
<pre>
...
   "scope":  "http://www.xyz.com/", 
   "hap_urlAccess":  [ 
     { "url": "http//googleapis.com/*" },
     { "url": "http//wat.codeplex.com/", "external": true }
   ]
...
</pre>

**Config.xml**
<pre>
...
&lt;access origin="http://www.xyz.com/*" /&gt;
&lt;access origin="http://googleapis.com/*" /&gt; 
&lt;access origin="http://wat.codeplex.com/" launch-external="yes" /&gt;
...
</pre>

## Preferences
[TBD]

## Methods
- **loadManifest**:	Loads the specified W3C manifest.  

	`hostedwebapp.loadManifest(successCallback, errorCallback, manifestFileName)`

	_successCallback_: A callback that is passed a manifest object.  
	_errorCallback_: A callback that executes if an error occurs when loading the manifest file.  
	_manifestFileName_: The name of the manifest file to load.

- **getManifest**: Returns the currently loaded manifest.

	`hostedwebapp.getManifest(successCallback, errorCallback)`

	_successCallback_: A callback that is passed a manifest object.  
	_errorCallback_: A callback that executes if a manifest is not currently available.  

- **enableOfflinePage**: Enables offline page support.

	`hostedwebapp.enableOfflinePage()`

- **disableOfflinePage**: Disables offline page support.

	`hostedwebapp.disableOfflinePage()`

## Supported Platforms
Windows 8.1  
Windows Phone 8.1  
iOS  
Android  
