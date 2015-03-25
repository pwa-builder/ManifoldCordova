#import <Cordova/CDVPlugin.h>


#define kManifestLoadedNotification @"kManifestLoadedNotification"

@interface CDVHostedWebApp : CDVPlugin
{
    NSDictionary *manifest;
}

@property (nonatomic, strong, readonly) NSDictionary *manifest;

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

-(void) enableOfflinePage:(CDVInvokedUrlCommand*)command;

-(void) disableOfflinePage:(CDVInvokedUrlCommand*)command;

@end
