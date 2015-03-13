#import <Cordova/CDVPlugin.h>

@interface CDVHostedWebApp : CDVPlugin

-(void) initialize:(CDVInvokedUrlCommand*)command;

-(void) load:(CDVInvokedUrlCommand*)command;

@end
