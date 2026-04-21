# @dengage-tech/expo-dengage

Expo **config plugin** that applies **native** Dengage wiring during **`expo prebuild`** (Android and iOS): Gradle and manifest changes, `Info.plist` keys, `AppDelegate` / `MainApplication` initialization snippets, optional geofence native modules, and related defaults.

This **README** is the full integration guide for installing and configuring the package in an Expo app, including how **`@dengage-tech/react-native-dengage`** (peer dependency) sits on top of that native layer and which JavaScript APIs you can call.

---

## What this plugin does (and does not do)

| Responsibility | Owner |
|----------------|--------|
| Android: Gradle, Google Services plugin hook, `MainApplication` init snippet, manifest meta-data, FCM service registration, optional HMS pieces, optional geofence Gradle flag and dependency line, generated push receiver stub | **This plugin** (`@dengage-tech/expo-dengage`) |
| iOS: `Info.plist` URL keys, `UIBackgroundModes` (`remote-notification`), `AppDelegate` init snippet, optional Podfile geofence flag | **This plugin** |
| JavaScript APIs for campaigns, inbox, in-app messages, events, device identity, geofence control, etc. | **`@dengage-tech/react-native-dengage`** — import in your app and call methods; it forwards to native code |

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
npm install @dengage-tech/expo-dengage @dengage-tech/react-native-dengage
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
| `dengageInAppApiUrl` | In-app messaging (fullscreen, **real-time in-app**, and feeds used by **in-app inline** and **App Story** native views) |
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

## 5. Application code overview

After **`expo prebuild`**, your app contains the **native** Dengage bootstrap code that this plugin generated (keys, URLs, FCM/HMS wiring, optional geofence binaries). None of that runs from JavaScript directly.

Your **React / Expo JavaScript** talks to Dengage through **`@dengage-tech/react-native-dengage`**: a thin layer that reads **`NativeModules.DengageRN`** and exposes typed methods. Each method maps to a **native module method** (`@ReactMethod` on Android, `RCT_EXTERN_METHOD` on iOS) implemented in the same package’s `android/` and `ios/` sources. Those implementations call the **official Dengage Android / iOS SDKs** (`Dengage.*` on Android, `Dengage` / `DengageGeofence` on iOS).

So the chain is:

**Your JS** → **`import Dengage from '@dengage-tech/react-native-dengage'`** → **`NativeModules.DengageRN`** → **native bridge (`ReactNativeDengageModule` / `ReactNativeDengage`)** → **Dengage native SDK** → **network / device / push / geofence**.

---

## 6. How `expo-dengage` and `@dengage-tech/react-native-dengage` work together (under the hood)

### 6.1 Build-time (Expo config plugin)

When you run **`expo prebuild`**, `@dengage-tech/expo-dengage` runs as an Expo **config plugin**. It does not ship JavaScript to your bundle; it **rewrites or generates native project files**:

| Platform | What the plugin does (summary) |
|----------|--------------------------------|
| **Android** | Adds Google Services classpath and `apply plugin`; injects **`DengageRNCoordinator.sharedInstance.setupDengage(...)`** into `MainApplication` after `ApplicationLifecycleDispatcher.onApplicationCreate(this)` with your Firebase key, optional HMS, `enableGeoFence`, logging, and development flags; merges manifest meta-data for API URLs; registers **FCM** (and optionally **HMS**) `service` entries; adds a **`DengageExpoPushReceiver`** Kotlin stub for Dengage push intents; sets **`INSTALL_DENGAGE_GEOFENCE`** and **`sdk-geofence`** dependency when geofence is enabled. |
| **iOS** | Writes Dengage URL keys into **`Info.plist`**; ensures **`UIBackgroundModes`** includes **`remote-notification`**; injects **`DengageRNCoordinator.staticInstance.setupDengage(...)`** into **`AppDelegate.swift`** (integration key, App Group, `launchOptions`, notification permission flag, **`enableGeoFence`**, logging, development status); adds **`UNUserNotificationCenterDelegate`** handling and **APNs token** forwarding; optionally prepends **`ENV['install_dengage_geofence'] = '1'`** to the **Podfile** so **`pod install`** pulls the **DengageGeofence** pod. |

