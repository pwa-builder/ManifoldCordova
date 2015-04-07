#import <Cordova/CDVPlugin.h>

@interface CDVHostedWebApp : CDVPlugin

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

-(void) enableOfflinePage:(CDVInvokedUrlCommand*)command;

-(void) disableOfflinePage:(CDVInvokedUrlCommand*)command;

@end
