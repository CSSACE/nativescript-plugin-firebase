import { firebase } from "../firebase-common";
import * as appModule from "tns-core-modules/application";
import * as application from "tns-core-modules/application/application";

declare const android, com, org: any;

let _launchNotification = null;
let _senderId = 0;

export function initFirebaseMessaging(arg) {
  if (arg.onMessageReceivedCallback !== undefined) {
    addOnMessageReceivedCallback(arg.onMessageReceivedCallback);
  }
  if (arg.onPushTokenReceivedCallback !== undefined) {
    addOnPushTokenReceivedCallback(arg.onPushTokenReceivedCallback);
  }
}

export function onAppModuleLaunchEvent(args: any) {
  org.nativescript.plugins.firebase.FirebasePluginLifecycleCallbacks.registerCallbacks(appModule.android.nativeApp);

  const senderIdResourceId = application.android.context.getResources().getIdentifier("gcm_defaultSenderId", "string", application.android.context.getPackageName());
  if (senderIdResourceId === 0) {
    console.log("####################### Seems like you did not include 'google-services.json' in your project! Firebase Messaging will not work properly. #######################");
    return;
  }

  _senderId = application.android.context.getString(senderIdResourceId);

  const intent = args.android;
  const isLaunchIntent = "android.intent.action.VIEW" === intent.getAction();

  if (!isLaunchIntent) {
    const extras = intent.getExtras();
    // filter out any rubbish that doesn't have a 'from' key
    if (extras !== null && extras.keySet().contains("from")) {
      let result = {
        foreground: false,
        data: {}
      };

      const iterator = extras.keySet().iterator();
      while (iterator.hasNext()) {
        const key = iterator.next();
        if (key !== "from" && key !== "collapse_key") {
          result[key] = extras.get(key);
          result.data[key] = extras.get(key);
        }
      }

      if (firebase._receivedNotificationCallback === null) {
        _launchNotification = result;
      } else {
        // add a little delay just to make sure clients alerting this message will see it as the UI needs to settle
        setTimeout(() => {
          firebase._receivedNotificationCallback(result);
        });
      }
    }
  }
}

export function getCurrentPushToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof (com.google.firebase.messaging || com.google.firebase.iid) === "undefined" || _senderId === 0) {
        reject("Uncomment firebase-messaging in the plugin's include.gradle first");
        return;
      }

      org.nativescript.plugins.firebase.FirebasePlugin.getCurrentPushToken(
          _senderId,
          new org.nativescript.plugins.firebase.FirebasePluginListener({
            success: token => resolve(token),
            error: err => reject(err)
          })
      );

    } catch (ex) {
      console.log("Error in messaging.getCurrentPushToken: " + ex);
      reject(ex);
    }
  });
}

export function addOnMessageReceivedCallback(callback) {
  return new Promise((resolve, reject) => {
    try {
      firebase._receivedNotificationCallback = callback;

      org.nativescript.plugins.firebase.FirebasePlugin.setOnNotificationReceivedCallback(
          new org.nativescript.plugins.firebase.FirebasePluginListener({
            success: notification => callback(JSON.parse(notification))
          })
      );

      // if the app was launched from a notification, process it now
      if (_launchNotification !== null) {
        callback(_launchNotification);
        _launchNotification = null;
      }

      resolve();
    } catch (ex) {
      console.log("Error in messaging.addOnMessageReceivedCallback: " + ex);
      reject(ex);
    }
  });
}

export function addOnPushTokenReceivedCallback(callback) {
  return new Promise((resolve, reject) => {
    try {
      org.nativescript.plugins.firebase.FirebasePlugin.setOnPushTokenReceivedCallback(
          new org.nativescript.plugins.firebase.FirebasePluginListener({
            success: token => callback(token),
            error: err => console.log("addOnPushTokenReceivedCallback error: " + err)
          })
      );

      resolve();
    } catch (ex) {
      console.log("Error in messaging.addOnPushTokenReceivedCallback: " + ex);
      reject(ex);
    }
  });
}

export function registerForPushNotifications(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof (com.google.firebase.messaging) === "undefined" || _senderId === 0) {
        reject("Uncomment firebase-messaging in the plugin's include.gradle first");
        return;
      }

      org.nativescript.plugins.firebase.FirebasePlugin.registerForPushNotifications(_senderId);

    } catch (ex) {
      console.log("Error in messaging.registerForPushNotifications: " + ex);
      reject(ex);
    }
  });
}

export function unregisterForPushNotifications(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof (com.google.firebase.messaging) === "undefined") {
        reject("Uncomment firebase-messaging in the plugin's include.gradle first");
        return;
      }

      org.nativescript.plugins.firebase.FirebasePlugin.unregisterForPushNotifications(_senderId);

      resolve();
    } catch (ex) {
      console.log("Error in messaging.unregisterForPushNotifications: " + ex);
      reject(ex);
    }
  });
}

export function subscribeToTopic(topicName) {
  return new Promise((resolve, reject) => {
    try {

      if (typeof (com.google.firebase.messaging) === "undefined") {
        reject("Uncomment firebase-messaging in the plugin's include.gradle first");
        return;
      }

      const onCompleteListener = new com.google.android.gms.tasks.OnCompleteListener({
        onComplete: task => task.isSuccessful() ? resolve() : reject(task.getException() && task.getException().getReason ? task.getException().getReason() : task.getException())
      });

      com.google.firebase.messaging.FirebaseMessaging.getInstance()
          .subscribeToTopic(topicName)
          .addOnCompleteListener(onCompleteListener);
    } catch (ex) {
      console.log("Error in messaging.subscribeToTopic: " + ex);
      reject(ex);
    }
  });
}

export function unsubscribeFromTopic(topicName) {
  return new Promise((resolve, reject) => {
    try {

      if (typeof (com.google.firebase.messaging) === "undefined") {
        reject("Uncomment firebase-messaging in the plugin's include.gradle first");
        return;
      }

      const onCompleteListener = new com.google.android.gms.tasks.OnCompleteListener({
        onComplete: task => task.isSuccessful() ? resolve() : reject(task.getException() && task.getException().getReason ? task.getException().getReason() : task.getException())
      });

      com.google.firebase.messaging.FirebaseMessaging.getInstance()
          .unsubscribeFromTopic(topicName)
          .addOnCompleteListener(onCompleteListener);
    } catch (ex) {
      console.log("Error in messaging.unsubscribeFromTopic: " + ex);
      reject(ex);
    }
  });
}

export function areNotificationsEnabled() {
  const androidSdkVersion = android.os.Build.VERSION.SDK_INT;

  if (androidSdkVersion >= 24) { // android.os.Build.VERSION_CODES.N
    return android.support.v4.app.NotificationManagerCompat.from(application.android.context).areNotificationsEnabled();
  } else {
    console.log("NotificationManagerCompat.areNotificationsEnabled() is not supported in Android SDK VERSION " + androidSdkVersion);
    return true;
  }
}
