package com.anonymous.fraudshield

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) {
            return
        }

        for (message in messages) {
            val address = message.displayOriginatingAddress ?: "Unknown"
            val body = message.messageBody ?: ""
            val timestamp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                message.timestampMillis
            } else {
                message.timestampMillis
            }
            if (body.isNotBlank()) {
                SmsReceiverModule.emitSmsReceived(address, body, timestamp)
            }
        }
    }
}
