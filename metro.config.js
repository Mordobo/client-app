const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: resolve internal modules in @react-navigation/core (e.g. NavigationBuilderContext.js).
// React Native 0.79+ enables package exports by default, which can break resolution.
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
  resolveRequest: (context, moduleName, platform) => {
    // make-plural has no "main" field, only "exports" -> ./plurals.js. With package
    // exports disabled we must resolve it explicitly for i18n-js.
    if (moduleName === 'make-plural') {
      const makePluralPath = path.join(__dirname, 'node_modules', 'make-plural', 'plurals.js');
      const fs = require('fs');
      if (fs.existsSync(makePluralPath)) {
        return { type: 'sourceFile', filePath: makePluralPath };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