That native bootstrap runs **once at app launch**, before React mounts. It initializes the underlying Dengage SDK with the same keys and options you declared in **`app.json`**.

### 6.2 Run-time (React Native module)

The **`@dengage-tech/react-native-dengage`** package registers a native module named **`DengageRN`**. The default export in `src/index.tsx` is that module (or a **Proxy** that throws a helpful error if the native side is missing — e.g. in **Expo Go**).

On **module load**, the package may call **`registerNotificationListeners()`** once so that certain native → JS notification paths are wired without you having to call it (the method still exists for compatibility).

### 6.3 Native SDK calls

Inside the bridge:

- **Android** — `ReactNativeDengageModule.kt` methods call **`com.dengage.sdk.Dengage`** (and, when present, geofence classes via reflection).
- **iOS** — `ReactNativeDengage.swift` calls **`Dengage`** / **`DengageGeofence`** (when the geofence pod is linked).

So **`expo-dengage`** ensures **init + manifest + Gradle/Pods** are correct; **`@dengage-tech/react-native-dengage`** ensures every **feature you invoke from JS** reaches those same native SDKs.

### 6.4 Events from native to JavaScript (not the same as methods)

Some behaviors are pushed **from native to JS** as **device events** (not return values of `Dengage.*` methods):

| Event name | Typical source | How to listen in React Native |
|------------|----------------|------------------------------|
| **`onNotificationClicked`** | User taps a Dengage notification (Android receiver / iOS module) | `new NativeEventEmitter(NativeModules.DengageRN).addListener('onNotificationClicked', handler)` (iOS also declares this in **`supportedEvents`** on the native module). |
| **`onNotificationReceived`** | Push received (Android **`NotifReciever`**) | Same pattern with **`NativeEventEmitter`** / **`DeviceEventEmitter`** depending on platform — use the event name your installed SDK version emits; payload is a serialized push **`Message`**. |
| **`retrieveInAppLink`** | In-app link resolution (e.g. **`InAppLinkReceiver`** on Android, iOS **`supportedEvents`**) | Listen with **`NativeEventEmitter(NativeModules.DengageRN)`** for **`retrieveInAppLink`**. |

Payload shapes match the native models (often JSON-like objects). Always guard listeners with cleanup on unmount.

### 6.5 In-app inline and App Story (native UI components)

Besides **`NativeModules.DengageRN`** methods, **`@dengage-tech/react-native-dengage`** registers **native view managers** you embed in JSX. They use the **same** native bootstrap and **`dengageInAppApiUrl`** (and related in-app setup) that **`expo-dengage`** applies at prebuild—there are **no extra Expo plugin keys** only for inline or App Story.

#### In-app inline (`InAppInlineView`)

**Purpose:** show a **Dengage inline placement** (banner / slot) at a fixed position in your layout, configured in the Dengage panel with a **property id**.

**Requirements:**

- Custom dev client or store build (not Expo Go).

**Props (TypeScript):**

| Prop | Type | Meaning |
|------|------|--------|
| **`propertyId`** | `string` | Inline property identifier from Dengage. |
| **`screenName`** | `string` | Screen identifier supplied to the native view (use the value expected for your Dengage inline configuration). |
| **`customParams`** | `Record<string, string>` | Extra targeting key-values for the placement. |
| **`style`** | optional `ViewStyle` | Layout / size; the view defaults to full width. |

**Example:**

```tsx
import { InAppInlineView } from '@dengage-tech/react-native-dengage';

<InAppInlineView
  propertyId="YOUR_INLINE_PROPERTY_ID"
  screenName="home-inline"
  customParams={{ segment: 'vip' }}
/>
```

#### App Story (`StoriesListView`)

**Purpose:** render the **App Story** / stories strip UI driven by the native Dengage SDK (story property configured in the console).

**Props:**

| Prop | Type | Meaning |
|------|------|--------|
| **`storyPropertyId`** | `string \| null` | Story property id from Dengage. |
| **`screenName`** | `string \| null` | Screen identifier supplied to the native story view (use the value expected for your Dengage App Story configuration). |
| **`customParams`** | `Record<string, string> \| null` | Optional targeting map. |
| **`style`** | optional `ViewStyle` | Defaults include a minimum height and background in the component wrapper. |

