export type AndroidDeviceConfigurationPreference = 'Google' | 'Huawei';
export type DengageExpoPluginProps = {
    /** Required for Android native init (DengageRNCoordinator.setupDengage). */
    androidFirebaseIntegrationKey: string;
    /** Optional HMS key; only used when `androidHmsEnabled` is true. */
    androidHuaweiIntegrationKey?: string | null;
    /** Adds `sdk-geofence` via `INSTALL_DENGAGE_GEOFENCE=true` in `gradle.properties`. Default: false. */
    androidGeofenceEnabled?: boolean;
    /**
     * Registers HMS messaging service in the manifest and passes HMS manager to setupDengage.
     * AgConnect / HMS Gradle wiring may still require manual steps beyond the plugin.
     * Default: false.
     */
    androidHmsEnabled?: boolean;
    /** Passed to `DeviceConfigurationPreference`. Default: Google. */
    androidDeviceConfiguration?: AndroidDeviceConfigurationPreference;
    /** Required for iOS `DengageRNCoordinator.setupDengage`. */
    iosIntegrationKey: string;
    /** App Group id shared with notification extensions when used. */
    iosAppGroup: string;
    /** Sets `install_dengage_geofence=1` for CocoaPods when true. Default: false. */
    iosGeofenceEnabled?: boolean;
    /** Default: true */
    iosAskNotificationPermission?: boolean;
    /**
     * When true (default), injects `Dengage.setDevelopmentStatus` in AppDelegate: **true** in `#if DEBUG`, **false** in Release — mirrors Android `androidDevelopmentStatusFromBuild` + `BuildConfig.DEBUG`.
     * Set to `false` to always call `setDevelopmentStatus(false)` on iOS.
     */
    iosDevelopmentStatusFromBuild?: boolean;
    /** Android `<meta-data android:name="den_*" />` and iOS plist URL keys. */
    dengageEventApiUrl?: string;
    dengagePushApiUrl?: string;
    dengageDeviceIdApiUrl?: string;
    dengageInAppApiUrl?: string;
    dengageGeofenceApiUrl?: string;
    fetchRealTimeInAppApiUrl?: string;
    /** Android `setupDengage(logEnabled=...)`. Default: false */
    logEnabled?: boolean;
    /** Android `setupDengage(developmentStatus=...)`. Default: follows BuildConfig.DEBUG in injected snippet */
    androidDevelopmentStatusFromBuild?: boolean;
};
