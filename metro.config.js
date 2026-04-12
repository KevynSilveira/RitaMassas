const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const stubPath = path.resolve(__dirname, 'lib/stubs/expo-sqlite-web-stub.js');

const orig = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'expo-sqlite' || moduleName.startsWith('expo-sqlite/')) {
      return { type: 'sourceFile', filePath: stubPath };
    }
  }
  if (typeof orig === 'function') {
    return orig(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
