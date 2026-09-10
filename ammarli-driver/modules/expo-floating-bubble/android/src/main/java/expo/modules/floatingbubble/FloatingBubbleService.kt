package expo.modules.floatingbubble

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
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

    // ── Bubble views ─────────────────────────────────────────────────────────
    private lateinit var windowManager: WindowManager
    private lateinit var masterRoot: LinearLayout
    private lateinit var bubbleContainer: FrameLayout
    private lateinit var bubbleView: ImageView
    private lateinit var badgeView: TextView
    private lateinit var messageFlyoutView: TextView
    private lateinit var layoutParams: WindowManager.LayoutParams

    // ── Order Card views ─────────────────────────────────────────────────────
    private var orderCardView: LinearLayout? = null
    private var orderCardLayoutParams: WindowManager.LayoutParams? = null

    private val uiHandler = Handler(Looper.getMainLooper())

    // ── Auto-dismiss runnable (after 30 s) ───────────────────────────────────
    private val autoDismissRunnable = Runnable { hideOrderCardView() }

    // ── Message flyout hide runnable ─────────────────────────────────────────
    private val hideMessageRunnable = Runnable {
        if (::messageFlyoutView.isInitialized && ::masterRoot.isInitialized) {
            messageFlyoutView.visibility = View.GONE
            try { windowManager.updateViewLayout(masterRoot, layoutParams) } catch (_: Exception) {}
        }
    }

    // ── Broadcast receiver ───────────────────────────────────────────────────
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
                        try { windowManager.updateViewLayout(masterRoot, layoutParams) } catch (_: Exception) {}
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
                        try { windowManager.updateViewLayout(masterRoot, layoutParams) } catch (_: Exception) {}
                    }

                    "${packageName}.SHOW_ORDER_CARD" -> {
                        val customerName = intent.getStringExtra("customerName") ?: "زبون جديد"
                        val price       = intent.getStringExtra("price")        ?: "0"
                        val serviceType = intent.getStringExtra("serviceType")  ?: "خدمة مياه"
                        val address     = intent.getStringExtra("address")      ?: ""
                        val distance    = intent.getStringExtra("distance")     ?: ""
                        val orderId     = intent.getStringExtra("orderId")      ?: ""
                        val quantity    = intent.getStringExtra("quantity")     ?: ""
                        showOrderCard(customerName, price, serviceType, address, distance, orderId, quantity)
                    }

                    "${packageName}.SHOW_LOCK_SCREEN_CARD" -> {
                        val customerName = intent.getStringExtra("customerName") ?: "زبون جديد"
                        val price       = intent.getStringExtra("price")        ?: "0"
                        val serviceType = intent.getStringExtra("serviceType")  ?: "خدمة مياه"
                        val address     = intent.getStringExtra("address")      ?: ""
                        val distance    = intent.getStringExtra("distance")     ?: ""
                        val orderId     = intent.getStringExtra("orderId")      ?: ""
                        val quantity    = intent.getStringExtra("quantity")     ?: ""
                        showLockScreenCard(customerName, price, serviceType, address, distance, orderId, quantity)
                    }

                    "${packageName}.HIDE_ORDER_CARD" -> {
                        hideOrderCardView()
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val density      = resources.displayMetrics.density
        val sizeInPx     = (60 * density).toInt().coerceAtLeast(150)
        val padding10dp  = (10 * density).toInt()
        val maxWidth200dp = (200 * density).toInt()

        // ── Master horizontal container (flyout + bubble) ─────────────────
        masterRoot = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
            clipChildren  = false
            clipToPadding = false
        }

        // ── Flyout preview message ─────────────────────────────────────────
        messageFlyoutView = TextView(this).apply {
            val flyoutBg = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 14 * density
                setColor(Color.parseColor("#F3F4F6"))
                setStroke((1 * density).toInt().coerceAtLeast(1), Color.parseColor("#E5E7EB"))
            }
            background = flyoutBg
            setTextColor(Color.parseColor("#1F2937"))
            textSize  = 12f
            typeface  = Typeface.DEFAULT_BOLD
            setPadding(padding10dp, padding10dp, padding10dp, padding10dp)
            maxWidth  = maxWidth200dp
            visibility = View.GONE
            elevation  = 10f
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
        ).apply { marginEnd = (8 * density).toInt() }
        masterRoot.addView(messageFlyoutView, flyoutParams)

        // ── Bubble container ───────────────────────────────────────────────
        bubbleContainer = FrameLayout(this).apply {
            clipChildren  = false
            clipToPadding = false
        }

        // Circular app icon
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
            elevation     = 16f
            scaleType     = ImageView.ScaleType.CENTER_CROP
            try { setImageDrawable(packageManager.getApplicationIcon(packageName)) } catch (_: Exception) {}
            foreground = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                setStroke((2 * density).toInt().coerceAtLeast(2), Color.WHITE)
            }
        }

        bubbleContainer.addView(
            bubbleView,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        )

        // Badge (red circle)
        val badgeSize = (20 * density).toInt().coerceAtLeast(40)
        badgeView = TextView(this).apply {
            val badgeShape = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#EF4444"))
                setStroke((1.5f * density).toInt().coerceAtLeast(1), Color.WHITE)
            }
            background = badgeShape
            setTextColor(Color.WHITE)
            typeface   = Typeface.DEFAULT_BOLD
            gravity    = Gravity.CENTER
            textSize   = 11f
            minWidth   = badgeSize
            minHeight  = badgeSize
            val pad = (4 * density).toInt()
            setPadding(pad, 0, pad, 0)
            visibility = View.GONE
        }

        bubbleContainer.addView(
            badgeView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.TOP or Gravity.END }
        )

        masterRoot.addView(bubbleContainer, LinearLayout.LayoutParams(sizeInPx, sizeInPx))

        // ── Window params for the bubble ───────────────────────────────────
        val type = overlayWindowType()
        layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0; y = 300
        }

        // ── Drag / click on the bubble ─────────────────────────────────────
        bubbleContainer.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0; private var initialY = 0
            private var initialTouchX = 0f; private var initialTouchY = 0f
            private var isDragging = false

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = layoutParams.x; initialY = layoutParams.y
                        initialTouchX = event.rawX; initialTouchY = event.rawY
                        isDragging = false; return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = event.rawX - initialTouchX
                        val dy = event.rawY - initialTouchY
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) isDragging = true
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

        // ── Register BroadcastReceiver ─────────────────────────────────────
        val filter = IntentFilter().apply {
            addAction("${packageName}.UPDATE_BUBBLE_BADGE")
            addAction("${packageName}.UPDATE_BUBBLE_MESSAGE")
            addAction("${packageName}.SHOW_ORDER_CARD")
            addAction("${packageName}.HIDE_ORDER_CARD")
            addAction("${packageName}.SHOW_LOCK_SCREEN_CARD") // ← must be here BEFORE registerReceiver
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
        uiHandler.removeCallbacks(autoDismissRunnable)
        try { unregisterReceiver(bubbleReceiver) } catch (_: Exception) {}
        hideOrderCardView()
        if (::masterRoot.isInitialized) {
            try { windowManager.removeView(masterRoot) } catch (_: Exception) {}
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Card — show / hide
    // ─────────────────────────────────────────────────────────────────────────

    private fun playAlertSound() {
        try {
            val soundUri = Uri.parse("android.resource://${packageName}/raw/alert")
            val mp = MediaPlayer()
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            mp.setAudioAttributes(audioAttributes)
            mp.setDataSource(this, soundUri)
            mp.prepare()
            mp.start()
            mp.setOnCompletionListener { it.release() }
        } catch (_: Exception) {}
    }

    private fun showLockScreenCard(
        customerName: String,
        price: String,
        serviceType: String,
        address: String,
        distance: String,
        orderId: String,
        quantity: String = ""
    ) {
        playAlertSound()

        // Build the full-screen intent pointing at LockScreenOrderActivity
        val activityIntent = Intent(this, LockScreenOrderActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(LockScreenOrderActivity.EXTRA_CUSTOMER_NAME, customerName)
            putExtra(LockScreenOrderActivity.EXTRA_PRICE,         price)
            putExtra(LockScreenOrderActivity.EXTRA_SERVICE_TYPE,  serviceType)
            putExtra(LockScreenOrderActivity.EXTRA_ADDRESS,       address)
            putExtra(LockScreenOrderActivity.EXTRA_DISTANCE,      distance)
            putExtra(LockScreenOrderActivity.EXTRA_ORDER_ID,      orderId)
            putExtra(LockScreenOrderActivity.EXTRA_QUANTITY,      quantity)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else PendingIntent.FLAG_UPDATE_CURRENT

        val fullScreenPI = PendingIntent.getActivity(this, orderId.hashCode(), activityIntent, flags)

        // Create notification channel on API 26+
        val channelId = "ammarli_lockscreen_orders"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(
                    channelId,
                    "طلبيات جديدة (شاشة القفل)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description        = "تظهر فوق شاشة القفل عند وصول طلبية"
                    enableVibration(true)
                    vibrationPattern   = longArrayOf(0, 400, 200, 400)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
                nm.createNotificationChannel(channel)
            }
        }

        val notifBuilder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val priceDouble = try { price.toDouble() } catch (_: Exception) { 0.0 }
        val priceText   = if (priceDouble > 0) "${priceDouble.toLong()} د.ج" else "سيُحدد عند القبول"

        val notification = notifBuilder
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔔 طلبية جديدة — $serviceType")
            .setContentText("الزبون: $customerName | $priceText")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPI, true)
            .setAutoCancel(true)
            .setOngoing(false)
            .build()

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(orderId.hashCode(), notification)
    }

    private fun showOrderCard(
        customerName: String,
        price: String,
        serviceType: String,
        address: String,
        distance: String,
        orderId: String,
        quantity: String = ""
    ) {
        hideOrderCardView() // remove any existing card first
        playAlertSound()   // play alert.mp3

        val d          = resources.displayMetrics.density
        val screenW    = resources.displayMetrics.widthPixels
        val cardWidth  = (screenW * 0.90f).toInt()

        // ── Colors ───────────────────────────────────────────────────────
        val colorPrimary   = Color.parseColor("#002147")
        val colorSecondary = Color.parseColor("#F3CD0D")
        val colorSuccess   = Color.parseColor("#22C55E")
        val colorDanger    = Color.parseColor("#EF4444")
        val colorTextSec   = Color.parseColor("#64748B")
        val colorSuccessBg = Color.parseColor("#F0FDF4")
        val colorBorder    = Color.parseColor("#E2E8F0")

        // ── Dimensions ───────────────────────────────────────────────────
        val dp4  = (4  * d).toInt()
        val dp8  = (8  * d).toInt()
        val dp10 = (10 * d).toInt()
        val dp12 = (12 * d).toInt()
        val dp16 = (16 * d).toInt()
        val dp20 = (20 * d).toInt()
        val dp48 = (48 * d).toInt()
        val dp52 = (52 * d).toInt()

        // ── Root card ────────────────────────────────────────────────────
        val card = LinearLayout(this).apply {
            orientation   = LinearLayout.VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            setPadding(dp20, dp20, dp20, dp20)
            elevation = 32f
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 20 * d
                setColor(Color.WHITE)
                setStroke((1 * d).toInt().coerceAtLeast(1), colorBorder)
            }
        }

        // ── Header: truck icon + title ────────────────────────────────────
        val headerRow = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
        }

        // Truck emoji in a blue oval badge
        val iconBadge = TextView(this).apply {
            text      = "🚚"
            textSize  = 22f
            gravity   = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(colorPrimary)
            }
            layoutParams = LinearLayout.LayoutParams(dp48, dp48)
        }

        val titleCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginStart = dp12
            layoutParams = lp
        }
        titleCol.addView(TextView(this).apply {
            text      = "🔔 طلبية جديدة"
            textSize  = 15f
            typeface  = Typeface.DEFAULT_BOLD
            setTextColor(colorPrimary)
            textAlignment = View.TEXT_ALIGNMENT_VIEW_START
        })
        titleCol.addView(TextView(this).apply {
            text      = serviceType
            textSize  = 12f
            setTextColor(colorTextSec)
            textAlignment = View.TEXT_ALIGNMENT_VIEW_START
        })

        headerRow.addView(iconBadge)
        headerRow.addView(titleCol)
        card.addView(headerRow)

        // ── Divider ───────────────────────────────────────────────────────
        card.addView(View(this).apply {
            setBackgroundColor(colorBorder)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (1 * d).toInt().coerceAtLeast(1)
            )
            lp.topMargin    = dp16
            lp.bottomMargin = dp16
            layoutParams = lp
        })

        // ── Info row builder ──────────────────────────────────────────────
        fun infoRow(label: String, value: String) {
            val row = LinearLayout(this).apply {
                orientation     = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity         = Gravity.CENTER_VERTICAL
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                lp.bottomMargin = dp8
                layoutParams = lp
            }
            row.addView(TextView(this).apply {
                text      = label
                textSize  = 13f
                setTextColor(colorTextSec)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            })
            row.addView(TextView(this).apply {
                text      = value
                textSize  = 14f
                typeface  = Typeface.DEFAULT_BOLD
                setTextColor(colorPrimary)
                textAlignment = View.TEXT_ALIGNMENT_VIEW_END
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                lp.marginEnd = dp8
                layoutParams = lp
            })
            card.addView(row)
        }

        infoRow("الزبون:", customerName)
        if (address.isNotEmpty())  infoRow("العنوان:", address)
        if (quantity.isNotEmpty()) infoRow("الكمية:",  quantity)
        if (distance.isNotEmpty()) infoRow("المسافة:", distance)

        // ── Price box ─────────────────────────────────────────────────────
        val priceBox = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
            setPadding(dp12, dp10, dp12, dp10)
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 12 * d
                setColor(colorSuccessBg)
                setStroke((1 * d).toInt().coerceAtLeast(1), colorSuccess)
            }
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.topMargin    = dp8
            lp.bottomMargin = dp16
            layoutParams = lp
        }
        priceBox.addView(TextView(this).apply {
            text      = "المبلغ الإجمالي:"
            textSize  = 13f
            setTextColor(colorTextSec)
        })
        priceBox.addView(TextView(this).apply {
            val priceDouble = try { price.toDouble() } catch (_: Exception) { 0.0 }
            val formatted = if (priceDouble > 0) {
                "${priceDouble.toLong()} د.ج"
            } else {
                "سيُحدد عند القبول"
            }
            text      = formatted
            textSize  = if (priceDouble > 0) 22f else 15f
            typeface  = Typeface.DEFAULT_BOLD
            setTextColor(colorSuccess)
            textAlignment = View.TEXT_ALIGNMENT_VIEW_END
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginEnd = dp8
            layoutParams = lp
        })
        card.addView(priceBox)

        // ── Buttons ───────────────────────────────────────────────────────
        val buttonsRow = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
        }

        // Accept
        buttonsRow.addView(TextView(this).apply {
            text      = "✅  قبول"
            textSize  = 15f
            typeface  = Typeface.DEFAULT_BOLD
            setTextColor(colorPrimary)
            gravity   = Gravity.CENTER
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 12 * d
                setColor(colorSecondary)
            }
            val lp = LinearLayout.LayoutParams(0, dp52, 1f)
            lp.marginEnd = dp8
            layoutParams = lp
            setOnClickListener {
                uiHandler.removeCallbacks(autoDismissRunnable)
                hideOrderCardView()
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                launchIntent?.putExtra("pendingOrderId", orderId)
                launchIntent?.let { startActivity(it) }
            }
        })

        // Decline
        buttonsRow.addView(TextView(this).apply {
            text      = "رفض  ✗"
            textSize  = 15f
            typeface  = Typeface.DEFAULT_BOLD
            setTextColor(colorDanger)
            gravity   = Gravity.CENTER
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 12 * d
                setColor(Color.WHITE)
                setStroke((2 * d).toInt().coerceAtLeast(1), colorDanger)
            }
            layoutParams = LinearLayout.LayoutParams(0, dp52, 1f)
            setOnClickListener {
                uiHandler.removeCallbacks(autoDismissRunnable)
                hideOrderCardView()
                // Notify JS layer so the store can decline the order
                sendBroadcast(Intent("${packageName}.ORDER_CARD_DECLINED").apply {
                    putExtra("orderId", orderId)
                    setPackage(packageName)
                })
            }
        })

        card.addView(buttonsRow)

        // ── Window ────────────────────────────────────────────────────────
        val cardParams = WindowManager.LayoutParams(
            cardWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = (60 * d).toInt()
        }

        orderCardView        = card
        orderCardLayoutParams = cardParams
        windowManager.addView(card, cardParams)

        // Auto-dismiss after 30 seconds (order timeout guard)
        uiHandler.removeCallbacks(autoDismissRunnable)
        uiHandler.postDelayed(autoDismissRunnable, 30_000)
    }

    private fun hideOrderCardView() {
        uiHandler.removeCallbacks(autoDismissRunnable)
        orderCardView?.let {
            try { windowManager.removeView(it) } catch (_: Exception) {}
        }
        orderCardView        = null
        orderCardLayoutParams = null
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private fun overlayWindowType(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
}
