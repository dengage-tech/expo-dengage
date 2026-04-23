import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
  withProjectBuildGradle,
} from '@expo/config-plugins';
import type { DengageExpoPluginProps } from './types';

const BEGIN = '// @generated begin @dengage-tech/expo-dengage';
const END = '// @generated end @dengage-tech/expo-dengage';

function ensureInternetPermission(androidManifest: AndroidConfig.Manifest.AndroidManifest) {
  const root = androidManifest.manifest;
  if (!root) {
    return;
  }
  if (!root['uses-permission']) {
    root['uses-permission'] = [];
  }
  const perms = root['uses-permission']!;
  const hasInternet = perms.some(
    (p: { $?: { 'android:name'?: string } }) => p.$?.['android:name'] === 'android.permission.INTERNET'
  );
  if (!hasInternet) {
    perms.push({ $: { 'android:name': 'android.permission.INTERNET' } });
  }
}

function hasFcmService(mainApplication: AndroidConfig.Manifest.ManifestApplication): boolean {
  const services = mainApplication.service ?? [];
  return services.some((s) => s.$?.['android:name'] === 'com.dengage.sdk.push.FcmMessagingService');
}

function hasHmsService(mainApplication: AndroidConfig.Manifest.ManifestApplication): boolean {
  const services = mainApplication.service ?? [];
  return services.some((s) => s.$?.['android:name'] === 'com.dengage.sdk.HmsMessagingService');
}

function hasDengageReceiver(
  mainApplication: AndroidConfig.Manifest.ManifestApplication,
  receiverClass: string
): boolean {
  const receivers = mainApplication.receiver ?? [];
  return receivers.some((r) => r.$?.['android:name'] === receiverClass);
}

const withDengageGeofenceGradleProperty: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  if (!props.androidGeofenceEnabled) {
    return config;
  }
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const fs = await import('fs');
      const path = await import('path');
      const gradlePropsPath = path.join(c.modRequest.platformProjectRoot, 'gradle.properties');
      let contents = fs.readFileSync(gradlePropsPath, 'utf8');
      if (contents.includes('INSTALL_DENGAGE_GEOFENCE=')) {
        contents = contents.replace(
          /INSTALL_DENGAGE_GEOFENCE=.*/g,
          'INSTALL_DENGAGE_GEOFENCE=true'
        );
      } else {
        contents += `\nINSTALL_DENGAGE_GEOFENCE=true\n`;
      }
      fs.writeFileSync(gradlePropsPath, contents);
      return c;
    },
  ]);
};

const withDengageProjectGradle: ConfigPlugin<DengageExpoPluginProps> = (config) => {
  return withProjectBuildGradle(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes('com.google.gms:google-services')) {
      c.modResults.contents = contents;
      return c;
    }
    const needle = "classpath('com.facebook.react:react-native-gradle-plugin')";
    if (contents.includes(needle)) {
      contents = contents.replace(
        needle,
        `${needle}\n    classpath('com.google.gms:google-services:4.4.2')`
      );
    } else {
      contents = contents.replace(
        /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/,
        `$1\n    classpath('com.google.gms:google-services:4.4.2')`
      );
    }
    c.modResults.contents = contents;
    return c;
  });
};

const withDengageAppGradle: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  return withAppBuildGradle(config, (c) => {
    let contents = c.modResults.contents;

    if (!contents.includes('com.google.gms.google-services')) {
      const applyLine = 'apply plugin: "com.android.application"';
      if (contents.includes(applyLine)) {
        contents = contents.replace(
          applyLine,
          `${applyLine}\napply plugin: "com.google.gms.google-services"`
        );
      } else {
        contents = `apply plugin: "com.google.gms.google-services"\n${contents}`;
      }
    }

    // App module must compile against Dengage SDK types used in generated MainApplication / receiver.
    if (!contents.includes('com.github.dengage-tech.dengage-android-sdk')) {
      const geofenceLine = props.androidGeofenceEnabled
        ? "\n    implementation 'com.github.dengage-tech.dengage-android-sdk:sdk-geofence:6.0.88'"
        : '';
      contents = contents.replace(
        /^dependencies\s*\{/m,
        `dependencies {\n    implementation 'com.github.dengage-tech.dengage-android-sdk:sdk:6.0.88'${geofenceLine}`
      );
    }

    c.modResults.contents = contents;
    return c;
  });
};

