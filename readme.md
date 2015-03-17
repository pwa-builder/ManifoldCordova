PRELIMINARY DOCUMENTATION

<!---
 license: TBD
-->

# Hosted Web Application
This plugin enables the creation of a hosted web application from a [W3C manifest](http://www.w3.org/2008/webapps/manifest/) that provides metadata associated with a web application. It uses properties in the manifest to update corresponding properties in the Cordova configuration file to enable hosting the site’s content inside a Cordova application.

The W3C manifest enables the configuration of the application’s name, its starting URL, and the icons it uses. In addition, it will update the application’s security policy to control access to external domains. 

When the application is launched, the plugin automatically handles navigation to the site’s starting URL.

Lastly, since network connectivity is essential to the operation of a hosted web application, the plugin implements a basic offline feature that will show an offline page whenever connectivity is lost and will prevent users from interacting with the application until the connection is restored.

## Installation
[**NOTE**: These are temporary installation steps until the plugin is published. Before you begin, you must use Git to clone [this](https://github.com/southworkscom/meteorite.git "Meteorite repository") repository to your local disk.]

`cordova plugin add [PATH-TO-CLONED-REPOSITORY]\dev\cordovaApps\plugins\com.microsoft.hostedwebapp`

**IMPORTANT**: Before using the plugin, make sure to copy the W3C manifest file to the **www** folder of the Cordova application and name it **manifest.json**.

## Design
The plugin behavior is mostly implemented at build time by mapping properties in the W3C manifest to standard Cordova settings defined in the **config.xml** file. 

This mapping process is handled by a hook that executes during the **before_prepare** stage of the Cordova build process. The hook updates the **config.xml** file with values obtained from the manifest. 

The plugin also handles downloading any icons that are specified in the manifest and copies them to the application’s **res/icons** directory, using their dimensions, and possibly their pixel density, to classify them as either an icon or a splash screen, as well as determining the platform for which they are suitable (e.g. iOS, Android, Windows, etc.). It uses this information to configure the corresponding icon and splash elements for each supported platform.

## URL Access Rules
For a hosted web application, the W3C manifest defines a scope that restricts the URLs to which the application can navigate. Additionally, through a proprietary extension to the W3C spec, the manifest can also include URL access rules that specify one or more URLs that should be launched outside the context of the application, for example, by opening them in an external browser.

Typically, a Cordova application defines a default security policy that controls access to external domains. The Cordova security policy must not only allow access to the scope defined by the W3C manifest but also to content referenced within the site, for example, from an external CDN origin hosting its script files. It must also map the URL access rules that should be launched externally. The plugin handles the mapping between the scoping and URL access rules in the W3C manifest and Cordova’s whitelisting access rules.

[TO BE COMPLETED]

## Offline Feature
By default, the offline page will show a suitable message alerting the user about the loss of connectivity. To customize the offline experience, a page named **offline.html** can be placed in the **www** folder of the application and it will be used instead.

## Preferences
[TBD]

## Methods
navigator.hostedwebapp.loadManifest  
navigator.hostedwebapp.getManifest  
navigator.hostedwebapp.enableOfflinePage  
navigator.hostedwebapp.disableOfflinePage  

## Supported Platforms
Windows 8.1  
Windows Phone 8.1  
iOS  
Android  
