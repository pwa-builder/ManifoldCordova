#import <Cordova/CDVPlugin.h>

@interface WrappingWebViewDelegate : NSObject <UIWebViewDelegate>
@property (nonatomic,retain) id<UIWebViewDelegate> wrappedDelegate;
@end

@interface CDVHostedWebApp : CDVPlugin {
    WrappingWebViewDelegate *wrappingDelegate;
}

-(void) loadManifest:(CDVInvokedUrlCommand*)command;

-(void) getManifest:(CDVInvokedUrlCommand*)command;

-(void) enableOfflinePage:(CDVInvokedUrlCommand*)command;

-(void) disableOfflinePage:(CDVInvokedUrlCommand*)command;

@end