**Example:**

```tsx
import { StoriesListView } from '@dengage-tech/react-native-dengage';

<StoriesListView
  storyPropertyId="YOUR_STORY_PROPERTY_ID"
  screenName="appstory"
  customParams={{}}
/>
```

**Operational notes:** configure creatives and property ids in **Dengage**; wrong or missing **`propertyId` / `storyPropertyId`** results in an empty native view. Test on **real devices** after **`expo prebuild`** and a full native rebuild.

---

## 7. JavaScript API reference (`@dengage-tech/react-native-dengage`)

Import the default export (typed as **`DengageType`**):

```ts
import Dengage from '@dengage-tech/react-native-dengage';
```

Below, **“native”** means the call is forwarded to **`DengageRN`** → Android/iOS bridge → **Dengage SDK**. Unless noted, methods are available on **both** platforms; some are **iOS-only** or **Android-only** as indicated.

### 7.1 Push, tokens, and permissions

| Method | What it does |
|--------|----------------|
| **`promptForPushNotifications()`** | Asks the user for notification permission (iOS path in native; Android uses activity-based permission request where applicable). |
| **`promptForPushNotificationsWitCallback(callback)`** | Same intent as above with a **`(hasPermission: boolean) => void`** callback (**iOS**). |
| **`registerForRemoteNotifications(enable: boolean)`** | Enables or disables registration for remote notifications (**iOS**). |
| **`getUserPermission()`** | Returns a **promise of boolean** — whether the user has granted notification permission (reads from subscription / native state). |
| **`setUserPermission(permission: boolean)`** | Sets user-level push permission flag in the SDK / subscription model. |
| **`getToken()`** | Resolves to **string** — current push token from subscription (empty string if none). |
| **`setToken(token: string)`** | Sets push token on the native side (advanced / testing scenarios). |
| **`getSubscription()`** | Resolves to **Subscription** — device subscription snapshot (fields such as `sdkVersion`, `deviceId`, `contactKey`, `permission`, etc.). Primarily exercised on **Android**; on **iOS**, **`getContactKey()`** is often used for identity. |
| **`resetAppBadge()`** | Clears the app icon badge count (**Android**). |
| **`getLastPushPayload()`** | Resolves to **string** — last push payload serialized for debugging or deep-link handling. |

### 7.2 Integration keys and logging (platform nuances)

| Method | What it does |
|--------|----------------|
| **`setIntegrationKey(key: string)`** | Sets iOS integration key at runtime (**iOS**). Prefer configuring via **`expo-dengage`** so startup is consistent. |
| **`getIntegrationKey()`** | Resolves to **string** — reads current iOS integration key (**iOS**). |
| **`setFirebaseIntegrationKey(key: string)`** | **Android** — intended for compatibility; native init normally already set the key via **`setupDengage`**. May log a warning if the SDK is already initialized. |
| **`setLogStatus(isVisible: boolean)`** | Toggles SDK log visibility on the native side. |
| **`setDevelopmentStatus(isDebug: boolean)`** | Marks development vs production behavior for the native SDK (overrides / complements build-time flags where supported). |
| **`getSdkParameters()`** | Resolves to **SdkParameters or null** — remote SDK configuration (e.g. feature flags such as geofence enabled server-side). |
| **`getSdkVersion()`** | Resolves to **string** — native SDK version string. |

### 7.3 Identity, device, and language

| Method | What it does |
|--------|----------------|
| **`setContactKey(key: string \| null)`** | Associates the device with a **contact key** in Dengage (CRM / user id). Pass **`null`** to clear. |
| **`getContactKey()`** | Resolves to **string or null** — current contact key (**iOS** returns from native; **Android** often reads from **`getSubscription()`** in practice). |
| **`getDeviceId()`** | Resolves to **string** — Dengage device identifier. |
| **`setDeviceId(deviceId: string)`** | Overrides device id on the native side (use only when your integration requires it). |
| **`setLanguage(language: string)`** | Sets language attribute used in segmentation / messaging. |
| **`setPartnerDeviceId(adid: string)`** | Sets partner / advertising id (e.g. ADID) for attribution-style use cases. |

