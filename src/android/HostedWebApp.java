package com.microsoft.hostedwebapp;

import android.app.Activity;
import android.content.res.AssetManager;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.LinearLayout;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;

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
    private static final String OFFLINE_PAGE = "offline.html";
    private static final String OFFLINE_PAGE_TEMPLATE = "<html><body><div style=\"top:50%%;text-align:center;position:absolute\">%s</div></body></html>";

    private JSONObject manifestObject;

    private Activity activity;
    private WebView offlineWebView;
    private LinearLayout rootLayout;

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        this.activity = cordova.getActivity();
        if (this.rootLayout == null) {
            this.rootLayout = this.createOfflineRootLayout();
            this.activity.addContentView(this.rootLayout, this.rootLayout.getLayoutParams());
        }

        if (this.offlineWebView == null) {
            this.offlineWebView = this.createOfflineWebView();
            this.rootLayout.addView(this.offlineWebView);
        }

        if (this.assetExists(this.OFFLINE_PAGE)) {
            this.offlineWebView.loadUrl("file:///android_asset/www/" + this.OFFLINE_PAGE);
        } else {
            this.offlineWebView.loadData(
                    String.format(this.OFFLINE_PAGE_TEMPLATE, "It looks like you are offline. Please reconnect to use this application."),
                    "text/html",
                    null);
        }
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        switch (action) {
            case "load":
                AssetManager assetManager = cordova.getActivity().getResources().getAssets();
                try {
                    String configFilename = args.getString(0);
                    InputStream inputStream = assetManager.open("www/" + configFilename);
                    int size = inputStream.available();
                    byte[] bytes = new byte[size];
                    inputStream.read(bytes);
                    inputStream.close();
                    String jsonString = new String(bytes, "UTF-8");
                    callbackContext.success(jsonString);
                } catch (IOException e) {
                    callbackContext.error(e.getMessage());
                }
                break;
            case "initialize":
                this.manifestObject = args.getJSONObject(0);
                break;
            case "showOfflineOverlay":
                this.showOfflineOverlay();
                break;
            case "hideOfflineOverlay":
                this.hideOfflineOverlay();
                break;
            default:
                return false;
        }

        return true;
    }

    @Override
    public Object onMessage(String id, Object data) {
        if (id == "networkconnection" && data != null) {
            handleNetworkConnectionChange(data.toString());
        }
        return null;
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
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
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
        if (info == "none") {
            this.showOfflineOverlay();
        } else {
            this.hideOfflineOverlay();
        }
    }

    private void showOfflineOverlay() {
        this.activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                rootLayout.setVisibility(View.VISIBLE);
            }
        });
    }

    private void hideOfflineOverlay() {
        this.activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                rootLayout.setVisibility(View.INVISIBLE);
            }
        });
    }

}
