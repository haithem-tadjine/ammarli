package expo.modules.floatingbubble

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

class FloatingBubbleService : Service() {
    private lateinit var windowManager: WindowManager
    private lateinit var masterRoot: LinearLayout
    private lateinit var bubbleContainer: FrameLayout
    private lateinit var bubbleView: ImageView
    private lateinit var badgeView: TextView
    private lateinit var messageFlyoutView: TextView
    private lateinit var layoutParams: WindowManager.LayoutParams

    private val uiHandler = Handler(Looper.getMainLooper())

    private val hideMessageRunnable = Runnable {
        if (::messageFlyoutView.isInitialized && ::masterRoot.isInitialized) {
            messageFlyoutView.visibility = View.GONE
            try {
                windowManager.updateViewLayout(masterRoot, layoutParams)
            } catch (e: Exception) {
                // Ignore if view is not currently attached
            }
        }
    }

    private val bubbleReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            uiHandler.post {
                if (!::masterRoot.isInitialized) return@post

                when (action) {
                    "${packageName}.UPDATE_BUBBLE_BADGE" -> {
                        val count = intent.getIntExtra("count", 0)
                        if (count > 0) {
                            badgeView.text = if (count > 99) "99+" else count.toString()
                            badgeView.visibility = View.VISIBLE
                        } else {
                            badgeView.visibility = View.GONE
                        }
                    }
                    "${packageName}.UPDATE_BUBBLE_MESSAGE" -> {
                        val message = intent.getStringExtra("message") ?: ""
                        if (message.isNotEmpty()) {
                            messageFlyoutView.text = message
                            messageFlyoutView.visibility = View.VISIBLE
                            uiHandler.removeCallbacks(hideMessageRunnable)
                            uiHandler.postDelayed(hideMessageRunnable, 4000)
                        } else {
                            messageFlyoutView.visibility = View.GONE
                            uiHandler.removeCallbacks(hideMessageRunnable)
                        }
                    }
                }

                try {
                    windowManager.updateViewLayout(masterRoot, layoutParams)
                } catch (e: Exception) {
                    // Ignore if view is not currently attached
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val density = resources.displayMetrics.density
        val sizeInPx = (60 * density).toInt().coerceAtLeast(150)
        val padding10dp = (10 * density).toInt()
        val maxWidth200dp = (200 * density).toInt()

        // Master horizontal container (WRAPS flyout message + bubble)
        masterRoot = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            clipChildren = false
            clipToPadding = false
        }

        // Flyout preview message view
        messageFlyoutView = TextView(this).apply {
            val flyoutBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = 14 * density
                setColor(Color.parseColor("#F3F4F6"))
                setStroke((1 * density).toInt().coerceAtLeast(1), Color.parseColor("#E5E7EB"))
            }
            background = flyoutBg
            setTextColor(Color.parseColor("#1F2937"))
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(padding10dp, padding10dp, padding10dp, padding10dp)
            maxWidth = maxWidth200dp
            visibility = View.GONE
            elevation = 10f

            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                launchIntent?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    startActivity(it)
                }
            }
        }

        val flyoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            marginEnd = (8 * density).toInt()
        }
        masterRoot.addView(messageFlyoutView, flyoutParams)

        // Bubble container (FrameLayout 60dp x 60dp)
        bubbleContainer = FrameLayout(this).apply {
            clipChildren = false
            clipToPadding = false
        }

        // Circular application icon view
        bubbleView = ImageView(this).apply {
            val bgShape = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#001E3C"))
            }
            background = bgShape

            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
            elevation = 16f
            scaleType = ImageView.ScaleType.CENTER_CROP

            try {
                val appIcon = packageManager.getApplicationIcon(packageName)
                setImageDrawable(appIcon)
            } catch (e: Exception) {
                // Fallback to background color
            }

            val borderOverlay = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                val strokeWidth = (2 * density).toInt().coerceAtLeast(2)
                setStroke(strokeWidth, Color.WHITE)
            }
            foreground = borderOverlay
        }

        val bubbleParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        bubbleContainer.addView(bubbleView, bubbleParams)

        // Notification count badge (Red circle, white text, bold font, Top/End gravity)
        val badgeSize = (20 * density).toInt().coerceAtLeast(40)
        badgeView = TextView(this).apply {
            val badgeShape = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#EF4444"))
                setStroke((1.5f * density).toInt().coerceAtLeast(1), Color.WHITE)
            }
            background = badgeShape
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            textSize = 11f
            minWidth = badgeSize
            minHeight = badgeSize
            val pad = (4 * density).toInt()
            setPadding(pad, 0, pad, 0)
            visibility = View.GONE
        }

        val badgeParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
        }
        bubbleContainer.addView(badgeView, badgeParams)

        val containerParams = LinearLayout.LayoutParams(sizeInPx, sizeInPx)
        masterRoot.addView(bubbleContainer, containerParams)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 300
        }

        // OnTouchListener on bubbleContainer so dragging moves the whole masterRoot
        bubbleContainer.setOnTouchListener(object : View.OnTouchListener {
            private var initialX: Int = 0
            private var initialY: Int = 0
            private var initialTouchX: Float = 0f
            private var initialTouchY: Float = 0f
            private var isDragging = false

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = layoutParams.x
                        initialY = layoutParams.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isDragging = false
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = event.rawX - initialTouchX
                        val dy = event.rawY - initialTouchY
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isDragging = true
                        }
                        layoutParams.x = initialX + dx.toInt()
                        layoutParams.y = initialY + dy.toInt()
                        windowManager.updateViewLayout(masterRoot, layoutParams)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (!isDragging) {
                            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                            launchIntent?.let {
                                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                                startActivity(it)
                            }
                        }
                        return true
                    }
                }
                return false
            }
        })

        // Register BroadcastReceiver for badge and message flyout updates
        val filter = IntentFilter().apply {
            addAction("${packageName}.UPDATE_BUBBLE_BADGE")
            addAction("${packageName}.UPDATE_BUBBLE_MESSAGE")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(bubbleReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(bubbleReceiver, filter)
        }

        windowManager.addView(masterRoot, layoutParams)
    }

    override fun onDestroy() {
        super.onDestroy()
        uiHandler.removeCallbacks(hideMessageRunnable)
        try {
            unregisterReceiver(bubbleReceiver)
        } catch (e: Exception) {
            // Receiver might not be registered
        }

        if (::masterRoot.isInitialized) {
            try {
                windowManager.removeView(masterRoot)
            } catch (e: Exception) {
                // View might already be detached
            }
        }
    }
}
