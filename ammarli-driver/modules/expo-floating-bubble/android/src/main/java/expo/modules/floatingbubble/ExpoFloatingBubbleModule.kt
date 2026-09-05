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

    Function("enableBubble") { enabled: Boolean ->
      isBubbleEnabled = enabled
      return@Function null
    }

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
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
      return@Function null
    }

    Function("showBubble") { ->
      val context = appContext.reactContext ?: return@Function null
      if (Settings.canDrawOverlays(context)) {
        val intent = Intent(context, FloatingBubbleService::class.java)
        context.startService(intent)
      }
      return@Function null
    }

    Function("hideBubble") { ->
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(context, FloatingBubbleService::class.java)
      context.stopService(intent)
      return@Function null
    }

    Function("setBadge") { count: Int ->
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent("${context.packageName}.UPDATE_BUBBLE_BADGE").apply {
        putExtra("count", count)
        setPackage(context.packageName)
      }
      context.sendBroadcast(intent)
      return@Function null
    }

    Function("showMessage") { message: String ->
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent("${context.packageName}.UPDATE_BUBBLE_MESSAGE").apply {
        putExtra("message", message)
        setPackage(context.packageName)
      }
      context.sendBroadcast(intent)
      return@Function null
    }

    OnActivityEntersBackground {
      val context = appContext.reactContext
      if (context != null && isBubbleEnabled && Settings.canDrawOverlays(context)) {
        val intent = Intent(context, FloatingBubbleService::class.java)
        context.startService(intent)
      }
    }

    OnActivityEntersForeground {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, FloatingBubbleService::class.java)
        context.stopService(intent)
      }
    }
  }
}
