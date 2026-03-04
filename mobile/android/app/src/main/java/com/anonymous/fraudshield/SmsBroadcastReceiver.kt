package com.anonymous.fraudshield

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (
      action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION &&
      action != Telephony.Sms.Intents.SMS_DELIVER_ACTION
    ) {
      return
    }

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) {
      return
    }

    val body = messages.joinToString("") { it.messageBody ?: "" }.trim()
    if (body.isEmpty()) {
      return
    }

    val address = messages.firstOrNull()?.originatingAddress ?: "Unknown Sender"
    val timestamp = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()

    val app = context.applicationContext
    if (app is ReactApplication) {
      val reactContext = app.reactNativeHost.reactInstanceManager.currentReactContext
      if (reactContext != null) {
        val payload = Arguments.createMap().apply {
          putString("body", body)
          putString("address", address)
          putDouble("timestamp", timestamp.toDouble())
        }
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("smsReceived", payload)
      }
    }
  }
}
