"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDengageAndroid = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const BEGIN = '// @generated begin @dengage-tech/expo-dengage';
const END = '// @generated end @dengage-tech/expo-dengage';
function ensureInternetPermission(androidManifest) {
    const root = androidManifest.manifest;
    if (!root) {
        return;
    }
    if (!root['uses-permission']) {
        root['uses-permission'] = [];
    }
    const perms = root['uses-permission'];
    const hasInternet = perms.some((p) => { var _a; return ((_a = p.$) === null || _a === void 0 ? void 0 : _a['android:name']) === 'android.permission.INTERNET'; });
    if (!hasInternet) {
        perms.push({ $: { 'android:name': 'android.permission.INTERNET' } });
    }
}
function hasFcmService(mainApplication) {
    var _a;
    const services = (_a = mainApplication.service) !== null && _a !== void 0 ? _a : [];
    return services.some((s) => { var _a; return ((_a = s.$) === null || _a === void 0 ? void 0 : _a['android:name']) === 'com.dengage.sdk.push.FcmMessagingService'; });
}
function hasHmsService(mainApplication) {
    var _a;
    const services = (_a = mainApplication.service) !== null && _a !== void 0 ? _a : [];
    return services.some((s) => { var _a; return ((_a = s.$) === null || _a === void 0 ? void 0 : _a['android:name']) === 'com.dengage.sdk.HmsMessagingService'; });
}
function hasDengageReceiver(mainApplication, receiverClass) {
    var _a;
    const receivers = (_a = mainApplication.receiver) !== null && _a !== void 0 ? _a : [];
    return receivers.some((r) => { var _a; return ((_a = r.$) === null || _a === void 0 ? void 0 : _a['android:name']) === receiverClass; });
}
const withDengageGeofenceGradleProperty = (config, props) => {
    if (!props.androidGeofenceEnabled) {
        return config;
    }
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (c) => {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const gradlePropsPath = path.join(c.modRequest.platformProjectRoot, 'gradle.properties');
            let contents = fs.readFileSync(gradlePropsPath, 'utf8');
            if (contents.includes('INSTALL_DENGAGE_GEOFENCE=')) {
                contents = contents.replace(/INSTALL_DENGAGE_GEOFENCE=.*/g, 'INSTALL_DENGAGE_GEOFENCE=true');
            }
            else {
                contents += `\nINSTALL_DENGAGE_GEOFENCE=true\n`;
            }
            fs.writeFileSync(gradlePropsPath, contents);
            return c;
        },
    ]);
};
const withDengageProjectGradle = (config) => {
    return (0, config_plugins_1.withProjectBuildGradle)(config, (c) => {
        let contents = c.modResults.contents;
        if (contents.includes('com.google.gms:google-services')) {
            c.modResults.contents = contents;
            return c;
        }
        const needle = "classpath('com.facebook.react:react-native-gradle-plugin')";
        if (contents.includes(needle)) {
            contents = contents.replace(needle, `${needle}\n    classpath('com.google.gms:google-services:4.4.2')`);
        }
        else {
            contents = contents.replace(/(buildscript\s*\{[\s\S]*?dependencies\s*\{)/, `$1\n    classpath('com.google.gms:google-services:4.4.2')`);
        }
        c.modResults.contents = contents;
        return c;
    });
};
const withDengageAppGradle = (config, props) => {
    return (0, config_plugins_1.withAppBuildGradle)(config, (c) => {
        let contents = c.modResults.contents;
        if (!contents.includes('com.google.gms.google-services')) {
            const applyLine = 'apply plugin: "com.android.application"';
            if (contents.includes(applyLine)) {
                contents = contents.replace(applyLine, `${applyLine}\napply plugin: "com.google.gms.google-services"`);
            }
            else {
                contents = `apply plugin: "com.google.gms.google-services"\n${contents}`;
            }
        }
        // App module must compile against Dengage SDK types used in generated MainApplication / receiver.
        if (!contents.includes('com.github.dengage-tech.dengage-android-sdk')) {
            const geofenceLine = props.androidGeofenceEnabled
                ? "\n    implementation 'com.github.dengage-tech.dengage-android-sdk:sdk-geofence:6.0.88'"
                : '';
            contents = contents.replace(/^dependencies\s*\{/m, `dependencies {\n    implementation 'com.github.dengage-tech.dengage-android-sdk:sdk:6.0.88'${geofenceLine}`);
        }
        c.modResults.contents = contents;
        return c;
    });
};
const withDengageAndroidManifest = (config, props) => {
    var _a, _b, _c, _d, _e, _f;
    const eventUrl = (_a = props.dengageEventApiUrl) !== null && _a !== void 0 ? _a : 'https://tr-event.dengage.com';
    const pushUrl = (_b = props.dengagePushApiUrl) !== null && _b !== void 0 ? _b : 'https://tr-push.dengage.com';
    const deviceUrl = (_c = props.dengageDeviceIdApiUrl) !== null && _c !== void 0 ? _c : 'https://tr-push.dengage.com';
    const inAppUrl = (_d = props.dengageInAppApiUrl) !== null && _d !== void 0 ? _d : 'https://tr-push.dengage.com';
    const geofenceUrl = (_e = props.dengageGeofenceApiUrl) !== null && _e !== void 0 ? _e : 'https://tr-push.dengage.com/geoapi/';
    const rtInApp = (_f = props.fetchRealTimeInAppApiUrl) !== null && _f !== void 0 ? _f : 'https://tr-inapp.dengage.com';
    return (0, config_plugins_1.withAndroidManifest)(config, (c) => {
        var _a, _b;
        const manifest = c.modResults;
        ensureInternetPermission(manifest);
        const mainApplication = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
        mainApplication.service = (_a = mainApplication.service) !== null && _a !== void 0 ? _a : [];
        mainApplication.receiver = (_b = mainApplication.receiver) !== null && _b !== void 0 ? _b : [];
        if (!hasFcmService(mainApplication)) {
            mainApplication.service.push({
                $: {
                    'android:name': 'com.dengage.sdk.push.FcmMessagingService',
                    'android:exported': 'false',
                },
                'intent-filter': [
                    {
                        action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
                    },
                ],
            });
        }
        if (props.androidHmsEnabled && !hasHmsService(mainApplication)) {
            mainApplication.service.push({
                $: {
                    'android:name': 'com.dengage.sdk.HmsMessagingService',
                    'android:exported': 'false',
                },
                'intent-filter': [
                    {
                        action: [{ $: { 'android:name': 'com.huawei.push.action.MESSAGING_EVENT' } }],
                    },
                ],
            });
        }
        const pkg = config_plugins_1.AndroidConfig.Package.getPackage(c);
        if (!pkg) {
            throw new Error('@dengage-tech/expo-dengage: `expo.android.package` must be set.');
        }
        const receiverName = `${pkg}.DengageExpoPushReceiver`;
        if (!hasDengageReceiver(mainApplication, receiverName)) {
            mainApplication.receiver.push({
                $: {
                    'android:name': receiverName,
                    'android:exported': 'false',
                },
                'intent-filter': [
                    {
                        action: [
                            { $: { 'android:name': 'com.dengage.push.intent.RECEIVE' } },
                            { $: { 'android:name': 'com.dengage.push.intent.OPEN' } },
                            { $: { 'android:name': 'com.dengage.push.intent.DELETE' } },
                            { $: { 'android:name': 'com.dengage.push.intent.ACTION_CLICK' } },
                            { $: { 'android:name': 'com.dengage.push.intent.ITEM_CLICK' } },
                            { $: { 'android:name': 'com.dengage.push.intent.CAROUSEL_ITEM_CLICK' } },
                        ],
                    },
                ],
            });
        }
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'den_event_api_url', eventUrl);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'den_push_api_url', pushUrl);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'den_device_id_api_url', deviceUrl);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'den_in_app_api_url', inAppUrl);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'den_geofence_api_url', geofenceUrl);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, 'fetch_real_time_in_app_api_url', rtInApp);
        return c;
    });
};
const withDengagePushReceiverSource = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (c) => {
            const pkg = config_plugins_1.AndroidConfig.Package.getPackage(c);
            if (!pkg) {
                throw new Error('@dengage-tech/expo-dengage: android.package missing.');
            }
            const pkgPath = pkg.replace(/\./g, '/');
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const dir = `${c.modRequest.platformProjectRoot}/app/src/main/java/${pkgPath}`;
            const file = path.join(dir, 'DengageExpoPushReceiver.kt');
            const body = `package ${pkg}

import com.dengage.sdk.push.NotificationReceiver

/**
 * Minimal NotificationReceiver for standard push intents.
 * Replace/extend for custom carousel UI.
 */
class DengageExpoPushReceiver : NotificationReceiver()
`;
            if (fs.existsSync(file)) {
                const existing = fs.readFileSync(file, 'utf8');
                if (existing.includes('class DengageExpoPushReceiver')) {
                    return c;
                }
            }
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(file, body);
            return c;
        },
    ]);
};
const withDengageMainApplication = (config, props) => {
    var _a;
    const pref = props.androidDeviceConfiguration === 'Huawei'
        ? 'com.dengage.sdk.data.remote.api.DeviceConfigurationPreference.Huawei'
        : 'com.dengage.sdk.data.remote.api.DeviceConfigurationPreference.Google';
    const geo = props.androidGeofenceEnabled === true;
    const hms = props.androidHmsEnabled === true;
    const logEn = props.logEnabled === true;
    const devFromBuild = props.androidDevelopmentStatusFromBuild !== false;
    const bodyBlock = `${BEGIN}
    DengageRNCoordinator.sharedInstance.injectReactInstanceManager(reactNativeHost.reactInstanceManager)
    DengageRNCoordinator.sharedInstance.setupDengage(
      firebaseIntegrationKey = ${JSON.stringify(props.androidFirebaseIntegrationKey)},
      huaweiIntegrationKey = ${hms ? JSON.stringify((_a = props.androidHuaweiIntegrationKey) !== null && _a !== void 0 ? _a : '') : 'null'},
      context = this,
      dengageHmsManager = ${hms ? 'DengageHmsManager()' : 'null'},
      deviceConfigurationPreference = ${pref},
      disableOpenWebUrl = false,
      logEnabled = ${logEn ? 'true' : 'false'},
      enableGeoFence = ${geo ? 'true' : 'false'},
      developmentStatus = ${devFromBuild ? 'BuildConfig.DEBUG' : 'false'}
    )
${END}`;
    return (0, config_plugins_1.withMainApplication)(config, (c) => {
        let contents = c.modResults.contents;
        if (contents.includes(BEGIN)) {
            return c;
        }
        if (!contents.includes('import com.dengagetech.reactnativedengage.DengageRNCoordinator')) {
            contents = contents.replace(/^package .+\n/m, (m) => `${m}import com.dengagetech.reactnativedengage.DengageRNCoordinator\n${hms ? 'import com.dengage.hms.DengageHmsManager\n' : ''}`);
        }
        else if (hms && !contents.includes('import com.dengage.hms.DengageHmsManager')) {
            contents = contents.replace('import com.dengagetech.reactnativedengage.DengageRNCoordinator', 'import com.dengagetech.reactnativedengage.DengageRNCoordinator\nimport com.dengage.hms.DengageHmsManager');
        }
        const anchor = 'ApplicationLifecycleDispatcher.onApplicationCreate(this)';
        if (contents.includes(anchor)) {
            contents = contents.replace(anchor, `${anchor}\n${bodyBlock}`);
        }
        else {
            throw new Error('@dengage-tech/expo-dengage: Could not find ApplicationLifecycleDispatcher.onApplicationCreate(this) in MainApplication.');
        }
        c.modResults.contents = contents;
        return c;
    });
};
const withDengageAndroid = (config, props) => {
    config = withDengageGeofenceGradleProperty(config, props);
    config = withDengageProjectGradle(config, props);
    config = withDengageAppGradle(config, props);
    config = withDengageAndroidManifest(config, props);
    config = withDengagePushReceiverSource(config, props);
    config = withDengageMainApplication(config, props);
    return config;
};
exports.withDengageAndroid = withDengageAndroid;
