package com.manifoldjs.hostedwebapp;

import android.content.Intent;
import android.net.Uri;
import android.content.res.AssetManager;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaPlugin;

import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

/**
* This class manipulates the Web App W3C manifest.
*/
public class HostedWebApp extends CordovaPlugin {
    private static final String LOG_TAG = "HostedWebApp";
    private static final String DEFAULT_MANIFEST_FILE = "manifest.json";
    private static final String OFFLINE_PAGE = "offline.html";
    private static final String OFFLINE_PAGE_TEMPLATE = "<html><body><div style=\"top:50%%;text-align:center;position:absolute\">%s</div></body></html>";

    private boolean loadingManifest;
    private JSONObject manifestObject;

    private CordovaActivity activity;
    private CordovaPlugin whiteListPlugin;

    private LinearLayout rootLayout;
    private WebView offlineWebView;
    private boolean offlineOverlayEnabled;

    private boolean isConnectionError = false;

    @Override
    public void pluginInitialize() {
        final HostedWebApp me = HostedWebApp.this;
        this.activity = (CordovaActivity)this.cordova.getActivity();

        // Load default manifest file.
        this.loadingManifest = true;
        if (this.assetExists(HostedWebApp.DEFAULT_MANIFEST_FILE)) {
            try {
                this.manifestObject = this.loadLocalManifest(HostedWebApp.DEFAULT_MANIFEST_FILE);
                this.webView.postMessage("hostedWebApp_manifestLoaded", this.manifestObject);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        this.loadingManifest = false;

        // Initialize offline overlay
        this.activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (me.rootLayout == null) {
                    me.rootLayout = me.createOfflineRootLayout();
                    me.activity.addContentView(me.rootLayout, me.rootLayout.getLayoutParams());
                }

                if (me.offlineWebView == null) {
                    me.offlineWebView = me.createOfflineWebView();
                    me.rootLayout.addView(me.offlineWebView);
                }

                if (me.assetExists(HostedWebApp.OFFLINE_PAGE)) {
                    me.offlineWebView.loadUrl("file:///android_asset/www/" + HostedWebApp.OFFLINE_PAGE);
                } else {
                    me.offlineWebView.loadData(
                            String.format(HostedWebApp.OFFLINE_PAGE_TEMPLATE, "It looks like you are offline. Please reconnect to use this application."),
                            "text/html",
                            null);
                }

                me.offlineOverlayEnabled = true;
            }
        });
    }

    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final HostedWebApp me = HostedWebApp.this;
        if (action.equals("getManifest")) {
            if (this.manifestObject != null) {
                callbackContext.success(manifestObject.toString());
            } else {
                callbackContext.error("Manifest not loaded, load a manifest using loadManifest.");
            }

            return true;
        }

        if (action.equals("loadManifest")) {
            if (this.loadingManifest) {
                callbackContext.error("Already loading a manifest");
            } else if (args.length() == 0) {
                callbackContext.error("Manifest file name required");
            } else {
                final String configFilename = args.getString(0);

                this.loadingManifest = true;
                this.cordova.getThreadPool().execute(new Runnable() {
                    @Override
                    public void run() {
                        if (me.assetExists(configFilename)) {
                            try {
                                me.manifestObject = me.loadLocalManifest(configFilename);
                                me.webView.postMessage("hostedWebApp_manifestLoaded", me.manifestObject);
                                callbackContext.success(me.manifestObject);
                            } catch (JSONException e) {
                                callbackContext.error(e.getMessage());
                            }
                        } else {
                            callbackContext.error("Manifest file not found in folder assets/www");
                        }

                        me.loadingManifest = false;
                    }
                });

                PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
                pluginResult.setKeepCallback(true);
                callbackContext.sendPluginResult(pluginResult);
            }

        return true;
    }

        if (action.equals("enableOfflinePage")) {
            this.offlineOverlayEnabled = true;
            return true;
        }

        if (action.equals("disableOfflinePage")) {
            this.offlineOverlayEnabled = false;
            return true;
        }

        return false;
    }

    @Override
    public Object onMessage(String id, Object data) {
        if (id.equals("networkconnection") && data != null) {
            this.handleNetworkConnectionChange(data.toString());
        } else if (id.equals("onPageStarted")) {
            this.isConnectionError = false;
        } else if (id.equals("onReceivedError")) {
            if (data instanceof JSONObject) {
                JSONObject errorData = (JSONObject) data;
                try {
                    int errorCode = errorData.getInt("errorCode");
                    if (404 == errorCode
                            || WebViewClient.ERROR_HOST_LOOKUP == errorCode
                            || WebViewClient.ERROR_CONNECT == errorCode
                            || WebViewClient.ERROR_TIMEOUT == errorCode) {
                        this.isConnectionError = true;
                        this.showOfflineOverlay();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }
        else if (id.equals("onPageFinished")) {
            if (!this.isConnectionError) {
                this.hideOfflineOverlay();
            }
        }
        return null;
    }

    @Override
    public Boolean shouldAllowRequest(String url) {
        CordovaPlugin whiteListPlugin = this.getWhitelistPlugin();

        if (whiteListPlugin != null && Boolean.TRUE != whiteListPlugin.shouldAllowRequest(url)) {
            Log.w(LOG_TAG, String.format("Whitelist rejection: url='%s'", url));
        }

        // do not alter default behavior.
        return super.shouldAllowRequest(url);
    }

    @Override
    public boolean onOverrideUrlLoading(String url) {
        CordovaPlugin whiteListPlugin = this.getWhitelistPlugin();

        if (whiteListPlugin != null && Boolean.TRUE != whiteListPlugin.shouldAllowNavigation(url)) {
            // If the URL is not in the list URLs to allow navigation, open the URL in the external browser
            // (code extracted from CordovaLib/src/org/apache/cordova/CordovaWebViewImpl.java)
            Log.w(LOG_TAG, String.format("Whitelist rejection: url='%s'", url));

            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                Uri uri = Uri.parse(url);
                // Omitting the MIME type for file: URLs causes "No Activity found to handle Intent".
                // Adding the MIME type to http: URLs causes them to not be handled by the downloader.
                if ("file".equals(uri.getScheme())) {
                    intent.setDataAndType(uri, this.webView.getResourceApi().getMimeType(uri));
                } else {
                    intent.setData(uri);
                }
                this.activity.startActivity(intent);
            } catch (android.content.ActivityNotFoundException e) {
                e.printStackTrace();
            }

            return true;
        } else {
            return false;
        }
    }

    public JSONObject getManifest() {
        return this.manifestObject;
    }

    private CordovaPlugin getWhitelistPlugin() {
        if (this.whiteListPlugin == null) {
            this.whiteListPlugin = this.webView.getPluginManager().getPlugin("Whitelist");
        }

        return whiteListPlugin;
    }

    private boolean assetExists(String asset) {
        final AssetManager assetManager = this.activity.getResources().getAssets();
        try {
            return Arrays.asList(assetManager.list("www")).contains(asset);
        } catch (IOException e) {
            e.printStackTrace();
        }

        return false;
    }

    private WebView createOfflineWebView() {
        WebView webView = new WebView(activity);
        webView.getSettings().setJavaScriptEnabled(true);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.HONEYCOMB) {
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }

        webView.setLayoutParams(new LinearLayout.LayoutParams(
                                                 ViewGroup.LayoutParams.MATCH_PARENT,
                                                 ViewGroup.LayoutParams.MATCH_PARENT,
                                                 1.0F));
        return webView;
    }

    private LinearLayout createOfflineRootLayout() {
        LinearLayout root = new LinearLayout(activity.getBaseContext());
        root.setOrientation(LinearLayout.VERTICAL);
        root.setVisibility(View.INVISIBLE);
        root.setLayoutParams(new LinearLayout.LayoutParams(
                                              ViewGroup.LayoutParams.MATCH_PARENT,
                                              ViewGroup.LayoutParams.MATCH_PARENT,
                                              0.0F));
        return root;
    }

    private void handleNetworkConnectionChange(String info) {
        final HostedWebApp me = HostedWebApp.this;
        if (info.equals("none")) {
            this.showOfflineOverlay();
        } else {
            if (this.isConnectionError) {

                this.activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        String currentUrl = me.webView.getUrl();
                        me.webView.loadUrlIntoView(currentUrl, false);
                    }
                });
            } else {
                this.hideOfflineOverlay();
            }
        }
    }

    private void showOfflineOverlay() {
        final HostedWebApp me = HostedWebApp.this;
        if (this.offlineOverlayEnabled) {
            this.activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (me.rootLayout != null) {
                        me.rootLayout.setVisibility(View.VISIBLE);
                }
            }
        });
    }
    }

    private void hideOfflineOverlay() {
        final HostedWebApp me = HostedWebApp.this;
        this.activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (me.rootLayout != null) {
                    me.rootLayout.setVisibility(View.INVISIBLE);
                }
            }
        });
    }

    private JSONObject loadLocalManifest(String manifestFile) throws JSONException {
        try {
            InputStream inputStream = this.activity.getResources().getAssets().open("www/" + manifestFile);
            int size = inputStream.available();
            byte[] bytes = new byte[size];
            inputStream.read(bytes);
            inputStream.close();
            String jsonString = new String(bytes, "UTF-8");
            return new JSONObject(jsonString);
        } catch (IOException e) {
            e.printStackTrace();
        }

        return null;
    }
}
