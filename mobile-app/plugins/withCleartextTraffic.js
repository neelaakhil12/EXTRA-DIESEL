const { withAndroidManifest } = require('@expo/config-plugins');

const withCleartextTraffic = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (androidManifest?.manifest?.application?.[0]) {
      const mainApplication = androidManifest.manifest.application[0];
      mainApplication.$ = mainApplication.$ || {};
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
};

module.exports = withCleartextTraffic;
