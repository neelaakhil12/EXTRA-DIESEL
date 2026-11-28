const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withMainActivity,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');

const FLOATING_OVERLAY_PACKAGE_KT = `package com.extradiesel.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FloatingOverlayPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(FloatingOverlayModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

const FLOATING_OVERLAY_MODULE_KT = `package com.extradiesel.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FloatingOverlayModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FloatingOverlay"

  @ReactMethod
  fun hasPermission(promise: Promise) {
    try {
      val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(reactApplicationContext)
      } else {
        true
      }
      promise.resolve(granted)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(reactApplicationContext)
      ) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + reactApplicationContext.packageName)
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun show(orderJson: String) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(reactApplicationContext)
      ) {
        return
      }
      val intent = Intent(reactApplicationContext, FloatingOverlayService::class.java)
      intent.action = FloatingOverlayService.ACTION_SHOW
      intent.putExtra(FloatingOverlayService.EXTRA_ORDER_JSON, orderJson)
      reactApplicationContext.startService(intent)
    } catch (e: Exception) {}
  }

  @ReactMethod
  fun update(orderJson: String) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(reactApplicationContext)
      ) {
        return
      }
      val intent = Intent(reactApplicationContext, FloatingOverlayService::class.java)
      intent.action = FloatingOverlayService.ACTION_UPDATE
      intent.putExtra(FloatingOverlayService.EXTRA_ORDER_JSON, orderJson)
      reactApplicationContext.startService(intent)
    } catch (e: Exception) {}
  }

  @ReactMethod
  fun hide() {
    try {
      val intent = Intent(reactApplicationContext, FloatingOverlayService::class.java)
      reactApplicationContext.stopService(intent)
    } catch (e: Exception) {}
  }
}
`;

const FLOATING_OVERLAY_SERVICE_KT = `package com.extradiesel.app

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class FloatingOverlayService : Service() {

  companion object {
    const val ACTION_SHOW = "com.extradiesel.app.OVERLAY_SHOW"
    const val ACTION_UPDATE = "com.extradiesel.app.OVERLAY_UPDATE"
    const val EXTRA_ORDER_JSON = "orderJson"
  }

  private var windowManager: WindowManager? = null
  private var overlayView: View? = null
  private var layoutParams: WindowManager.LayoutParams? = null

  private var orderId: String = ""
  private var customerName: String = "Customer"
  private var orderStatus: String = "out_for_delivery"
  private var etaMins: String = "2"
  private var distanceKm: String = "0.8"
  private var baseUrl: String = "https://extradiesel.in"

  private var titleView: TextView? = null
  private var statusView: TextView? = null
  private var subView: TextView? = null
  private var actionBtn: TextView? = null
  private var dotView: View? = null

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val jsonStr = intent?.getStringExtra(EXTRA_ORDER_JSON)
    if (!jsonStr.isNullOrEmpty()) {
      parseOrder(jsonStr)
    }

    if (overlayView == null) {
      createOverlayView()
    } else {
      refreshUi()
    }
    return START_NOT_STICKY
  }

  private fun parseOrder(jsonStr: String) {
    try {
      val obj = JSONObject(jsonStr)
      orderId = obj.optString("id", orderId)
      customerName = obj.optString("name", customerName)
      orderStatus = obj.optString("status", orderStatus)
      etaMins = obj.optString("etaMins", etaMins)
      distanceKm = obj.optString("distanceKm", distanceKm)
      val url = obj.optString("baseUrl", "")
      if (url.isNotEmpty()) baseUrl = url
    } catch (e: Exception) {}
  }

  private fun createOverlayView() {
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

    val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

    layoutParams = WindowManager.LayoutParams(
      dp(266),
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.BOTTOM or Gravity.END
      x = dp(12)
      y = dp(96)
    }

    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(12), dp(9), dp(12), dp(11))
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#EA0F172A"))
        cornerRadius = dp(18).toFloat()
        setStroke(dp(1), Color.parseColor("#B3D50000"))
      }
      elevation = dp(14).toFloat()
    }

    // Header Row: Dot + Captain App • LIVE GPS + Close button
    val headerRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, 0, 0, dp(6))
    }

    dotView = View(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(8), dp(8)).apply {
        marginEnd = dp(6)
      }
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#EF4444"))
      }
    }

    val appLabel = TextView(this).apply {
      text = "Captain App"
      setTextColor(Color.WHITE)
      textSize = 12f
      setTypeface(null, Typeface.BOLD)
    }

    val gpsTag = TextView(this).apply {
      text = "  • LIVE GPS"
      setTextColor(Color.parseColor("#F87171"))
      textSize = 10f
      setTypeface(null, Typeface.BOLD)
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }

    val closeBtn = TextView(this).apply {
      text = "✕"
      setTextColor(Color.parseColor("#94A3B8"))
      textSize = 14f
      setTypeface(null, Typeface.BOLD)
      setPadding(dp(8), dp(2), dp(4), dp(2))
      setOnClickListener {
        stopSelf()
      }
    }

    headerRow.addView(dotView)
    headerRow.addView(appLabel)
    headerRow.addView(gpsTag)
    headerRow.addView(closeBtn)
    card.addView(headerRow)

    // Subtle Divider
    val divider = View(this).apply {
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)).apply {
        bottomMargin = dp(7)
      }
      setBackgroundColor(Color.parseColor("#1FFFFFFF"))
    }
    card.addView(divider)

    // Body Row: Order Info (left) + Action Pill Button (right)
    val bodyRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }

    val infoCol = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
        marginEnd = dp(8)
      }
      setOnClickListener {
        bringAppToForeground()
      }
    }

    titleView = TextView(this).apply {
      setTextColor(Color.WHITE)
      textSize = 12.5f
      setTypeface(null, Typeface.BOLD)
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
    }

    statusView = TextView(this).apply {
      textSize = 11f
      setTypeface(null, Typeface.BOLD)
      maxLines = 1
      setPadding(0, dp(2), 0, 0)
    }

    subView = TextView(this).apply {
      setTextColor(Color.parseColor("#CBD5E1"))
      textSize = 10f
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
    }

    infoCol.addView(titleView)
    infoCol.addView(statusView)
    infoCol.addView(subView)

    actionBtn = TextView(this).apply {
      setTextColor(Color.WHITE)
      textSize = 11.5f
      setTypeface(null, Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(dp(14), dp(8), dp(14), dp(8))
      setOnClickListener {
        onActionPressed()
      }
    }

    bodyRow.addView(infoCol)
    bodyRow.addView(actionBtn)
    card.addView(bodyRow)

    // Make card draggable
    var initialX = 0
    var initialY = 0
    var initialTouchX = 0f
    var initialTouchY = 0f
    var isDragging = false

    card.setOnTouchListener { _, event ->
      val lp = layoutParams ?: return@setOnTouchListener false
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = lp.x
          initialY = lp.y
          initialTouchX = event.rawX
          initialTouchY = event.rawY
          isDragging = false
          false
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (initialTouchX - event.rawX).toInt()
          val dy = (initialTouchY - event.rawY).toInt()
          if (kotlin.math.abs(dx) > 10 || kotlin.math.abs(dy) > 10) {
            isDragging = true
            lp.x = initialX + dx
            lp.y = initialY + dy
            try {
              windowManager?.updateViewLayout(overlayView, lp)
            } catch (e: Exception) {}
            true
          } else {
            false
          }
        }
        MotionEvent.ACTION_UP -> isDragging
        else -> false
      }
    }

    overlayView = card
    refreshUi()

    try {
      windowManager?.addView(overlayView, layoutParams)
    } catch (e: Exception) {
      stopSelf()
    }
  }

  private fun refreshUi() {
    val shortId = if (orderId.length > 8) orderId.takeLast(6) else orderId
    titleView?.text = if (shortId.isNotEmpty()) "$customerName - #$shortId" else customerName

    if (orderStatus == "arrived") {
      dotView?.background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#22C55E"))
      }
      statusView?.text = "✓ Arrived at Location"
      statusView?.setTextColor(Color.parseColor("#4ADE80"))
      subView?.text = "• Awaiting Customer"
      actionBtn?.text = "✓ REACHED"
      actionBtn?.background = GradientDrawable().apply {
        setColor(Color.parseColor("#16A34A"))
        cornerRadius = dp(20).toFloat()
      }
    } else {
      dotView?.background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#EF4444"))
      }
      statusView?.text = "Arriving Soon"
      statusView?.setTextColor(Color.parseColor("#F87171"))
      subView?.text = "ETA $etaMins mins away | $distanceKm km"
      actionBtn?.text = "ARRIVED"
      actionBtn?.background = GradientDrawable().apply {
        setColor(Color.parseColor("#D50000"))
        cornerRadius = dp(20).toFloat()
      }
    }
  }

  private fun onActionPressed() {
    if (orderStatus == "arrived") {
      bringAppToForeground()
    } else {
      orderStatus = "arrived"
      refreshUi()
      sendArrivedStatusToBackend()
    }
  }

  private fun sendArrivedStatusToBackend() {
    if (orderId.isEmpty()) return
    Thread {
      try {
        val url = URL("$baseUrl/api/orders/$orderId/status")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "PATCH"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 8000
        conn.readTimeout = 8000

        val payload = JSONObject().apply {
          put("status", "arrived")
          put("statusText", "Captain Arrived at Site (Ready to Dispense)")
        }

        OutputStreamWriter(conn.outputStream).use { writer ->
          writer.write(payload.toString())
          writer.flush()
        }
        conn.responseCode
        conn.disconnect()
      } catch (e: Exception) {}
    }.start()
  }

  private fun bringAppToForeground() {
    try {
      val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      if (launchIntent != null) {
        launchIntent.addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        )
        startActivity(launchIntent)
      }
      stopSelf()
    } catch (e: Exception) {}
  }

  override fun onDestroy() {
    super.onDestroy()
    try {
      if (overlayView != null) {
        windowManager?.removeView(overlayView)
        overlayView = null
      }
    } catch (e: Exception) {}
  }
}
`;

const withCleartextTraffic = (config) => {
  // 1. Android Manifest: Cleartext Traffic + FloatingOverlayService (NO PiP app-preview)
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (androidManifest?.manifest?.application?.[0]) {
      const mainApplication = androidManifest.manifest.application[0];
      mainApplication.$ = mainApplication.$ || {};
      mainApplication.$['android:usesCleartextTraffic'] = 'true';

      if (Array.isArray(mainApplication.activity)) {
        const mainActivity = mainApplication.activity.find(
          (a) => a.$ && a.$['android:name'] === '.MainActivity'
        );
        if (mainActivity && mainActivity.$) {
          delete mainActivity.$['android:supportsPictureInPicture'];
        }
      }

      mainApplication.service = mainApplication.service || [];
      const hasOverlayService = mainApplication.service.some(
        (s) => s.$ && s.$['android:name'] === '.FloatingOverlayService'
      );
      if (!hasOverlayService) {
        mainApplication.service.push({
          $: {
            'android:name': '.FloatingOverlayService',
            'android:enabled': 'true',
            'android:exported': 'false',
          },
        });
      }
    }
    return config;
  });

  // 2. MainActivity: keep clean without PiP app-preview callbacks
  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('Automatically trigger native Android Picture-in-Picture')) {
      const startIdx = contents.indexOf('/**\n   * Automatically trigger native Android Picture-in-Picture');
      const invokeIdx = contents.indexOf('/**\n    * Align the back button behavior');
      if (startIdx !== -1 && invokeIdx !== -1 && invokeIdx > startIdx) {
        contents = contents.slice(0, startIdx) + contents.slice(invokeIdx);
      }
    }
    config.modResults.contents = contents;
    return config;
  });

  // 3. MainApplication: register FloatingOverlayPackage()
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('FloatingOverlayPackage')) {
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n          add(FloatingOverlayPackage())'
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  // 4. Write native Kotlin files for FloatingOverlayService, Module, Package
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'extradiesel',
        'app'
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(path.join(javaDir, 'FloatingOverlayPackage.kt'), FLOATING_OVERLAY_PACKAGE_KT);
      fs.writeFileSync(path.join(javaDir, 'FloatingOverlayModule.kt'), FLOATING_OVERLAY_MODULE_KT);
      fs.writeFileSync(path.join(javaDir, 'FloatingOverlayService.kt'), FLOATING_OVERLAY_SERVICE_KT);
      return config;
    },
  ]);

  return config;
};

module.exports = withCleartextTraffic;