const withDengageAndroidManifest: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  const eventUrl = props.dengageEventApiUrl ?? 'https://tr-event.dengage.com';
  const pushUrl = props.dengagePushApiUrl ?? 'https://tr-push.dengage.com';
  const deviceUrl = props.dengageDeviceIdApiUrl ?? 'https://tr-push.dengage.com';
  const inAppUrl = props.dengageInAppApiUrl ?? 'https://tr-push.dengage.com';
  const geofenceUrl = props.dengageGeofenceApiUrl ?? 'https://tr-push.dengage.com/geoapi/';
  const rtInApp = props.fetchRealTimeInAppApiUrl ?? 'https://tr-inapp.dengage.com';

  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    ensureInternetPermission(manifest);

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    mainApplication.service = mainApplication.service ?? [];
    mainApplication.receiver = mainApplication.receiver ?? [];

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

    const pkg = AndroidConfig.Package.getPackage(c);
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

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'den_event_api_url',
      eventUrl
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'den_push_api_url',
      pushUrl
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'den_device_id_api_url',
      deviceUrl
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'den_in_app_api_url',
      inAppUrl
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'den_geofence_api_url',
      geofenceUrl
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'fetch_real_time_in_app_api_url',
      rtInApp
    );

    return c;
  });
};

const withDengagePushReceiverSource: ConfigPlugin<DengageExpoPluginProps> = (config) => {
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const pkg = AndroidConfig.Package.getPackage(c);
      if (!pkg) {
        throw new Error('@dengage-tech/expo-dengage: android.package missing.');
      }
      const pkgPath = pkg.replace(/\./g, '/');
      const fs = await import('fs');
      const path = await import('path');
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

const withDengageMainApplication: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  const pref =
    props.androidDeviceConfiguration === 'Huawei'
      ? 'com.dengage.sdk.data.remote.api.DeviceConfigurationPreference.Huawei'
      : 'com.dengage.sdk.data.remote.api.DeviceConfigurationPreference.Google';

  const geo = props.androidGeofenceEnabled === true;
  const hms = props.androidHmsEnabled === true;
  const logEn = props.logEnabled === true;
  const devFromBuild = props.androidDevelopmentStatusFromBuild !== false;

  const bodyBlock = `${BEGIN}
    DengageRNCoordinator.sharedInstance.setupDengage(
      firebaseIntegrationKey = ${JSON.stringify(props.androidFirebaseIntegrationKey)},
      huaweiIntegrationKey = ${hms ? JSON.stringify(props.androidHuaweiIntegrationKey ?? '') : 'null'},
      context = this,
      dengageHmsManager = ${hms ? 'DengageHmsManager()' : 'null'},
      deviceConfigurationPreference = ${pref},
      disableOpenWebUrl = false,
      logEnabled = ${logEn ? 'true' : 'false'},
      enableGeoFence = ${geo ? 'true' : 'false'},
      developmentStatus = ${devFromBuild ? 'BuildConfig.DEBUG' : 'false'}
    )
${END}`;

  return withMainApplication(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes(BEGIN)) {
      return c;
    }

    if (!contents.includes('import com.dengagetech.reactnativedengage.DengageRNCoordinator')) {
      contents = contents.replace(
        /^package .+\n/m,
        (m) =>
          `${m}import com.dengagetech.reactnativedengage.DengageRNCoordinator\n${
            hms ? 'import com.dengage.hms.DengageHmsManager\n' : ''
          }`
      );
    } else if (hms && !contents.includes('import com.dengage.hms.DengageHmsManager')) {
      contents = contents.replace(
        'import com.dengagetech.reactnativedengage.DengageRNCoordinator',
        'import com.dengagetech.reactnativedengage.DengageRNCoordinator\nimport com.dengage.hms.DengageHmsManager'
      );
    }

    const anchor = 'ApplicationLifecycleDispatcher.onApplicationCreate(this)';
    if (contents.includes(anchor)) {
      contents = contents.replace(anchor, `${anchor}\n${bodyBlock}`);
    } else {
      throw new Error(
        '@dengage-tech/expo-dengage: Could not find ApplicationLifecycleDispatcher.onApplicationCreate(this) in MainApplication.'
      );
    }

    c.modResults.contents = contents;
    return c;
  });
};

export const withDengageAndroid: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  config = withDengageGeofenceGradleProperty(config, props);
  config = withDengageProjectGradle(config, props);
  config = withDengageAppGradle(config, props);
  config = withDengageAndroidManifest(config, props);
  config = withDengagePushReceiverSource(config, props);
  config = withDengageMainApplication(config, props);
  return config;
};
