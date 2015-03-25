#import "CDVHostedWebApp.h"
#import <Cordova/CDV.h>
#import "CDVConnection.h"

@interface CDVHostedWebApp ()

@property UIWebView *offlineView;
@property NSString *offlinePage;
@property NSString *manifestError;
@property BOOL enableOfflineSupport;

@end

@implementation CDVHostedWebApp

@synthesize manifest;

static NSString * const defaultManifestFileName = @"manifest.json";

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
    // enable offline support by default
    self.enableOfflineSupport = YES;

    // load the W3C manifest
    manifest = [self loadManifestFile:nil];
}

// loads the specified W3C manifest
-(void) loadManifest:(CDVInvokedUrlCommand *)command {

    CDVPluginResult* pluginResult = nil;
    NSString* manifestFileName = [command.arguments objectAtIndex:0];

    manifest = [self loadManifestFile:manifestFileName];
    if (self.manifest != nil) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:self.manifest];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:self.manifestError];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// returns the currently loaded manifest
-(void) getManifest:(CDVInvokedUrlCommand *)command {

    CDVPluginResult* pluginResult = nil;
    if (self.manifest != nil) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:self.manifest];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:self.manifestError];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// enables offline page support
-(void) enableOfflinePage:(CDVInvokedUrlCommand *)command {

    self.enableOfflineSupport = YES;
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:true];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// disables offline page support
-(void) disableOfflinePage:(CDVInvokedUrlCommand *)command {

    self.enableOfflineSupport = NO;
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:true];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// loads a manifest file and parses it
-(NSDictionary *) loadManifestFile:(NSString *)manifestFileName {

    self.manifestError = nil;

    if (manifestFileName == nil) {
        manifestFileName = defaultManifestFileName;
    }

    NSString* filePath = [self.commandDelegate pathForResource:manifestFileName];
    if (filePath == nil) {
        self.manifestError = [NSString stringWithFormat:@"Missing manifest file: %@", manifestFileName];
        return nil;
    }

    NSData *manifestData = [NSData dataWithContentsOfFile:filePath];
    if (manifestData == nil) {
        self.manifestError = [NSString stringWithFormat:@"Error reading manifest file: %@", manifestFileName];
        return nil;
    }

    NSError *error = nil;
    id parsedManifest = [NSJSONSerialization JSONObjectWithData:manifestData options:0 error:&error];

    if (error) {
        /* handle malformed JSON here */
        self.manifestError = [NSString stringWithFormat:@"Error parsing manifest file: %@ - %@", manifestFileName, error];
        return nil;
    }

    if([parsedManifest isKindOfClass:[NSDictionary class]]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:kManifestLoadedNotification object:parsedManifest];

        return parsedManifest;
    }

    /* deserialization is not a dictionary--it probably means an invalid manifest. */
    self.manifestError = [NSString stringWithFormat:@"Invalid or unexpected manifest format: %@", manifestFileName];
    return nil;
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

    if ([[notification name] isEqualToString:kReachabilityChangedNotification]) {
        NSLog (@"Received a network connectivity change notification. The device is currently %@.", reachability.connectionRequired ? @"offline" : @"online");
        if (self.enableOfflineSupport) {
            if ((reachability != nil) && [reachability isKindOfClass:[CDVReachability class]]) {
                if (reachability.connectionRequired) {
                    [self.offlineView setHidden:NO];
                }
                else {
                    [self.offlineView setHidden:YES];
                }
            }
        }
    }
}

@end
