#import "CDVHostedWebApp.h"
#import <Cordova/CDV.h>
#import "CDVConnection.h"

static NSString* const DEFAULT_SCRIPT_SOURCE_CSP = nil;
static NSString* const DEFAULT_LOCAL_ASSETS_VIRTUALPATH_PREFIX = @"cordova-hostedwebapp";
static NSString* const DEFAULT_PLUGIN_MODE = @"client";
static NSString* const DEFAULT_CORDOVA_BASE_URL = @"";

NSString* scriptSourceCSP;
NSString* localAssetsVirtualPathPrefix;

@interface CDVHostedWebApp ()

@property UIWebView *offlineView;
@property NSString *offlinePage;
@property NSString *manifestError;
@property BOOL enableOfflineSupport;
@property NSURL *failedURL;

@end

@implementation CVDWebViewNotificationDelegate

- (void)webViewDidStartLoad:(UIWebView*)theWebView {
    [self.wrappedDelegate webViewDidStartLoad: theWebView];

    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:kCDVHostedWebAppWebViewDidStartLoad object:theWebView]];
}

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:kCDVHostedWebAppWebViewShouldStartLoadWithRequest object:request]];

    return [self.wrappedDelegate webView:webView shouldStartLoadWithRequest:request navigationType:navigationType];
}

- (void)webViewDidFinishLoad:(UIWebView *)webView {
    [self.wrappedDelegate webViewDidFinishLoad:webView];

    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:kCDVHostedWebAppWebViewDidFinishLoad object:webView]];
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error {
    [self.wrappedDelegate webView:webView didFailLoadWithError:error];

    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:kCDVHostedWebAppWebViewDidFailLoadWithError object:error]];
}

@end

@implementation CDVHostedAppProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest*)theRequest
{
    NSURL* requestUrl = [theRequest URL];
    
//    NSLog(@"Request for URL: %@", requestUrl);
    NSString* prefix = [@"/" stringByAppendingString:localAssetsVirtualPathPrefix];
    if ([[requestUrl path] hasPrefix:prefix] &&
        (scriptSourceCSP == nil || scriptSourceCSP.length == 0 || [[requestUrl host] isEqualToString:scriptSourceCSP])) {
        return YES;
    }
    
    return NO;
}

+ (NSURLRequest*)canonicalRequestForRequest:(NSURLRequest*)request
{
    return request;
}

- (void)startLoading
{
    NSString* path = [[[[self request] URL] path] substringFromIndex:localAssetsVirtualPathPrefix.length + 1];
    
    NSLog(@"Loading content from app package: %@", path);
    
    NSURLRequest *request = self.request;
    NSDictionary *headers = @{ @"Content-Type": @"application/javascript" }; // this assumes all files are js
    NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:request.URL statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:headers];
    
    NSData* content = [NSData dataWithContentsOfFile: [[NSBundle mainBundle] pathForResource: path ofType:nil]];
    id <NSURLProtocolClient> client = self.client;
    [client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageAllowed];
    [client URLProtocol:self didLoadData:content];
    [client URLProtocolDidFinishLoading:self];
}

- (void)stopLoading
{
    // cleanup here
}

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

    // observe notifications from webview when page starts loading
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(webViewDidStartLoad:)
                                                 name:kCDVHostedWebAppWebViewDidStartLoad
                                               object:nil];

    // observe notifications from webview when page starts loading
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(webViewDidFinishLoad:)
                                                 name:kCDVHostedWebAppWebViewDidFinishLoad
                                               object:nil];

    // observe notifications from webview when page fails loading
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(didWebViewFailLoadWithError:)
                                                 name:kCDVHostedWebAppWebViewDidFailLoadWithError
                                               object:nil];

    // enable offline support by default
    self.enableOfflineSupport = YES;

    // no connection errors on startup
    self.failedURL = nil;

    // load the W3C manifest
    manifest = [self loadManifestFile:nil];

    // set the webview delegate to notify navigation events
    notificationDelegate = [[CVDWebViewNotificationDelegate alloc] init];
    notificationDelegate.wrappedDelegate = self.webView.delegate;
    [self.webView setDelegate:notificationDelegate];
    
    [NSURLProtocol registerClass:[CDVHostedAppProtocol class]];
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

        NSObject* setting;
        
        setting = [parsedManifest objectForKey:@"mjs_script_source_csp"];
        scriptSourceCSP = (setting != nil && [setting isKindOfClass:[NSString class]])
            ? [(NSString*)setting stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]]
            : DEFAULT_SCRIPT_SOURCE_CSP;
        
        setting = [parsedManifest objectForKey:@"mjs_local_assets_virtualpath_prefix"];
        localAssetsVirtualPathPrefix = (setting != nil && [setting isKindOfClass:[NSString class]])
            ? [(NSString*)setting stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]]
            : DEFAULT_LOCAL_ASSETS_VIRTUALPATH_PREFIX;
            
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
    if ([[notification name] isEqualToString:kReachabilityChangedNotification]) {
        CDVReachability* reachability = [notification object];
        if ((reachability != nil) && [reachability isKindOfClass:[CDVReachability class]]) {
            BOOL isOffline = (reachability.currentReachabilityStatus == NotReachable);
            NSLog (@"Received a network connectivity change notification. The device is currently %@.", isOffline ? @"offLine" : @"online");
            if (self.enableOfflineSupport) {
                if (isOffline) {
                    [self.offlineView setHidden:NO];
                }
                else {
                    if (self.failedURL) {
                        [self.webView loadRequest: [NSURLRequest requestWithURL: self.failedURL]];
                    }
                    else {
                        [self.offlineView setHidden:YES];
                    }
                }
            }
        }
    }
}

