package com.anonymous.fraudshield

import android.content.Intent
import android.provider.Telephony
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsReceiverModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        companionReactContext = reactContext
    }

    override fun getName(): String = "SmsReceiver"

    @ReactMethod
    fun requestDefaultSmsRole() {
        val activity = reactApplicationContext.currentActivity ?: return
        val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
            putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, activity.packageName)
        }
        activity.startActivity(intent)
    }

    companion object {
        private var companionReactContext: ReactApplicationContext? = null

        fun emitSmsReceived(address: String, body: String, timestamp: Long) {
            val context = companionReactContext ?: return
            val payload = Arguments.createMap().apply {
                putString("address", address)
                putString("body", body)
                putDouble("timestamp", timestamp.toDouble())
            }
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("smsReceived", payload)
        }
    }
}
