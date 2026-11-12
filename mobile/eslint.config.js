// https://docs.expo.dev/guides/using-eslint/
const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
    expoConfig,
    {
        // src/shared is generated from frontend/src (scripts/sync-shared.mjs) and linted there.
        ignores: ['dist/*', 'ios/*', 'android/*', 'src/shared/*', '.expo/*'],
    },
]);
