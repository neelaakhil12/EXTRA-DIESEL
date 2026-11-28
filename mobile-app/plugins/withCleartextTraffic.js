const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

const withCleartextTraffic = (config) => {
  // 1. Android Manifest updates (Cleartext Traffic + Picture-in-Picture)
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
        }
      }
    }
    return config;
  });

  // 2. MainActivity updates (onUserLeaveHint callback to enter PiP when switching to Google Maps)
  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('onUserLeaveHint')) {
      const pipImports = `import android.app.PictureInPictureParams\nimport android.util.Rational\nimport android.os.Build\n`;
      contents = pipImports + contents;

      const pipCallback = `
  /**
   * Automatically trigger native Android Picture-in-Picture floating window
   * on top of Google Maps when navigating or user leaves app
   */
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        val rational = Rational(16, 9)
        val builder = PictureInPictureParams.Builder().setAspectRatio(rational)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          builder.setAutoEnterEnabled(true)
        }
        enterPictureInPictureMode(builder.build())
      } catch (e: Exception) {}
    }
  }
`;
      const lastIndex = contents.lastIndexOf('}');
      if (lastIndex !== -1) {
        contents = contents.slice(0, lastIndex) + pipCallback + '\n}';
      }
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withCleartextTraffic;
