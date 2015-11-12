package com.manifoldjs.hostedwebapp;

import android.content.Intent;
import android.net.Uri;
import android.content.res.AssetManager;
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
import org.apache.cordova.Whitelist;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
                this.onManifestLoaded();
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
                                me.onManifestLoaded();
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

		if (action.equals("injectPluginScript")) {
			final List<String> scripts = new ArrayList<String>();
			scripts.add(args.getString(0));

            cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        injectScripts(scripts);
                        callbackContext.success(1);
                    } catch (IOException e) {
                        callbackContext.error("Failed to inject script.");
                    }
                }
            });

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

            this.injectCordovaScripts();
        }

        return null;
    }

    @Override
    public Boolean shouldAllowRequest(String url) {
        CordovaPlugin whiteListPlugin = this.getWhitelistPlugin();

        if (whiteListPlugin != null && Boolean.TRUE != whiteListPlugin.shouldAllowRequest(url))

        {
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

    private void injectCordovaScripts() {
        JSONObject cordovaSettings = this.manifestObject.optJSONObject("mjs_cordova");

        // Inject cordova scripts if configured
        try {
            if (cordovaSettings != null) {
                String pluginMode = cordovaSettings.optString("pluginMode", "client");

                if (!pluginMode.equals("none")) {
                    String cordovaBaseUrl = cordovaSettings.optString("baseUrl", "").trim();
                    if (!cordovaBaseUrl.endsWith("/")) {
                        cordovaBaseUrl += "/";
                    }

                    this.webView.getEngine().loadUrl("javascript: window.hostedWebApp = { 'platform': 'android', 'pluginMode': '" + pluginMode + "', 'cordovaBaseUrl': '" + cordovaBaseUrl + "'};", false);

                    List<String> scriptList = new ArrayList<String>();
                    if (pluginMode.equals("client")) {
                        scriptList.add("cordova.js");
                    }

                    scriptList.add("hostedapp-bridge.js");
                    injectScripts(scriptList);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        // Inject custom scripts
        try {
            JSONArray customScripts = this.manifestObject.optJSONArray("mjs_custom_scripts");

            if (customScripts != null && customScripts.length() > 0) {
				List<String> scriptList = new ArrayList<String>();
                for (int i = 0; i < customScripts.length(); i++) {
                    JSONObject item = customScripts.optJSONObject(i);
                    if (item != null) {
                        String source = item.getString("source");
                        if (source != null) {

                            // ensure script applies to current platform
                            String platform = item.optString("platform");
                            if (platform != null) {
                                boolean found = false;
                                String[] platforms = platform.split(";");
                                for (String p : platforms) {
                                    found = found || p.trim().equals("android");
                                }

                                if (!found) {
                                    continue;
                                }
                            }

                            // ensure script applies to current page
                            Whitelist matchRules = null;
                            JSONArray matchPatterns = item.optJSONArray("match");
                            if (matchPatterns == null) {
                                matchPatterns = new JSONArray();
                                String matchPattern = item.optString("match");
                                if (matchPattern != null) {
                                    matchPatterns.put(matchPattern);
                                }
                            }

                            for (int j = 0; j < matchPatterns.length(); j++) {
                                String matchPattern = matchPatterns.optString(j);
                                if (matchPattern != null) {
                                    matchRules = (matchRules == null) ? new Whitelist() : matchRules;
                                    matchRules.addWhiteListEntry(matchPattern, false);
                                }
                            }

                            if (matchRules != null && !matchRules.isUrlWhiteListed(this.webView.getUrl())) {
                                continue;
                            }

                            scriptList.add(source);
                        }
                    }
                }

				injectScripts(scriptList);
            }
        }
        catch(JSONException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void onManifestLoaded() {
        this.webView.postMessage("hostedWebApp_manifestLoaded", this.manifestObject);
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

	private void injectScripts(List<String> files) throws IOException {
        String script = "";
        for( int i = 0; i < files.size(); i++) {
            String fileName = files.get(i);
            Log.w(LOG_TAG, String.format("Injecting script: '%s'", fileName));
            InputStream inputStream = this.activity.getResources().getAssets().open("www/" + fileName);
            int size = inputStream.available();
            byte[] bytes = new byte[size];
            inputStream.read(bytes);
            inputStream.close();
            String content = new String(bytes, "UTF-8");
            script += "\r\n//# sourceURL=" + fileName + "\r\n" + content;
        }

        this.webView.getEngine().loadUrl("javascript:" + Uri.encode(script), false);
    }
}