// Handles notifications from the webview delegate whenever a page starts loading.
- (void)webViewDidStartLoad:(NSNotification*)notification
{
    if ([[notification name] isEqualToString:kCDVHostedWebAppWebViewDidStartLoad]) {
        NSLog (@"Received a navigation start notification.");
        self.failedURL = nil;
    }
}

// Handles notifications from the webview delegate whenever a page finishes loading.
- (void)webViewDidFinishLoad:(NSNotification*)notification
{
    if ([[notification name] isEqualToString:kCDVHostedWebAppWebViewDidFinishLoad]) {
        NSLog (@"Received a navigation completed notification.");
        if (!self.failedURL) {
            [self.offlineView setHidden:YES];
        }
        
        NSString* scriptPathPrefix = [localAssetsVirtualPathPrefix stringByAppendingString:@"/www"];
        if (scriptSourceCSP != nil && scriptSourceCSP.length > 0)
        {
            scriptPathPrefix = [NSString stringWithFormat:@"//%@/%@", scriptSourceCSP, scriptPathPrefix];
        }
        
        NSString* javascript = @"(function() {function createScriptElement(source) {var element = document.createElement('script'); element.type = 'text/javascript'; element.src = source; document.head.appendChild(element);}";
        
        NSObject* setting = [self.manifest objectForKey:@"mjs_cordova"];
        if (setting != nil && [setting isKindOfClass:[NSDictionary class]])
        {
            NSDictionary* cordova = (NSDictionary*) setting;
            
            setting = [cordova objectForKey:@"pluginMode"];
            NSString* pluginMode = (setting != nil && [setting isKindOfClass:[NSString class]])
            ? [(NSString*)setting stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]]
            : DEFAULT_PLUGIN_MODE;

            setting = [cordova objectForKey:@"baseUrl"];
            NSString* cordovaBaseUrl = (setting != nil && [setting isKindOfClass:[NSString class]])
            ? [(NSString*)setting stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]]
            : DEFAULT_CORDOVA_BASE_URL;
            if (![cordovaBaseUrl hasSuffix:@"/"])
            {
                cordovaBaseUrl = [cordovaBaseUrl stringByAppendingString:@"/"];
            }
            
            javascript = [javascript stringByAppendingString:[NSString stringWithFormat:@"window.hostedWebApp = { 'platform': 'ios', 'pluginMode': '%@', 'cordovaBaseUrl': '%@'};", pluginMode, cordovaBaseUrl]];
            
            if ([pluginMode isEqualToString:@"client"])
            {
                javascript = [javascript stringByAppendingString:[NSString stringWithFormat:@"createScriptElement('%@/cordova.js');", scriptPathPrefix]];
            }
            
            javascript = [javascript stringByAppendingString:[NSString stringWithFormat:@"createScriptElement('%@/hostedapp-bridge.js');", scriptPathPrefix]];
        }
        

        setting = [self.manifest objectForKey:@"mjs_custom_scripts"];
        if (setting != nil && [setting isKindOfClass:[NSArray class]])
        {
            NSArray* customScripts = (NSArray*) setting;
            if (customScripts != nil && customScripts.count > 0)
            {
                for (NSDictionary* item in customScripts)
                {
                    NSString* source = [item valueForKey:@"source"];
                    // NSString* target = [item valueForKey:@"target"];
                    NSString* scriptPath = [NSString stringWithFormat:@"%@/%@", scriptPathPrefix, source];
                    javascript = [javascript stringByAppendingString:[NSString stringWithFormat:@"createScriptElement('%@');", scriptPath]];
                    NSLog(@"Injecting script from app package: %@", scriptPath);
                }
            }
        }
        
        javascript = [javascript stringByAppendingString:@"})();"];
        [self.webView stringByEvaluatingJavaScriptFromString:javascript];
    }
}

// Handles notifications from the webview delegate whenever a page load fails.
- (void)didWebViewFailLoadWithError:(NSNotification*)notification
{
    NSError* error = [notification object];

    if ([[notification name] isEqualToString:kCDVHostedWebAppWebViewDidFailLoadWithError]) {
        NSLog (@"Received a navigation failure notification. error: %@", [error description]);
        if ([error code] == NSURLErrorTimedOut ||
            [error code] == NSURLErrorUnsupportedURL ||
            [error code] == NSURLErrorCannotFindHost ||
            [error code] == NSURLErrorCannotConnectToHost ||
            [error code] == NSURLErrorDNSLookupFailed ||
            [error code] == NSURLErrorNotConnectedToInternet ||
            [error code] == NSURLErrorNetworkConnectionLost) {

            self.failedURL = [NSURL URLWithString:[error.userInfo objectForKey:@"NSErrorFailingURLStringKey"]];

            if (self.enableOfflineSupport) {
                [self.offlineView setHidden:NO];
            }
        }
    }
}

- (BOOL) shouldOverrideLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSURL* url = [request URL];
    CDVViewController* cdvViewController = (CDVViewController*)self.viewController;
    
    if (cdvViewController != nil) {
        if (cdvViewController.whitelist != nil) {
            if ([cdvViewController.whitelist schemeIsAllowed:[url scheme]]) {
                if (![cdvViewController.whitelist URLIsAllowed:url]) {
                    if ([[UIApplication sharedApplication] canOpenURL:url]) {
                        [[UIApplication sharedApplication] openURL:url]; // opens the URL outside the webview
                        return YES;
                    }
                }
            }
        }
    }
    
    return NO;
}

@end
