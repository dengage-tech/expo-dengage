# Dengage + Expo — integration guide

> **Roman Urdu:** Ye document batata hai ke **`@dengage-tech/expo-dengage`** (Expo config plugin) aur **`@dengage-tech/react-native-dengage`** (JS + native SDK) ko Expo app mein kaise jorna hai. Poora flow: install → `app.json` / `app.config` plugin → Firebase / App Group → `prebuild` → dev build par run.

**`@dengage-tech/expo-dengage`** sirf **native setup** karta hai (`expo prebuild` ke waqt Android manifest, Gradle, iOS `Info.plist`, `AppDelegate`, waghera). App ke andar events, push, inbox waghera **`@dengage-tech/react-native-dengage`** se `import` karke call hotay hain.

---

## 1. Kya zaroori hai

| Cheez | Detail |
|--------|--------|
| Expo | SDK **49+** (project mein `expo` version dekh lain) |
| Build | **Expo Go par ye library kaam nahi karti** — **dev client** (`expo run:ios` / `expo run:android`) ya **EAS Build** use karein |
| Android | Firebase project + `google-services.json` |
| iOS | Apple Push setup + Dengage dashboard se **iOS integration key** + (recommended) **App Group** id jo Dengage / aap ki team de |
| Keys | Dengage se **Android (Firebase) integration key** aur **iOS integration key** |

---

## 2. Install

```bash
npm install @dengage-tech/react-native-dengage @dengage-tech/expo-dengage
```

Yarn/pnpm par equivalent command use karein.

---

## 3. Expo config — plugin lagana

`app.json`, `app.config.json`, ya `app.config.js` ke `expo.plugins` array mein plugin add karein.

### 3.1 Kam az kam zaroori fields

```json
{
  "expo": {
    "plugins": [
      [
        "@dengage-tech/expo-dengage",
        {
          "androidFirebaseIntegrationKey": "YOUR_ANDROID_FIREBASE_INTEGRATION_KEY",
          "iosIntegrationKey": "YOUR_IOS_INTEGRATION_KEY",
          "iosAppGroup": "group.com.yourcompany.yourapp.dengage"
        }
      ]
    ]
  }
}
```

- **`androidFirebaseIntegrationKey`**: Android native init (`setupDengage`) ke liye.
- **`iosIntegrationKey`**: iOS native init ke liye.
- **`iosAppGroup`**: Woh App Group identifier jo Apple Developer + Dengage flow ke mutabiq ho (example: `group.com.dengage.expodengageexample.dengage`).

### 3.2 Android — `google-services.json`

Expo mein file ko project root par rakhein aur `expo.android.googleServicesFile` point karein:

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.yourapp",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

`expo prebuild` is file ko native `android/app/` flow mein use karta hai (Firebase / Google Services plugin ke sath).

### 3.3 API URLs (optional)

Agar aap URLs override nahi karte, plugin iOS `Info.plist` par defaults set karta hai (push / event / device / in-app / geofence / real-time in-app). Production ke liye Dengage team jo URLs de, wohi `app.json` plugin props mein dein:

| Plugin property | Native mapping (short) |
|-----------------|-------------------------|
| `dengageEventApiUrl` | Events |
| `dengagePushApiUrl` | Push (iOS: `DengageApiUrl`) |
| `dengageDeviceIdApiUrl` | Device / contact |
| `dengageInAppApiUrl` | In-app |
| `dengageGeofenceApiUrl` | Geofence |
| `fetchRealTimeInAppApiUrl` | Real-time in-app |

### 3.4 Baqi optional flags

| Property | Default | Matlab |
|----------|---------|--------|
| `androidGeofenceEnabled` | `false` | Geofence Gradle flag |
| `androidHmsEnabled` | `false` | Huawei HMS; `androidHuaweiIntegrationKey` bhi |
| `androidDeviceConfiguration` | `"Google"` | `"Google"` ya `"Huawei"` |
| `iosGeofenceEnabled` | `false` | CocoaPods geofence pod |
| `iosAskNotificationPermission` | `true` | Startup par permission flow |
| `iosDevelopmentStatusFromBuild` | `true` | DEBUG build = dev status true |
| `logEnabled` | `false` | Verbose native logging |
| `androidDevelopmentStatusFromBuild` | (injected snippet) | Debug build ke mutabiq |

Poori TypeScript types: `expo-dengage` package mein `src/plugin/types.ts` (publish build: `build/plugin/types.d.ts`).

---

## 4. Prebuild aur run

Plugin tab apply hota hai jab native folders generate/update hon:

```bash
npx expo prebuild --clean
```

Phir:

```bash
npx expo run:ios
npx expo run:android
```

EAS use kar rahe hon to `eas build` se bhi prebuild step chalti hai (profile ke mutabiq).

**Dobarah yaad:** Expo Go mein ye setup load nahi hota — **custom dev client** ya release build zaroori hai.

---

## 5. JavaScript / TypeScript — library kaise use karein

Native init plugin + RN SDK mil kar handle karte hain. App code mein:

```ts
import Dengage from '@dengage-tech/react-native-dengage';
```

Examples (API names project / SDK version ke mutabiq thora farq ho sakta hai — apne installed version ki types dekhein):

```ts
// Screen tracking (example app jaisa)
Dengage.pageView?.({
  page_type: 'screen',
  screen_name: 'Home',
});

// Push permission (example screens dekhein)
// Dengage.promptForPushNotifications(...) etc.
```

**Notification click** JS mein `NativeEventEmitter` + `NativeModules.DengageRN` se suna ja sakta hai (reference: `expodengageexample` ka `App.tsx`).

**Mukammal API:** [`@dengage-tech/react-native-dengage` README](https://www.npmjs.com/package/@dengage-tech/react-native-dengage) — push, inbox, in-app, cart events, geofence, waghera sab wahan detail mein hai.

---

## 6. Reference implementation (is repo mein)

- **`expodengageexample/`**: Working Expo app — `app.json` mein poora plugin block, `src/App.tsx` mein navigation + `pageView` + notification listener.
- **`dengage-react-sdk/README.md`**: RN SDK ki gehraai wali integration (rich push, NSE, carousel, waghera).

---

## 7. Common issues

| Masla | Check |
|--------|--------|
| Expo Go par crash / module missing | Dev client / `expo run:*` use karein |
| Android FCM | `google-services.json` path + package name Firebase se match |
| iOS push | Capabilities, provisioning, App Group, Dengage dashboard keys |
| Plugin changes reflect nahi | `npx expo prebuild --clean` phir dubara build |
| `expo-notifications` ke sath | FCM ownership / forwarding — dono libraries ek sath carefully design karein (README note) |

---

## 8. Short checklist

1. [ ] `npm i @dengage-tech/react-native-dengage @dengage-tech/expo-dengage`
2. [ ] `app.json` / `app.config` mein plugin + keys + `iosAppGroup`
3. [ ] Android: `google-services.json` + `googleServicesFile`
4. [ ] `npx expo prebuild --clean`
5. [ ] `expo run:ios` / `expo run:android` ya EAS build
6. [ ] JS mein `import Dengage from '@dengage-tech/react-native-dengage'` + RN README ke mutabiq events / push

Agar koi step unclear ho to `expodengageexample` folder diff dekh lain — woh is plugin ka **ground truth** example hai.
