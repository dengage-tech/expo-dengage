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
exports.withDengageIos = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const IOS_APP_GROUPS_ENTITLEMENT = 'com.apple.security.application-groups';
const SWIFT_BEGIN = '    // @generated begin @dengage-tech/expo-dengage';
const SWIFT_END = '    // @generated end @dengage-tech/expo-dengage';
const EXT_BEGIN = '// @generated begin @dengage-tech/expo-dengage-extension';
const EXT_END = '// @generated end @dengage-tech/expo-dengage-extension';
const withDengageInfoPlist = (config, props) => {
    var _a, _b, _c, _d, _e, _f;
    const pushUrl = (_a = props.dengagePushApiUrl) !== null && _a !== void 0 ? _a : 'https://tr-push.dengage.com';
    const eventUrl = (_b = props.dengageEventApiUrl) !== null && _b !== void 0 ? _b : 'https://tr-event.dengage.com';
    const deviceUrl = (_c = props.dengageDeviceIdApiUrl) !== null && _c !== void 0 ? _c : 'https://tr-push.dengage.com';
    const inAppUrl = (_d = props.dengageInAppApiUrl) !== null && _d !== void 0 ? _d : 'https://tr-push.dengage.com';
    const geofenceUrl = (_e = props.dengageGeofenceApiUrl) !== null && _e !== void 0 ? _e : 'https://tr-push.dengage.com/geoapi/';
    const rtInApp = (_f = props.fetchRealTimeInAppApiUrl) !== null && _f !== void 0 ? _f : 'https://tr-inapp.dengage.com';
    return (0, config_plugins_1.withInfoPlist)(config, (c) => {
        c.modResults.DengageApiUrl = pushUrl;
        c.modResults.DengageEventApiUrl = eventUrl;
        c.modResults.DengageDeviceIdApiUrl = deviceUrl;
        c.modResults.DengageInAppApiUrl = inAppUrl;
        c.modResults.DengageGeofenceApiUrl = geofenceUrl;
        c.modResults.fetchRealTimeINAPPURL = rtInApp;
        if (!Array.isArray(c.modResults.UIBackgroundModes)) {
            c.modResults.UIBackgroundModes = [];
        }
        if (!c.modResults.UIBackgroundModes.includes('remote-notification')) {
            c.modResults.UIBackgroundModes.push('remote-notification');
        }
        return c;
    });
};
/** Merges App Group id into signed entitlements (required by iOS for shared group containers). */
const withDengageAppGroupEntitlements = (config, props) => {
    return (0, config_plugins_1.withEntitlementsPlist)(config, (c) => {
        var _a;
        const groupId = (_a = props.iosAppGroup) === null || _a === void 0 ? void 0 : _a.trim();
        if (!groupId) {
            return c;
        }
        const existing = c.modResults[IOS_APP_GROUPS_ENTITLEMENT];
        const merged = new Set();
        if (Array.isArray(existing)) {
            for (const entry of existing) {
                if (typeof entry === 'string' && entry.trim()) {
                    merged.add(entry.trim());
                }
            }
        }
        else if (typeof existing === 'string' && existing.trim()) {
            merged.add(existing.trim());
        }
        merged.add(groupId);
        c.modResults[IOS_APP_GROUPS_ENTITLEMENT] = Array.from(merged);
        return c;
    });
};
const withDengageIosGeofencePodEnv = (config, props) => {
    if (!props.iosGeofenceEnabled) {
        return config;
    }
    return (0, config_plugins_1.withDangerousMod)(config, [
        'ios',
        async (c) => {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
            let contents = fs.readFileSync(podfilePath, 'utf8');
            const line = "ENV['install_dengage_geofence'] = '1'";
            if (contents.includes("install_dengage_geofence")) {
                return c;
            }
            const anchor = "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";
            if (contents.includes(anchor)) {
                contents = contents.replace(anchor, `${anchor}\n\n${line}`);
            }
            else {
                contents = `${line}\n${contents}`;
            }
            fs.writeFileSync(podfilePath, contents);
            return c;
        },
    ]);
};
const withDengageAppDelegate = (config, props) => {
    const ask = props.iosAskNotificationPermission !== false;
    const geo = props.iosGeofenceEnabled === true;
    const logVis = props.logEnabled === true;
    const iosDevFromBuild = props.iosDevelopmentStatusFromBuild !== false;
    const developmentStatusSwift = iosDevFromBuild
        ? `
#if DEBUG
    Dengage.setDevelopmentStatus(isDebug: true)
#else
    Dengage.setDevelopmentStatus(isDebug: false)
#endif`
        : `
    Dengage.setDevelopmentStatus(isDebug: false)`;
    return (0, config_plugins_1.withDangerousMod)(config, [
        'ios',
        async (c) => {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const projectName = c.modRequest.projectName;
            if (!projectName) {
                throw new Error('@dengage-tech/expo-dengage: Could not resolve iOS project name.');
            }
            const appDelegatePath = path.join(c.modRequest.platformProjectRoot, projectName, 'AppDelegate.swift');
            if (!fs.existsSync(appDelegatePath)) {
                throw new Error(`@dengage-tech/expo-dengage: AppDelegate.swift not found at ${appDelegatePath}`);
            }
            let contents = fs.readFileSync(appDelegatePath, 'utf8');
            if (contents.includes('@generated begin @dengage-tech/expo-dengage')) {
                return c;
            }
            if (!contents.includes('import UserNotifications')) {
                contents = contents.replace('import ReactAppDependencyProvider', 'import ReactAppDependencyProvider\nimport UserNotifications\nimport react_native_dengage');
            }
            else if (!contents.includes('import react_native_dengage')) {
                contents = contents.replace('import UserNotifications', 'import UserNotifications\nimport react_native_dengage');
            }
            if (!contents.includes('import Dengage')) {
                contents = contents.replace('import react_native_dengage', 'import react_native_dengage\nimport Dengage');
            }
            const setupSnippet = `${SWIFT_BEGIN}
    UNUserNotificationCenter.current().delegate = self
    let dengageCoordinator = DengageRNCoordinator.staticInstance
    dengageCoordinator.setupDengage(
      key: ${JSON.stringify(props.iosIntegrationKey)} as NSString,
      appGroupsKey: ${JSON.stringify(props.iosAppGroup)} as NSString,
      launchOptions: launchOptions as NSDictionary?,
      application: application,
      askNotificationPermission: ${ask ? 'true' : 'false'},
      enableGeoFence: ${geo ? 'true' : 'false'},
      disableOpenURL: false,
      badgeCountReset: false,
      logVisible: ${logVis ? 'true' : 'false'}
    )${developmentStatusSwift}
${SWIFT_END}`;
            const anchor = 'window = UIWindow(frame: UIScreen.main.bounds)';
            if (!contents.includes(anchor)) {
                throw new Error('@dengage-tech/expo-dengage: Unexpected AppDelegate.swift template (window line missing).');
            }
            contents = contents.replace(`${anchor}\n    factory.startReactNative(`, `${anchor}\n${setupSnippet}\n    factory.startReactNative(`);
            const tokenOverride = `
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    DengageRNCoordinator.staticInstance.registerForPushToken(deviceToken: deviceToken)
  }
`;
            const linkingMarker = '  // Linking API';
            if (!contents.includes('registerForPushToken(deviceToken:') &&
                contents.includes(linkingMarker)) {
                contents = contents.replace(linkingMarker, `${tokenOverride}\n${linkingMarker}`);
            }
            const extensionBlock = `
${EXT_BEGIN}
extension AppDelegate: UNUserNotificationCenterDelegate {
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    DengageRNCoordinator.staticInstance.didReceivePush(
      center,
      response,
      withCompletionHandler: completionHandler
    )
  }
}
${EXT_END}
`;
            contents += extensionBlock;
            fs.writeFileSync(appDelegatePath, contents);
            return c;
        },
    ]);
};
const withDengageIos = (config, props) => {
    config = withDengageInfoPlist(config, props);
    config = withDengageAppGroupEntitlements(config, props);
    config = withDengageIosGeofencePodEnv(config, props);
    config = withDengageAppDelegate(config, props);
    return config;
};
exports.withDengageIos = withDengageIos;
