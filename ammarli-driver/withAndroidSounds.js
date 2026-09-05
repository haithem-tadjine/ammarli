const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to copy sound files from assets/sounds/
 * to android/app/src/main/res/raw during expo prebuild.
 */
module.exports = function withAndroidSounds(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot =
        config.modRequest.platformProjectRoot || path.join(projectRoot, 'android');
      const rawDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'raw');

      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }

      const soundsDir = path.join(projectRoot, 'assets', 'sounds');
      if (fs.existsSync(soundsDir)) {
        const files = fs.readdirSync(soundsDir);
        for (const file of files) {
          if (/\.(mp3|wav|ogg|m4a)$/i.test(file)) {
            const srcPath = path.join(soundsDir, file);
            const destPath = path.join(rawDir, file.toLowerCase());
            fs.copyFileSync(srcPath, destPath);
            console.log(
              `[withAndroidSounds] Copied ${file} -> android/app/src/main/res/raw/${file.toLowerCase()}`
            );
          }
        }
      }

      return config;
    },
  ]);
};
