// Extends app.json. Google Sign-In is native code whose iOS URL scheme is the reversed iOS client ID,
// so its config plugin is only added once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set; builds without it
// simply have no Google button.
const IOS_CLIENT_SUFFIX = '.apps.googleusercontent.com';

module.exports = ({config}) => {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
    if (!iosClientId) return config;
    if (!iosClientId.endsWith(IOS_CLIENT_SUFFIX))
        throw new Error(`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must end with ${IOS_CLIENT_SUFFIX}`);
    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.slice(0, -IOS_CLIENT_SUFFIX.length)}`;
    return {
        ...config,
        plugins: [...(config.plugins ?? []), ['@react-native-google-signin/google-signin', {iosUrlScheme}]],
    };
};
