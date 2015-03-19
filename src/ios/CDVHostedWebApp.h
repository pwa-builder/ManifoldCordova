#import <Cordova/CDVPlugin.h>

@interface CDVHostedWebApp : CDVPlugin

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

@end