### 7.4 Screen and navigation tracking

| Method | What it does |
|--------|----------------|
| **`pageView(params: object)`** | Sends a **page view** / screen analytics event with arbitrary key-value **`params`** (e.g. `page_type`, `screen_name`). |
| **`setNavigation()`** | Signals navigation stack reset / default navigation state to the SDK. |
| **`setNavigationWithName(screenName: string)`** | Passes a screen name string to the native SDK. |
| **`onMessageReceived(params: object)`** | Forwards a received message object into the native pipeline (advanced / FCM callback integration patterns). |

### 7.5 Commerce and behavioral events (parameter objects)

Each of the following accepts a **`params`** object (shape depends on your Dengage schema). They map to native **event** APIs for e‑commerce and engagement:

| Method | Typical use |
|--------|-------------|
| **`addToCart(params)`** | Add line to cart. |
| **`removeFromCart(params)`** | Remove line from cart. |
| **`viewCart(params)`** | Cart screen viewed. |
| **`beginCheckout(params)`** | Checkout started. |
| **`placeOrder(params)`** | Order completed. |
| **`cancelOrder(params)`** | Order cancelled. |
| **`addToWishList(params)`** / **`removeFromWishList(params)`** | Wishlist mutations. |
| **`search(params)`** | Search performed. |

### 7.6 Custom and device events

| Method | What it does |
|--------|----------------|
| **`sendDeviceEvent(tableName: string, data: object)`** | Sends a row-style **device event** to the table **`tableName`** with **`data`** fields. |
| **`sendCustomEvent(eventTable: string, key: string, parameters: object)`** | Sends a **custom event** keyed by **`key`** into **`eventTable`** with **`parameters`**. |

### 7.7 In-app messaging

For **embedded** placements (**in-app inline**) and the **App Story** strip, use the native views described in **section 6.5** in addition to the methods below.

| Method | What it does |
|--------|----------------|
| **`registerInAppListener()`** | Registers the app to receive in-app message lifecycle callbacks on the native side. |
| **`setInAppLinkConfiguration(deeplink: string)`** | Base deeplink or scheme configuration used when in-app actions open URLs. |
| **`setInAppDeviceInfo(key: string, value: string)`** | Adds a key-value pair to in-app targeting context. |
| **`clearInAppDeviceInfo()`** | Clears all in-app device info pairs. |
| **`getInAppDeviceInfo()`** | Resolves to **record of string to string** — reads current in-app device info map. |
| **`setCategoryPath(path: string)`** | Current category path for retail targeting. |
| **`setCartItemCount(count: string)`** / **`setCartAmount(amount: string)`** | Lightweight cart hints as strings for in-app rules. |
| **`setState(state: string)`** / **`setCity(city: string)`** | Geographic / regional hints for targeting. |
| **`showRealTimeInApp(screenName: string, params: Record<string, string>)`** | Triggers a **real-time in-app** fetch/display path for **`screenName`** with extra **`params`**. |

### 7.8 Cart object (structured)

| Method | What it does |
|--------|----------------|
| **`setCart(cart: Cart)`** | Resolves to **boolean** — uploads a full structured **`Cart`** (items, totals, currency) to the SDK for in-app / personalization. |
| **`getCart()`** | Resolves to **Cart** — reads the cart currently held by the native SDK. |

Types **`Cart`**, **`CartItem`**, etc. are exported from **`@dengage-tech/react-native-dengage`** (`./types`).

### 7.9 Inbox

| Method | What it does |
|--------|----------------|
| **`getInboxMessages(offset: number, limit: number)`** | Async — array of **`InboxMessage`** (paginated). |
| **`deleteInboxMessage(id: string)`** | Async — **boolean** success for deleting one inbox message by id. |
| **`setInboxMessageAsClicked(id: string)`** | Async — **boolean** success for marking a message as clicked. |
| **`deleteAllInboxMessages()`** | Async — **boolean** success for clearing the inbox. |
| **`setAllInboxMessageAsClicked()`** | Async — **boolean** success for marking all messages as clicked. |

### 7.10 Geofence (requires native geofence enabled via this plugin)

