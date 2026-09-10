package expo.modules.floatingbubble

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoFloatingBubbleModule : Module() {
  private var isBubbleEnabled = false

  override fun definition() = ModuleDefinition {
    Name("ExpoFloatingBubble")

    // ── Toggle bubble enabled state (used to decide whether to start service on background) ──
    Function("enableBubble") { enabled: Boolean ->
      isBubbleEnabled = enabled
      return@Function null
    }

    // ── Permission helpers ────────────────────────────────────────────────────
    Function("checkPermission") { ->
      val context = appContext.reactContext ?: return@Function false
      return@Function Settings.canDrawOverlays(context)
    }

    Function("requestPermission") { ->
      val context = appContext.reactContext ?: return@Function null
      if (!Settings.canDrawOverlays(context)) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        context.startActivity(intent)
      }
      return@Function null
    }

    // ── Bubble show / hide ────────────────────────────────────────────────────
    Function("showBubble") { ->
      val context = appContext.reactContext ?: return@Function null
      if (Settings.canDrawOverlays(context)) {
        context.startService(Intent(context, FloatingBubbleService::class.java))
      }
      return@Function null
    }

    Function("hideBubble") { ->
      val context = appContext.reactContext ?: return@Function null
      context.stopService(Intent(context, FloatingBubbleService::class.java))
      return@Function null
    }

    // ── Badge & message ───────────────────────────────────────────────────────
    Function("setBadge") { count: Int ->
      val context = appContext.reactContext ?: return@Function null
      context.sendBroadcast(Intent("${context.packageName}.UPDATE_BUBBLE_BADGE").apply {
        putExtra("count", count)
        setPackage(context.packageName)
      })
      return@Function null
    }

    Function("showMessage") { message: String ->
      val context = appContext.reactContext ?: return@Function null
      context.sendBroadcast(Intent("${context.packageName}.UPDATE_BUBBLE_MESSAGE").apply {
        putExtra("message", message)
        setPackage(context.packageName)
      })
      return@Function null
    }

    // ── Order Card overlay ────────────────────────────────────────────────────

    /**
     * showOrderCard — displays a native order card on top of any app.
     *
     * @param params  Map with keys: customerName, price, serviceType, address, distance, orderId
     *
     * The FloatingBubbleService must already be running (i.e. the app is in the background
     * and the user has granted the "Draw over other apps" permission).
     */
    Function("showOrderCard") { params: Map<String, String> ->
      val context = appContext.reactContext ?: return@Function null
      context.sendBroadcast(Intent("${context.packageName}.SHOW_ORDER_CARD").apply {
        putExtra("customerName", params["customerName"] ?: "")
        putExtra("price",        params["price"]        ?: "0")
        putExtra("serviceType",  params["serviceType"]  ?: "")
        putExtra("address",      params["address"]      ?: "")
        putExtra("distance",     params["distance"]     ?: "")
        putExtra("orderId",      params["orderId"]      ?: "")
        putExtra("quantity",     params["quantity"]     ?: "")
        setPackage(context.packageName)
      })
      return@Function null
    }

    /**
     * hideOrderCard — programmatically dismisses the order card if it is visible.
     */
    Function("hideOrderCard") { ->
      val context = appContext.reactContext ?: return@Function null
      context.sendBroadcast(Intent("${context.packageName}.HIDE_ORDER_CARD").apply {
        setPackage(context.packageName)
      })
      return@Function null
    }

    /**
     * showLockScreenCard — fires a Full-Screen Intent notification that shows
     * LockScreenOrderActivity above the keyguard (works even when screen is off).
     */
    Function("showLockScreenCard") { params: Map<String, String> ->
      val context = appContext.reactContext ?: return@Function null
      context.sendBroadcast(Intent("${context.packageName}.SHOW_LOCK_SCREEN_CARD").apply {
        putExtra("customerName", params["customerName"] ?: "")
        putExtra("price",        params["price"]        ?: "0")
        putExtra("serviceType",  params["serviceType"]  ?: "")
        putExtra("address",      params["address"]      ?: "")
        putExtra("distance",     params["distance"]     ?: "")
        putExtra("orderId",      params["orderId"]      ?: "")
        putExtra("quantity",     params["quantity"]     ?: "")
        setPackage(context.packageName)
      })
      return@Function null
    }

    // ── App lifecycle hooks ───────────────────────────────────────────────────

    OnActivityEntersBackground {
      val context = appContext.reactContext
      if (context != null && isBubbleEnabled && Settings.canDrawOverlays(context)) {
        context.startService(Intent(context, FloatingBubbleService::class.java))
      }
    }

    OnActivityEntersForeground {
      val context = appContext.reactContext
      if (context != null) {
        // Hide any visible order card before stopping the service
        context.sendBroadcast(Intent("${context.packageName}.HIDE_ORDER_CARD").apply {
          setPackage(context.packageName)
        })
        context.stopService(Intent(context, FloatingBubbleService::class.java))
      }
    }
  }
}
