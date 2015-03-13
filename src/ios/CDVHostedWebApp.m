#import "CDVHostedWebApp.h"
#import <Cordova/CDV.h>
#import "CDVConnection.h"

@interface CDVHostedWebApp ()

@property UIWebView *offlineView;
@property NSString *offlinePage;

@end

@implementation CDVHostedWebApp

- (void)pluginInitialize
{
    [super pluginInitialize];
    
    // creates the UI to show offline mode
    [self createOfflineView];

    // observe notifications from network-information plugin to detect when device is offline
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(updateConnectivityStatus:)
                                                 name:kReachabilityChangedNotification
                                               object:nil];
}

// receives the parsed manifest from the Javascript side - not implemented
-(void) initialize:(CDVInvokedUrlCommand *)command {
}


-(void) load:(CDVInvokedUrlCommand *)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* manifestPath = [command.arguments objectAtIndex:0];
    if (manifestPath == nil) {
        manifestPath = @"manifest.json";
    }
    
    NSString* filePath = [self.commandDelegate pathForResource:manifestPath];
    if (filePath != nil)
    {
        NSString *manifestJson = [NSString stringWithContentsOfFile:filePath encoding:NSUTF8StringEncoding error:NULL];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString: manifestJson];
    } else {
        NSString *message = [NSString stringWithFormat:@"Missing manifest file: %@", manifestPath];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// Creates an additional webview to load the offline page, places it above the content webview, and hides it. It will
// be made visible whenever network connectivity is lost.
- (void)createOfflineView
{
    CGRect webViewBounds = self.webView.bounds;
    
    webViewBounds.origin = self.webView.bounds.origin;
    
    self.offlineView = [[UIWebView alloc] initWithFrame:webViewBounds];
    self.offlineView.autoresizingMask = (UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight);
    [self.offlineView setHidden:YES];
    
    [self.viewController.view addSubview:self.offlineView];
    
    NSURL* offlinePageURL = [NSURL URLWithString:self.offlinePage];
    if (offlinePageURL == nil) {
        offlinePageURL = [NSURL URLWithString:@"offline.html"];
    }
    
    NSString* offlineFilePath = [self.commandDelegate pathForResource:[offlinePageURL path]];
    if (offlineFilePath != nil) {
        offlinePageURL = [NSURL fileURLWithPath:offlineFilePath];
        [self.offlineView loadRequest:[NSURLRequest requestWithURL:offlinePageURL]];
    }
    else {
        NSString *offlinePageTemplate = @"<html><body><div style=\"height:100%;position:absolute;top:0;bottom:0;left:0;right:0;margin:auto 20;font-size:x-large;text-align:center;\">%@</div></body></html>";
        [self.offlineView
            loadHTMLString:[NSString stringWithFormat:offlinePageTemplate, @"It looks like you are offline. Please reconnect to use this application."]
            baseURL:nil];
    }
    
    [self.viewController.view sendSubviewToBack:self.webView];
}

// Handles notifications from the network-information plugin and shows the offline page whenever
// network connectivity is lost. It restores the original view once the network is up again.
- (void)updateConnectivityStatus:(NSNotification*)notification
{
    CDVReachability* reachability = [notification object];
    
    if ([[notification name] isEqualToString:kReachabilityChangedNotification])
        NSLog (@"Received a network connectivity change notification.");
    
    if ((reachability != nil) && [reachability isKindOfClass:[CDVReachability class]]) {
        if (reachability.connectionRequired) {
            [self.offlineView setHidden:NO];
        }
        else {
            [self.offlineView setHidden:YES];
        }
    }
}

@end
