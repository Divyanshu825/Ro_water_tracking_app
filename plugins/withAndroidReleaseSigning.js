// Expo config plugin: configurable release signing for the generated android/ project.
// android/ is generated (CNG), so this is re-applied on every `expo prebuild`.
//
// Credentials are NEVER stored in source. Provide them via (first match wins):
//   1. environment variables
//   2. android/keystore.properties   (untracked; android/ is gitignored)
//   3. ~/.gradle/gradle.properties   (or -P flags)
// Keys: BOTTLETRACK_STORE_FILE, BOTTLETRACK_STORE_PASSWORD, BOTTLETRACK_KEY_ALIAS, BOTTLETRACK_KEY_PASSWORD
// If any are missing, release falls back to the debug keystore (installable, NOT Play-Store-ready).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// [bottletrack] release signing';

const HELPER = `${MARKER}
def keystoreProps = new Properties()
def keystorePropsFile = rootProject.file('keystore.properties')
if (keystorePropsFile.exists()) { keystorePropsFile.withInputStream { keystoreProps.load(it) } }
def signingProp = { String name -> System.getenv(name) ?: keystoreProps.getProperty(name) ?: findProperty(name) }
def hasReleaseSigning = ['BOTTLETRACK_STORE_FILE', 'BOTTLETRACK_STORE_PASSWORD', 'BOTTLETRACK_KEY_ALIAS', 'BOTTLETRACK_KEY_PASSWORD'].every { signingProp(it) }
if (!hasReleaseSigning) {
    logger.warn("WARNING: release signing is not configured - signing release with the DEBUG keystore. See README 'Android release builds'.")
}
`;

const RELEASE_SIGNING = `
        release {
            if (hasReleaseSigning) {
                storeFile file(signingProp('BOTTLETRACK_STORE_FILE'))
                storePassword signingProp('BOTTLETRACK_STORE_PASSWORD')
                keyAlias signingProp('BOTTLETRACK_KEY_ALIAS')
                keyPassword signingProp('BOTTLETRACK_KEY_PASSWORD')
            }
        }`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    src = src.replace(/(def projectRoot[^\n]*\n)/, `$1\n${HELPER}`);
    src = src.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_SIGNING}`);
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig hasReleaseSigning ? signingConfigs.release : signingConfigs.debug'
    );

    if (!src.includes('signingConfigs.release : signingConfigs.debug')) {
      throw new Error('withAndroidReleaseSigning: failed to patch release buildType');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
