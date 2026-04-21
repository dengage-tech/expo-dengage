# @dengage-tech/expo-dengage

Expo **config plugin** that applies **native** Dengage wiring during **`expo prebuild`** (Android and iOS): Gradle and manifest changes, `Info.plist` keys, `AppDelegate` / `MainApplication` initialization snippets, optional geofence native modules, and related defaults.

This **README** is the full integration guide for installing and configuring the package in an Expo app.

---

## What this plugin does (and does not do)

| Responsibility | Owner |
|----------------|--------|
| Android: Gradle, Google Services plugin hook, `MainApplication` init snippet, manifest meta-data, FCM service registration, optional HMS pieces, optional geofence Gradle flag and dependency line, generated push receiver stub | **This plugin** |
| iOS: `Info.plist` URL keys, `UIBackgroundModes` (`remote-notification`), `AppDelegate` init snippet, optional Podfile geofence flag | **This plugin** |
| JavaScript APIs for campaigns, inbox, in-app messages, events, device identity, etc. | **Your application code** using the client libraries required by this package’s **`peerDependencies`** (see that file in the published package; install compatible versions alongside this plugin) |

**Expo Go** does not load custom native code from this plugin. Use a **development build** (`expo run:ios` / `expo run:android`), **EAS Build**, or equivalent custom client.

---

## 1. Requirements

| Item | Notes |
|------|--------|
| Expo SDK | **49 or higher** (`expo` in your app must satisfy the version range declared under `peerDependencies` of `@dengage-tech/expo-dengage`) |
| Workflow | **Prebuild** (managed native `android/` and `ios/` folders generated or refreshed by Expo) |
| Android | Firebase project for FCM; **`google-services.json`** available to the Expo config |
| iOS | Apple Push Notification setup; **iOS integration key** from Dengage; **App Group** identifier agreed with your Dengage integration (used for shared storage with extensions when applicable) |
| Keys | **Android (Firebase) integration key** and **iOS integration key** from the Dengage console |

---

## 2. Installation

Install this package in your Expo app root:

```bash
npm install @dengage-tech/expo-dengage
```

Install every **`peerDependency`** listed in `@dengage-tech/expo-dengage/package.json` at compatible versions (Expo, plus any other entries). Use the same package manager for the whole tree (`npm`, `yarn`, or `pnpm`) so resolutions stay consistent.

---

## 3. Register the config plugin

Add the plugin to **`app.json`**, **`app.config.json`**, or **`app.config.js`** under `expo.plugins`.

### 3.1 Minimum configuration

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

| Property | Purpose |
|----------|---------|
| `androidFirebaseIntegrationKey` | Passed into native Android initialization (`DengageRNCoordinator.setupDengage`). |
| `iosIntegrationKey` | Passed into native iOS initialization (`DengageRNCoordinator.setupDengage`). |
| `iosAppGroup` | App Group identifier used for Dengage-related shared user defaults (must match your Apple Developer configuration and Dengage guidance). Example shape: `group.com.company.app.dengage`. |

### 3.2 Android — `google-services.json`

Place the file in your repository (commonly project root) and point Expo at it:

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

Expo copies and wires this for the Google Services Gradle plugin during prebuild. The Android **`applicationId`** / package must match the Firebase app configuration.

### 3.3 API endpoint overrides (optional)

If you omit these, the plugin sets **default** Dengage API base URLs on iOS (`Info.plist`) and Android (`<application><meta-data .../>`). For production, use the endpoints supplied by Dengage for your account.

| Plugin property | Role |
|-----------------|------|
| `dengageEventApiUrl` | Event ingestion |
| `dengagePushApiUrl` | Push (iOS key `DengageApiUrl`) |
| `dengageDeviceIdApiUrl` | Device / identifier endpoints |
| `dengageInAppApiUrl` | In-app messaging |
| `dengageGeofenceApiUrl` | Geofence backend |
| `fetchRealTimeInAppApiUrl` | Real-time in-app |

### 3.4 Optional feature flags

| Property | Default | Effect |
|----------|---------|--------|
| `androidGeofenceEnabled` | `false` | When `true`, sets `INSTALL_DENGAGE_GEOFENCE=true` in `gradle.properties` and adds the geofence artifact to the app module’s `dependencies`. |
| `androidHmsEnabled` | `false` | When `true`, registers HMS messaging in the manifest and passes Huawei-related parameters into native setup. Full AgConnect / HMS project setup may still require additional manual Gradle and console steps. |
| `androidHuaweiIntegrationKey` | — | Used only when `androidHmsEnabled` is `true`. |
| `androidDeviceConfiguration` | `"Google"` | `"Google"` or `"Huawei"` — passed through to native device configuration preference. |
| `iosGeofenceEnabled` | `false` | When `true`, injects `ENV['install_dengage_geofence'] = '1'` into the generated **Podfile** so the geofence pod is installed on `pod install`. |
| `iosAskNotificationPermission` | `true` | Controls whether the native startup path prompts for notification permission. |
| `iosDevelopmentStatusFromBuild` | `true` | When `true`, the injected **AppDelegate** snippet sets development vs production mode from the build configuration (`DEBUG` vs release). Set `false` to force non-development behavior on iOS regardless of build type. |
| `androidDevelopmentStatusFromBuild` | `true` (when injected) | Android `MainApplication` snippet uses `BuildConfig.DEBUG` for development status when enabled. |
| `logEnabled` | `false` | Enables more verbose native logging where supported. |

