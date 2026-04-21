import { ConfigPlugin, withDangerousMod, withInfoPlist } from '@expo/config-plugins';
import type { DengageExpoPluginProps } from './types';

const SWIFT_BEGIN = '    // @generated begin @dengage-tech/expo-dengage';
const SWIFT_END = '    // @generated end @dengage-tech/expo-dengage';

const EXT_BEGIN = '// @generated begin @dengage-tech/expo-dengage-extension';
const EXT_END = '// @generated end @dengage-tech/expo-dengage-extension';

const withDengageInfoPlist: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  const pushUrl = props.dengagePushApiUrl ?? 'https://tr-push.dengage.com';
  const eventUrl = props.dengageEventApiUrl ?? 'https://tr-event.dengage.com';
  const deviceUrl = props.dengageDeviceIdApiUrl ?? 'https://tr-push.dengage.com';
  const inAppUrl = props.dengageInAppApiUrl ?? 'https://tr-push.dengage.com';
  const geofenceUrl = props.dengageGeofenceApiUrl ?? 'https://tr-push.dengage.com/geoapi/';
  const rtInApp = props.fetchRealTimeInAppApiUrl ?? 'https://tr-inapp.dengage.com';

  return withInfoPlist(config, (c) => {
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

const withDengageIosGeofencePodEnv: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  if (!props.iosGeofenceEnabled) {
    return config;
  }
  return withDangerousMod(config, [
    'ios',
    async (c) => {
      const fs = await import('fs');
      const path = await import('path');
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      const line = "ENV['install_dengage_geofence'] = '1'";
      if (contents.includes("install_dengage_geofence")) {
        return c;
      }
      const anchor = "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n\n${line}`);
      } else {
        contents = `${line}\n${contents}`;
      }
      fs.writeFileSync(podfilePath, contents);
      return c;
    },
  ]);
};

const withDengageAppDelegate: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
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

  return withDangerousMod(config, [
    'ios',
    async (c) => {
      const fs = await import('fs');
      const path = await import('path');
      const projectName = c.modRequest.projectName;
      if (!projectName) {
        throw new Error('@dengage-tech/expo-dengage: Could not resolve iOS project name.');
      }
      const appDelegatePath = path.join(
        c.modRequest.platformProjectRoot,
        projectName,
        'AppDelegate.swift'
      );
      if (!fs.existsSync(appDelegatePath)) {
        throw new Error(`@dengage-tech/expo-dengage: AppDelegate.swift not found at ${appDelegatePath}`);
      }
      let contents = fs.readFileSync(appDelegatePath, 'utf8');
      if (contents.includes('@generated begin @dengage-tech/expo-dengage')) {
        return c;
      }

      if (!contents.includes('import UserNotifications')) {
        contents = contents.replace(
          'import ReactAppDependencyProvider',
          'import ReactAppDependencyProvider\nimport UserNotifications\nimport react_native_dengage'
        );
      } else if (!contents.includes('import react_native_dengage')) {
        contents = contents.replace(
          'import UserNotifications',
          'import UserNotifications\nimport react_native_dengage'
        );
      }

      if (!contents.includes('import Dengage')) {
        contents = contents.replace(
          'import react_native_dengage',
          'import react_native_dengage\nimport Dengage'
        );
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
      contents = contents.replace(
        `${anchor}\n    factory.startReactNative(`,
        `${anchor}\n${setupSnippet}\n    factory.startReactNative(`
      );

      const tokenOverride = `
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    DengageRNCoordinator.staticInstance.registerForPushToken(deviceToken: deviceToken)
  }
`;
      const linkingMarker = '  // Linking API';
      if (
        !contents.includes('registerForPushToken(deviceToken:') &&
        contents.includes(linkingMarker)
      ) {
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

export const withDengageIos: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  config = withDengageInfoPlist(config, props);
  config = withDengageIosGeofencePodEnv(config, props);
  config = withDengageAppDelegate(config, props);
  return config;
};
