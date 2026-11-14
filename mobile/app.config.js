// Extends app.json. Google Sign-In is native code whose iOS URL scheme is the reversed iOS client ID,
// so its config plugin is only added once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set; builds without it
// simply have no Google button.
const IOS_CLIENT_SUFFIX = '.apps.googleusercontent.com';

// EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=false builds without the Sign in with Apple entitlement (for a team whose App ID
// does not have the capability yet); the app then hides the Apple button too.
// Prebuild applies expo-apple-authentication's plugin by itself whenever the package is installed, so the
// entitlement is also removed explicitly.
const {withEntitlementsPlist} = require('expo/config-plugins');

const stripAppleSignInEntitlement = config =>
    withEntitlementsPlist(config, mod => {
        delete mod.modResults['com.apple.developer.applesignin'];
        return mod;
    });

function withoutAppleSignIn(config) {
    return {
        ...config,
        ios: {...config.ios, usesAppleSignIn: false},
        plugins: [
            ...(config.plugins ?? []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-apple-authentication'),
            stripAppleSignInEntitlement,
        ],
    };
}

// TestFlight/App Store builds must register with the production APNs environment; dev builds keep the default.
function withProductionPush(config) {
    if (process.env.EAS_BUILD_PROFILE !== 'production') return config;
    return {
        ...config,
        plugins: (config.plugins ?? []).map(p =>
            (Array.isArray(p) ? p[0] : p) === 'expo-notifications'
                ? ['expo-notifications', {...(Array.isArray(p) ? p[1] : {}), mode: 'production'}]
                : p,
        ),
    };
}

module.exports = ({config: base}) => {
    const appleAware = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'false' ? withoutAppleSignIn(base) : base;
    const config = withProductionPush(appleAware);
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
