package com.jorge.xsiguiendo;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {

    private static final int FILE_REQUEST = 1;
    private WebView web;
    private String script = "";
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        script = loadAsset("nofy.js");

        web = new WebView(this);

        // Contenedor que deja hueco para la barra de estado, la de navegación,
        // la cámara frontal y el teclado, para que nada quede tapado.
        final android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(android.graphics.Color.BLACK);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener(new android.view.View.OnApplyWindowInsetsListener() {
            @Override
            public android.view.WindowInsets onApplyWindowInsets(android.view.View v, android.view.WindowInsets insets) {
                int l, t, r, b;
                if (android.os.Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets bars = insets.getInsets(
                            android.view.WindowInsets.Type.systemBars()
                            | android.view.WindowInsets.Type.displayCutout());
                    android.graphics.Insets ime = insets.getInsets(android.view.WindowInsets.Type.ime());
                    l = bars.left; t = bars.top; r = bars.right; b = Math.max(bars.bottom, ime.bottom);
                } else {
                    l = insets.getSystemWindowInsetLeft();
                    t = insets.getSystemWindowInsetTop();
                    r = insets.getSystemWindowInsetRight();
                    b = insets.getSystemWindowInsetBottom();
                }
                v.setPadding(l, t, r, b);
                // Ya aplicados aquí: la web no debe sumarlos otra vez.
                return android.os.Build.VERSION.SDK_INT >= 30
                        ? android.view.WindowInsets.CONSUMED
                        : insets.consumeSystemWindowInsets();
            }
        });
        // Mismo comportamiento en todas las versiones de Android.
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            root.setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        setContentView(root);
        getWindow().setStatusBarColor(android.graphics.Color.BLACK);
        getWindow().setNavigationBarColor(android.graphics.Color.BLACK);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // Quita la marca de WebView para que X sirva su web móvil normal.
        s.setUserAgentString(s.getUserAgentString().replace("; wv", ""));

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                if (host.equals("x.com") || host.endsWith(".x.com")
                        || host.equals("twitter.com") || host.endsWith(".twitter.com")
                        || host.endsWith("twimg.com")) {
                    return false; // se queda dentro de la app
                }
                // Enlaces externos: al navegador del móvil.
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) { inject(); }

            @Override
            public void onPageFinished(WebView view, String url) { inject(); }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) { inject(); }

            // Permite adjuntar fotos y vídeos a los posts.
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_REQUEST);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("https://x.com/home");
    }

    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable reinject = new Runnable() {
        @Override public void run() {
            inject(); // el propio script evita duplicarse
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onResume() {
        super.onResume();
        handler.post(reinject);
    }

    @Override
    protected void onStop() {
        super.onStop();
        handler.removeCallbacks(reinject);
    }

    private void inject() {
        if (web != null && !script.isEmpty()) web.evaluateJavascript(script, null);
    }

    private String loadAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush(); // guarda la sesión iniciada
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
