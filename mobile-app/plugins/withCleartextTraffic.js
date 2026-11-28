const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

const withCleartextTraffic = (config) => {
  // 1. Android Manifest updates (Cleartext Traffic + Picture-in-Picture + configChanges)
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (androidManifest?.manifest?.application?.[0]) {
      const mainApplication = androidManifest.manifest.application[0];
      mainApplication.$ = mainApplication.$ || {};
      mainApplication.$['android:usesCleartextTraffic'] = 'true';

      if (Array.isArray(mainApplication.activity)) {
        const mainActivity = mainApplication.activity.find(
          (a) => a.$ && a.$['android:name'] === '.MainActivity'
        );
        if (mainActivity) {
          mainActivity.$['android:supportsPictureInPicture'] = 'true';

          // PiP requires smallestScreenSize and screenLayout in configChanges
          const existingConfig = mainActivity.$['android:configChanges'] || '';
          const currentConfigs = existingConfig ? existingConfig.split('|').filter(Boolean) : [];
          const neededConfigs = ['smallestScreenSize', 'screenLayout', 'screenSize', 'orientation'];
          neededConfigs.forEach((cfg) => {
            if (!currentConfigs.includes(cfg)) {
              currentConfigs.push(cfg);
            }
          });
          mainActivity.$['android:configChanges'] = currentConfigs.join('|');
        }
      }
    }
    return config;
  });

  // 2. MainActivity updates (onResume with setAutoEnterEnabled for Android 12+, onUserLeaveHint for Android 8+)
  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    // Remove any previous PiP callback blocks if present to keep code clean & up-to-date
    if (contents.includes('onUserLeaveHint')) {
      const startIdx = contents.indexOf('/**\n   * Automatically trigger native Android Picture-in-Picture');
      if (startIdx !== -1) {
        const lastBrace = contents.lastIndexOf('}');
        if (lastBrace > startIdx) {
          contents = contents.slice(0, startIdx) + contents.slice(lastBrace);
        }
      }
    }

    if (!contents.includes('setAutoEnterEnabled')) {
      const pipCallbacks = `
  /**
   * Automatically trigger native Android Picture-in-Picture floating window
   * on top of Google Maps when navigating or user leaves app
   */
  override fun onResume() {
    super.onResume()
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
      try {
        val rational = android.util.Rational(16, 9)
        val params = android.app.PictureInPictureParams.Builder()
          .setAspectRatio(rational)
          .setAutoEnterEnabled(true)
          .build()
        setPictureInPictureParams(params)
      } catch (e: Exception) {}
    }
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      try {
        val rational = android.util.Rational(16, 9)
        val builder = android.app.PictureInPictureParams.Builder().setAspectRatio(rational)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
          builder.setAutoEnterEnabled(true)
        }
        enterPictureInPictureMode(builder.build())
      } catch (e: Exception) {}
    }
  }
`;
      const lastIndex = contents.lastIndexOf('}');
      if (lastIndex !== -1) {
        contents = contents.slice(0, lastIndex) + pipCallbacks + '\n}';
      }
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withCleartextTraffic;
