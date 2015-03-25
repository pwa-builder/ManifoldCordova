#import <Cordova/CDVPlugin.h>

@interface CVDWebViewNotificationDelegate : NSObject <UIWebViewDelegate>
@property (nonatomic,retain) id<UIWebViewDelegate> wrappedDelegate;
@end

@interface CDVHostedWebApp : CDVPlugin {
    CVDWebViewNotificationDelegate *notificationDelegate;
}

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

-(void) enableOfflinePage:(CDVInvokedUrlCommand*)command;

-(void) disableOfflinePage:(CDVInvokedUrlCommand*)command;

@end
