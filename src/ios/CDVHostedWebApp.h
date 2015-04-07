#import <Cordova/CDVPlugin.h>

@interface CVDWebViewNotificationDelegate : NSObject <UIWebViewDelegate>
    @property (nonatomic,retain) id<UIWebViewDelegate> wrappedDelegate;
@end

#define kManifestLoadedNotification @"kManifestLoadedNotification"

@interface CDVHostedWebApp : CDVPlugin
{
    NSDictionary *manifest;
    CVDWebViewNotificationDelegate *notificationDelegate;
}

@property (nonatomic, strong, readonly) NSDictionary *manifest;

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

-(void) enableOfflinePage:(CDVInvokedUrlCommand*)command;

-(void) disableOfflinePage:(CDVInvokedUrlCommand*)command;

@end
