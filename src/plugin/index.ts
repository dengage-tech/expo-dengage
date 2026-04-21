import { ConfigPlugin } from '@expo/config-plugins';
import type { DengageExpoPluginProps } from './types';
import { withDengageAndroid } from './withDengageAndroid';
import { withDengageIos } from './withDengageIos';

function assertValid(props: DengageExpoPluginProps) {
  if (!props.androidFirebaseIntegrationKey) {
    throw new Error('@dengage-tech/expo-dengage: `androidFirebaseIntegrationKey` is required.');
  }
  if (!props.iosIntegrationKey) {
    throw new Error('@dengage-tech/expo-dengage: `iosIntegrationKey` is required.');
  }
  if (!props.iosAppGroup) {
    throw new Error('@dengage-tech/expo-dengage: `iosAppGroup` is required.');
  }
  if (props.androidHmsEnabled) {
    if (!props.androidHuaweiIntegrationKey) {
      throw new Error(
        '@dengage-tech/expo-dengage: `androidHuaweiIntegrationKey` is required when `androidHmsEnabled` is true.'
      );
    }
  }
}

const withDengageExpoPlugin: ConfigPlugin<DengageExpoPluginProps> = (config, props) => {
  if (!props) {
    throw new Error('@dengage-tech/expo-dengage: plugin configuration object is required.');
  }
  assertValid(props);
  config = withDengageAndroid(config, props);
  config = withDengageIos(config, props);
  return config;
};

export default withDengageExpoPlugin;
