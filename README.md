# @dengage-tech/expo-dengage

Expo **config plugin** for [`@dengage-tech/react-native-dengage`](https://www.npmjs.com/package/@dengage-tech/react-native-dengage). It applies the native wiring expected by the RN SDK during `expo prebuild` (Android + iOS).

## Install

In your Expo app:

```bash
npm install @dengage-tech/react-native-dengage @dengage-tech/expo-dengage
```

## Configure

Add the plugin to `app.config.*` / `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@dengage-tech/expo-dengage",
        {
          "androidFirebaseIntegrationKey": "YOUR_DENGAGE_FIREBASE_INTEGRATION_KEY",
          "iosIntegrationKey": "YOUR_DENGAGE_IOS_INTEGRATION_KEY",
          "iosAppGroup": "group.com.company.app.dengage"
        }
      ]
    ]
  }
}
```

Then:

```bash
npx expo prebuild --clean
```

## Required client files

- Android: add `google-services.json` under `android/app/` (Firebase).
- iOS: configure push capabilities in Apple Developer + Xcode as usual.

## Optional flags

- `androidGeofenceEnabled` → sets `INSTALL_DENGAGE_GEOFENCE=true` (see RN SDK README).
- `androidHmsEnabled` + `androidHuaweiIntegrationKey` → adds HMS messaging service + passes HMS manager in `setupDengage` (full AgConnect setup may still be required separately).
- `iosGeofenceEnabled` → sets `ENV['install_dengage_geofence']='1'` for CocoaPods.

## Notes

- This does **not** make the SDK run inside **Expo Go**; use **EAS / dev builds / `expo run`**.
- If you also use `expo-notifications`, review FCM ownership / forwarding — that integration should be explicitly supported in a future release.

## Full Expo integration guide

Step-by-step (Urdu/English mix + all plugin options + checklist): see **[INTEGRATION.md](./INTEGRATION.md)**.