| Method | What it does |
|--------|----------------|
| **`requestLocationPermissions()`** | Starts the native flow to request location permissions (fine / background as configured on the OS). |
| **`startGeofence()`** | Starts geofence tracking if native libraries are linked and server configuration allows it. |
| **`stopGeofence()`** | Stops geofence tracking. |

If **`androidGeofenceEnabled`** / **`iosGeofenceEnabled`** are **`false`**, these calls may no-op or log warnings because the geofence native code is not linked.

### 7.11 Notification action callback (iOS)

| Method | What it does |
|--------|----------------|
| **`handleNotificationActionBlock(callback)`** | Registers a callback invoked with a **`NotificationAction`** shape when the user interacts with a notification (**iOS**). Use together with native notification delegate wiring from **`expo-dengage`**. |

### 7.12 Deprecated / internal

| Method | Notes |
|--------|--------|
| **`registerNotificationListeners()`** | Marked deprecated in types; the package may invoke it internally on load. **You normally do not call this** unless directed by Dengage support. |

---

## 8. Sample project layout

A separate **sample Expo application** maintained alongside this plugin demonstrates a full `app.json` plugin block, navigation, **`pageView`**, **`NativeEventEmitter`** listeners, and optional screens including **push**, **inbox**, **in-app message**, **in-app inline** (`InAppInlineView`), **App Story** (`StoriesListView`), and **geofence**. Use it as a structural reference; cross-check property ids and parameter shapes with your Dengage project documentation.

---

## 9. Troubleshooting

| Symptom | What to verify |
|---------|----------------|
| Missing native module / crash inside Expo Go | Use a **custom dev build** or EAS build — not Expo Go. |
| **`The package '@dengage-tech/react-native-dengage' doesn't seem to be linked`** | Run **`pod install`**, rebuild after **`expo prebuild`**, and ensure you are not on Expo Go. |
| Android FCM not delivering | `google-services.json` path, `expo.android.package` vs Firebase package, release SHA keys if applicable. |
| iOS push not registering | Capabilities, provisioning profiles, App Group, correct integration key, physical device for final push tests. |
| Plugin edits not visible | Run **`npx expo prebuild --clean`**, reinstall pods on iOS, clean Gradle on Android, rebuild. |
| Coexisting push libraries | If you use another push or notification library, confirm only one component owns FCM message handling or coordinate forwarding explicitly with your integration team. |

---

## 10. Release checklist (Expo + Dengage)

1. [ ] Install **`@dengage-tech/expo-dengage`** and **`@dengage-tech/react-native-dengage`** (and other **`peerDependencies`**) at supported versions.
2. [ ] Add the plugin block with **Android Firebase** and **iOS** integration keys and **`iosAppGroup`**.
3. [ ] Configure **`expo.android.googleServicesFile`** and matching **`expo.android.package`**.
4. [ ] Set optional URL overrides from Dengage for your environment.
5. [ ] Enable **`androidGeofenceEnabled`** / **`iosGeofenceEnabled`** only if geofence is required; add iOS location usage strings and background modes as needed.
6. [ ] Run **`npx expo prebuild --clean`**, then **`pod install`** under `ios/` if you manage CocoaPods manually.
7. [ ] Produce dev or store builds with **`expo run:*`** or **EAS Build**; validate push, in-app, and analytics on real devices.
8. [ ] Implement **`pageView`**, commerce events, inbox, **in-app inline** / **App Story** views, and listeners as required; test against staging before production keys.

---

## 11. Support

For **config-plugin** behavior (Gradle, Podfile, `Info.plist`, manifests), inspect **`src/plugin/`** in **`@dengage-tech/expo-dengage`** or open an issue with **Expo SDK version**, **plugin version**, and a redacted **`app.json`** plugin block.

For **JavaScript API** semantics, payload schemas, and campaign rules, use **Dengage** product documentation and your integration manager.

---

## Limitations

- **Expo Go** does not include this native setup. Use **EAS Build**, **`expo run:ios`**, **`expo run:android`**, or another **custom development client**.
- If you combine Dengage with other libraries that own FCM or notification delivery, plan ownership and forwarding with your team before production.