Authoritative TypeScript shapes for all properties live in **`src/plugin/types.ts`** in the source repository (published as **`build/plugin/types.d.ts`**).

### 3.5 Geofence — extra Expo configuration

Native geofence modules require **location permission** strings on iOS. This plugin does **not** invent marketing copy for Apple’s required usage keys. Add them under Expo’s **`ios.infoPlist`**, for example:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

If you need **background** location updates, include **`location`** in **`UIBackgroundModes`** (alongside **`remote-notification`** if you already rely on it for push). Merge carefully with any other plugins that also modify `UIBackgroundModes`.

On Android, the geofence library contributes merged manifest permissions (fine / coarse / background location, boot completed, etc.). Runtime permission flows still apply on modern Android versions.

Geofence can also be gated by **remote SDK configuration** from Dengage; enable the feature in the product console where applicable.

---

## 4. Prebuild and local runs

Apply the plugin whenever native projects are created or refreshed:

```bash
npx expo prebuild --clean
```

Then build and install a dev client:

```bash
npx expo run:ios
npx expo run:android
```

**EAS Build** runs an equivalent prebuild step for cloud builds according to your `eas.json` profile.

After native generation, open the **`.xcworkspace`** under `ios/` (not the bare `.xcodeproj` alone) when working in Xcode.

---

## 5. Application code (after native setup)

This plugin **does not** replace your product’s JavaScript layer. Once prebuild has produced native projects and you install the peer client libraries, you call Dengage capabilities from TypeScript or JavaScript **according to Dengage’s official application documentation** for your stack (screen analytics, push helpers, inbox, in-app, geofence start/stop, etc.).

For **notification open** and similar events, subscribe through whatever **native-event bridge** your application stack provides to the module name your client library documents for those callbacks.

---

## 6. Sample project layout

A separate **sample Expo application** maintained alongside this plugin demonstrates a full `app.json` plugin block, navigation, analytics hooks, and optional screens (push, inbox, in-app, geofence). Use it as a structural reference for file layout and config shape; align API usage with current Dengage product docs.

---

## 7. Troubleshooting

| Symptom | What to verify |
|---------|----------------|
| Missing native module / crash inside Expo Go | Use a **custom dev build** or EAS build — not Expo Go. |
| Android FCM not delivering | `google-services.json` path, `expo.android.package` vs Firebase package, release SHA keys if applicable. |
| iOS push not registering | Capabilities, provisioning profiles, App Group, correct integration key, physical device for final push tests. |
| Plugin edits not visible | Run **`npx expo prebuild --clean`**, reinstall pods on iOS, clean Gradle on Android, rebuild. |
| Coexisting push libraries | If you use another push or notification library, confirm only one component owns FCM message handling or coordinate forwarding explicitly with your integration team. |

---

## 8. Release checklist (Expo + Dengage)

1. [ ] Install `@dengage-tech/expo-dengage` and all **`peerDependencies`** at supported versions.
2. [ ] Add the plugin block with **Android Firebase** and **iOS** integration keys and **`iosAppGroup`**.
3. [ ] Configure **`expo.android.googleServicesFile`** and matching **`expo.android.package`**.
4. [ ] Set optional URL overrides from Dengage for your environment.
5. [ ] Enable **`androidGeofenceEnabled`** / **`iosGeofenceEnabled`** only if geofence is required; add iOS location usage strings and background modes as needed.
6. [ ] Run **`npx expo prebuild --clean`**, then **`pod install`** under `ios/` if you manage CocoaPods manually.
7. [ ] Produce dev or store builds with **`expo run:*`** or **EAS Build**; validate push, in-app, and analytics on real devices.
8. [ ] Wire application-level APIs from Dengage’s current documentation and test against staging before production keys.

---

## 9. Support

For **plugin-specific** behavior (what gets written to Gradle, Podfile, `Info.plist`, or manifests), inspect the TypeScript sources under **`src/plugin/`** in this repository or open an issue with the **Expo SDK version**, **plugin version**, and a redacted `app.json` plugin block.

For **account keys, endpoints, console features, and campaign behavior**, contact **Dengage** support or your integration manager.

---

## Limitations

- **Expo Go** does not include this native setup. Use **EAS Build**, **`expo run:ios`**, **`expo run:android`**, or another **custom development client**.
- If you combine Dengage with other libraries that own FCM or notification delivery, plan ownership and forwarding with your team before production.
