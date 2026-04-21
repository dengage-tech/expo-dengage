"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const withDengageAndroid_1 = require("./withDengageAndroid");
const withDengageIos_1 = require("./withDengageIos");
function assertValid(props) {
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
            throw new Error('@dengage-tech/expo-dengage: `androidHuaweiIntegrationKey` is required when `androidHmsEnabled` is true.');
        }
    }
}
const withDengageExpoPlugin = (config, props) => {
    if (!props) {
        throw new Error('@dengage-tech/expo-dengage: plugin configuration object is required.');
    }
    assertValid(props);
    config = (0, withDengageAndroid_1.withDengageAndroid)(config, props);
    config = (0, withDengageIos_1.withDengageIos)(config, props);
    return config;
};
exports.default = withDengageExpoPlugin;
