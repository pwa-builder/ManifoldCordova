#import <Cordova/CDVPlugin.h>

#define kManifestLoadedNotification @"kManifestLoadedNotification"

#define kCDVHostedWebAppWebViewDidStartLoad @"CDVHostedWebAppWebViewDidStartLoad"
#define kCDVHostedWebAppWebViewShouldStartLoadWithRequest @"CDVHostedWebAppWebViewShouldStartLoadWithRequest"
#define kCDVHostedWebAppWebViewDidFinishLoad @"CDVHostedWebAppWebViewDidFinishLoad"
#define kCDVHostedWebAppWebViewDidFailLoadWithError @"CDVHostedWebAppWebViewDidFailLoadWithError"

@interface CVDWebViewNotificationDelegate : NSObject <UIWebViewDelegate>
    @property (nonatomic,retain) id<UIWebViewDelegate> wrappedDelegate;
@end

@interface CDVHostedWebApp : CDVPlugin
{
    CVDWebViewNotificationDelegate* notificationDelegate;
    NSDictionary* manifest;
}

@property (nonatomic, strong, readonly) NSDictionary* manifest;

- (void)loadManifest:(CDVInvokedUrlCommand*)command;

- (void)getManifest:(CDVInvokedUrlCommand*)command;

- (void)enableOfflinePage:(CDVInvokedUrlCommand*)command;

- (void)disableOfflinePage:(CDVInvokedUrlCommand*)command;

- (void)injectPluginScript:(CDVInvokedUrlCommand*)command;

@end
