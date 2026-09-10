package expo.modules.floatingbubble

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * LockScreenOrderActivity
 *
 * Displayed via a Full-Screen Intent notification when a new order arrives and
 * the device screen is locked or the app is in the background.
 *
 * Flags used:
 *   - FLAG_SHOW_WHEN_LOCKED  → renders above the keyguard
 *   - FLAG_TURN_SCREEN_ON    → wakes the display
 *   - FLAG_KEEP_SCREEN_ON    → keeps the display on while visible
 *
 * Accept → broadcasts ORDER_CARD_ACCEPTED (same as the floating bubble) and
 *          launches MainActivity so the driver can see order details.
 * Decline → broadcasts ORDER_CARD_DECLINED and finishes.
 *
 * Auto-dismiss after 30 s with animated countdown ring.
 */
class LockScreenOrderActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_CUSTOMER_NAME = "customerName"
        const val EXTRA_PRICE         = "price"
        const val EXTRA_SERVICE_TYPE  = "serviceType"
        const val EXTRA_ADDRESS       = "address"
        const val EXTRA_DISTANCE      = "distance"
        const val EXTRA_ORDER_ID      = "orderId"
        const val EXTRA_QUANTITY      = "quantity"
        const val TIMEOUT_MS          = 30_000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var progressBar: ProgressBar? = null
    private var countdownView: TextView?  = null
    private var remaining = (TIMEOUT_MS / 1000).toInt()

    private val tickRunnable = object : Runnable {
        override fun run() {
            remaining--
            countdownView?.text = remaining.toString()
            progressBar?.progress = remaining * 100 / (TIMEOUT_MS / 1000).toInt()
            if (remaining <= 0) {
                finish()
            } else {
                handler.postDelayed(this, 1_000)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Make the activity visible over the lock screen ──────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            km.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON   or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON   or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // ── Read extras ─────────────────────────────────────────────────────
        val customerName = intent.getStringExtra(EXTRA_CUSTOMER_NAME) ?: "زبون جديد"
        val price        = intent.getStringExtra(EXTRA_PRICE)         ?: "0"
        val serviceType  = intent.getStringExtra(EXTRA_SERVICE_TYPE)  ?: "خدمة مياه"
        val address      = intent.getStringExtra(EXTRA_ADDRESS)       ?: ""
        val distance     = intent.getStringExtra(EXTRA_DISTANCE)      ?: ""
        val orderId      = intent.getStringExtra(EXTRA_ORDER_ID)      ?: ""
        val quantity     = intent.getStringExtra(EXTRA_QUANTITY)      ?: ""

        setContentView(buildUI(customerName, price, serviceType, address, distance, orderId, quantity))

        // ── Start countdown ─────────────────────────────────────────────────
        handler.postDelayed(tickRunnable, 1_000)
    }

    override fun onDestroy() {
        handler.removeCallbacks(tickRunnable)
        super.onDestroy()
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UI builder (pure Kotlin views — no XML layout needed)
    // ──────────────────────────────────────────────────────────────────────────

    private fun buildUI(
        customerName: String,
        price: String,
        serviceType: String,
        address: String,
        distance: String,
        orderId: String,
        quantity: String
    ): View {
        val d = resources.displayMetrics.density

        val colorPrimary   = Color.parseColor("#002147")
        val colorYellow    = Color.parseColor("#F3CD0D")
        val colorSuccess   = Color.parseColor("#22C55E")
        val colorDanger    = Color.parseColor("#EF4444")
        val colorTextSec   = Color.parseColor("#64748B")
        val colorSuccessBg = Color.parseColor("#F0FDF4")
        val colorBorder    = Color.parseColor("#E2E8F0")

        val dp4  = (4  * d).toInt()
        val dp8  = (8  * d).toInt()
        val dp12 = (12 * d).toInt()
        val dp16 = (16 * d).toInt()
        val dp20 = (20 * d).toInt()
        val dp48 = (48 * d).toInt()
        val dp56 = (56 * d).toInt()

        // ── Fullscreen background ────────────────────────────────────────────
        val root = LinearLayout(this).apply {
            orientation     = LinearLayout.VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#CC000000")) // semi-transparent dark
            setPadding(dp20, dp20, dp20, dp20)
        }

        // ── Card ─────────────────────────────────────────────────────────────
        val card = LinearLayout(this).apply {
            orientation     = LinearLayout.VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            setPadding(dp20, dp20, dp20, dp20)
            elevation = 32f
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 24 * d
                setColor(Color.WHITE)
                setStroke((1 * d).toInt().coerceAtLeast(1), colorBorder)
            }
        }

        // ── Header row ───────────────────────────────────────────────────────
        val headerRow = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
        }

        val iconBadge = TextView(this).apply {
            text     = "🚚"
            textSize = 24f
            gravity  = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(colorPrimary)
            }
            layoutParams = LinearLayout.LayoutParams(dp56, dp56)
        }

        val titleCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginStart = dp12
            layoutParams = lp
        }
        titleCol.addView(TextView(this).apply {
            text      = "🔔 طلبية جديدة"
            textSize  = 17f
            typeface  = Typeface.DEFAULT_BOLD
            setTextColor(colorPrimary)
        })
        titleCol.addView(TextView(this).apply {
            text     = serviceType
            textSize = 13f
            setTextColor(colorTextSec)
        })

        // Countdown badge
        val badge = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            background  = GradientDrawable().apply {
                shape        = GradientDrawable.OVAL
                setColor(Color.parseColor("#FEF3C7"))
                setStroke((2 * d).toInt().coerceAtLeast(1), colorYellow)
            }
            layoutParams = LinearLayout.LayoutParams(dp48, dp48)
        }
        countdownView = TextView(this).apply {
            text     = remaining.toString()
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(colorPrimary)
            gravity  = Gravity.CENTER
        }
        badge.addView(countdownView)

        headerRow.addView(iconBadge)
        headerRow.addView(titleCol)
        headerRow.addView(badge)
        card.addView(headerRow)

        // ── Divider ───────────────────────────────────────────────────────────
        card.addView(View(this).apply {
            setBackgroundColor(colorBorder)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (1 * d).toInt().coerceAtLeast(1))
            lp.topMargin    = dp16
            lp.bottomMargin = dp16
            layoutParams    = lp
        })

        // ── Info rows ─────────────────────────────────────────────────────────
        fun infoRow(label: String, value: String) {
            if (value.isEmpty()) return
            val row = LinearLayout(this).apply {
                orientation     = LinearLayout.HORIZONTAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                gravity         = Gravity.CENTER_VERTICAL
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.bottomMargin = dp8
                layoutParams    = lp
            }
            row.addView(TextView(this).apply {
                text      = label
                textSize  = 13f
                setTextColor(colorTextSec)
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            })
            row.addView(TextView(this).apply {
                text          = value
                textSize      = 14f
                typeface      = Typeface.DEFAULT_BOLD
                setTextColor(colorPrimary)
                textAlignment = View.TEXT_ALIGNMENT_VIEW_END
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                lp.marginEnd  = dp8
                layoutParams  = lp
            })
            card.addView(row)
        }

        infoRow("الزبون:",  customerName)
        infoRow("العنوان:", address)
        infoRow("الكمية:",  quantity)
        infoRow("المسافة:", distance)

        // ── Price box ─────────────────────────────────────────────────────────
        val priceBox = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
            setPadding(dp12, dp12, dp12, dp12)
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 12 * d
                setColor(colorSuccessBg)
                setStroke((1 * d).toInt().coerceAtLeast(1), colorSuccess)
            }
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.topMargin    = dp8
            lp.bottomMargin = dp16
            layoutParams    = lp
        }
        priceBox.addView(TextView(this).apply {
            text     = "المبلغ الإجمالي:"
            textSize = 13f
            setTextColor(colorTextSec)
        })
        priceBox.addView(TextView(this).apply {
            val priceDouble = try { price.toDouble() } catch (_: Exception) { 0.0 }
            val formatted   = if (priceDouble > 0) "${priceDouble.toLong()} د.ج" else "سيُحدد عند القبول"
            text          = formatted
            textSize      = if (priceDouble > 0) 22f else 15f
            typeface      = Typeface.DEFAULT_BOLD
            setTextColor(colorSuccess)
            textAlignment = View.TEXT_ALIGNMENT_VIEW_END
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginEnd  = dp8
            layoutParams  = lp
        })
        card.addView(priceBox)

        // ── Progress bar ──────────────────────────────────────────────────────
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max      = 100
            progress = 100
            val lp   = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (6 * d).toInt().coerceAtLeast(4))
            lp.bottomMargin = dp12
            layoutParams    = lp
            progressDrawable?.setColorFilter(colorYellow, android.graphics.PorterDuff.Mode.SRC_IN)
        }
        card.addView(progressBar)

        // ── Buttons ───────────────────────────────────────────────────────────
        val buttonsRow = LinearLayout(this).apply {
            orientation     = LinearLayout.HORIZONTAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            gravity         = Gravity.CENTER_VERTICAL
        }

        // Accept
        buttonsRow.addView(TextView(this).apply {
            text     = "✅  قبول"
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(colorPrimary)
            gravity  = Gravity.CENTER
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 14 * d
                setColor(colorYellow)
            }
            val lp       = LinearLayout.LayoutParams(0, dp56, 1f)
            lp.marginEnd = dp8
            layoutParams = lp
            setOnClickListener {
                handler.removeCallbacks(tickRunnable)
                // Notify JS layer
                sendBroadcast(Intent("${packageName}.ORDER_CARD_ACCEPTED").apply {
                    putExtra("orderId", orderId)
                    setPackage(packageName)
                })
                // Launch main app so driver sees order details
                val launch = packageManager.getLaunchIntentForPackage(packageName)
                launch?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                launch?.putExtra("pendingOrderId", orderId)
                launch?.let { startActivity(it) }
                finish()
            }
        })

        // Decline
        buttonsRow.addView(TextView(this).apply {
            text     = "رفض  ✗"
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(colorDanger)
            gravity  = Gravity.CENTER
            background = GradientDrawable().apply {
                shape        = GradientDrawable.RECTANGLE
                cornerRadius = 14 * d
                setColor(Color.WHITE)
                setStroke((2 * d).toInt().coerceAtLeast(1), colorDanger)
            }
            layoutParams = LinearLayout.LayoutParams(0, dp56, 1f)
            setOnClickListener {
                handler.removeCallbacks(tickRunnable)
                sendBroadcast(Intent("${packageName}.ORDER_CARD_DECLINED").apply {
                    putExtra("orderId", orderId)
                    setPackage(packageName)
                })
                finish()
            }
        })

        card.addView(buttonsRow)
        root.addView(card)
        return root
    }
}
