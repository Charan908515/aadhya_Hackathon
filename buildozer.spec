[app]
title = AI Fraud Awareness
package.name = ai_fraud_awareness
package.domain = org.local
source.dir = app
source.include_exts = py,png,jpg,kv,json,pkl,db,csv,txt
version = 0.1
  
requirements = python3,kivy,pyjnius,plyer
orientation = portrait
fullscreen = 0

android.permissions = READ_SMS,RECEIVE_SMS,INTERNET,POST_NOTIFICATIONS
android.api = 33
android.minapi = 24
android.archs = arm64-v8a,armeabi-v7a
android.accept_sdk_license = True

presplash.color = #f5f5f5

[buildozer]
log_level = 2
warn_on_root = 1
