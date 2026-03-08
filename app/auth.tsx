import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Themes, ThemeName, Colors } from '../constants/Colors';
import { useSplittyStore } from '../store/useSplittyStore';
import { StyledInput } from '../components/StyledInput';
import { VibrantButton } from '../components/VibrantButton';
import { GoogleIcon } from '../components/GoogleIcon';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
    const router = useRouter();
    const { colors, designPreference, appearance } = useSplittyStore();

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const [phone, setPhone] = useState('');
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerification, setShowVerification] = useState(false);


    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const isWeb = Platform.OS === 'web';

            // Use a fixed stable redirect URI based on the app bundle scheme.
            // This is registered ONCE in Google Console + Supabase and works
            // on every device without per-device IP registration.
            const redirectUri = isWeb
                ? window.location.origin
                : 'com.manjunath.splitty://';

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: !isWeb,
                },
            });

            if (error) throw error;

            if (!isWeb && data.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

                if (res.type === 'success' && res.url) {
                    // Tokens may be in the fragment (#) or query string (?)
                    const fragment = res.url.split('#')[1] ?? '';
                    const query = res.url.split('?')[1]?.split('#')[0] ?? '';
                    const raw = fragment || query;

                    if (raw) {
                        const params = Object.fromEntries(
                            raw.split('&').map(p => {
                                const [key, ...rest] = p.split('=');
                                return [key, decodeURIComponent(rest.join('='))];
                            })
                        );

                        const { access_token, refresh_token } = params;

                        if (access_token && refresh_token) {
                            const { error: sessionError } = await supabase.auth.setSession({
                                access_token,
                                refresh_token,
                            });
                            if (sessionError) throw sessionError;
                        }
                    }
                } else if (res.type === 'cancel') {
                    // User closed the browser — not an error
                }
            }
        } catch (error: any) {
            Alert.alert('Google Sign In Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSignIn = async () => {
        setLoading(true);
        try {
            // Basic validation
            if (!phone || phone.length < 10) {
                throw new Error('Please enter a valid phone number');
            }

            // Ensure E.164 format if possible, or assume country code if user provides it.
            // For simplicity, let's assume user enters full number or we default to a region if implementing robustly.
            // Here we just pass it to supabase.

            const { error } = await supabase.auth.signInWithOtp({
                phone: phone,
            });
            if (error) throw error;
            setShowVerification(true);
            Alert.alert('OTP Sent', 'Please check your phone for verification code.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                phone: phone,
                token: verificationCode,
                type: 'sms',
            });
            if (error) throw error;
            // Success - session will auto-update
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        if (authMethod === 'phone') {
            if (showVerification) {
                await verifyOtp();
            } else {
                await handlePhoneSignIn();
            }
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                Alert.alert('Sign Up Successful', 'Please check your email for verification link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            {isSkeuomorphic && (
                <LinearGradient
                    colors={skeuo.bgGradient}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}
            <View style={styles.content}>
                <View style={isSkeuomorphic ? [styles.skeuoCardWrapper, skeuo.outset.light] : null}>
                    <View style={isSkeuomorphic ? [styles.skeuoCardInner, skeuo.outset.dark] : null}>
                        <View style={isSkeuomorphic ? styles.skeuoCardContent : null}>
                            <Text style={[styles.title, { color: colors.text }]}>
                                {authMethod === 'phone'
                                    ? (showVerification ? 'Verify Phone' : 'Phone Sign In')
                                    : (isSignUp ? 'Create Account' : 'Welcome Back')}
                            </Text>

                            <View style={[
                                styles.methodToggle,
                                isSkeuomorphic && { backgroundColor: 'transparent', padding: 0 },
                                isSkeuomorphic && skeuo.inset.dark
                            ]}>
                                <View style={isSkeuomorphic ? [styles.skeuoToggleInner, skeuo.inset.light] : { flex: 1, flexDirection: 'row' }}>
                                    <TouchableOpacity
                                        style={[
                                            styles.methodBtn,
                                            authMethod === 'email' && { backgroundColor: isSkeuomorphic ? 'transparent' : colors.primary },
                                            isSkeuomorphic && authMethod === 'email' && skeuo.outset.light
                                        ]}
                                        onPress={() => { setAuthMethod('email'); setShowVerification(false); }}
                                    >
                                        <View style={isSkeuomorphic && authMethod === 'email' ? [styles.skeuoActiveBtn, skeuo.outset.dark] : null}>
                                            <Text style={{ color: (authMethod === 'email' && !isSkeuomorphic) ? 'white' : (authMethod === 'email' ? colors.primary : colors.textSecondary), fontWeight: authMethod === 'email' ? '700' : '400' }}>Email</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.methodBtn,
                                            authMethod === 'phone' && { backgroundColor: isSkeuomorphic ? 'transparent' : colors.primary },
                                            isSkeuomorphic && authMethod === 'phone' && skeuo.outset.light
                                        ]}
                                        onPress={() => { setAuthMethod('phone'); setShowVerification(false); }}
                                    >
                                        <View style={isSkeuomorphic && authMethod === 'phone' ? [styles.skeuoActiveBtn, skeuo.outset.dark] : null}>
                                            <Text style={{ color: (authMethod === 'phone' && !isSkeuomorphic) ? 'white' : (authMethod === 'phone' ? colors.primary : colors.textSecondary), fontWeight: authMethod === 'phone' ? '700' : '400' }}>Phone</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {authMethod === 'email' ? (
                                <>
                                    <StyledInput
                                        label="Email"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        placeholder="Enter your email"
                                    />
                                    <StyledInput
                                        label="Password"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        placeholder="Enter your password"
                                    />
                                </>
                            ) : (
                                <>
                                    {!showVerification ? (
                                        <StyledInput
                                            label="Phone Number"
                                            value={phone}
                                            onChangeText={setPhone}
                                            placeholder="+1234567890"
                                            keyboardType="phone-pad"
                                        />
                                    ) : (
                                        <StyledInput
                                            label="Verification Code"
                                            value={verificationCode}
                                            onChangeText={setVerificationCode}
                                            placeholder="123456"
                                            keyboardType="number-pad"
                                        />
                                    )}
                                </>
                            )}

                            <VibrantButton
                                title={loading ? 'Please wait...' : (authMethod === 'phone' ? (showVerification ? 'Verify' : 'Send Code') : (isSignUp ? 'Sign Up' : 'Sign In'))}
                                onPress={handleAuth}
                                disabled={loading}
                                style={styles.button}
                            />

                            {authMethod === 'email' && (
                                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleButton}>
                                    <Text style={{ color: colors.primary }}>
                                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.divider}>
                                <View style={[styles.line, { backgroundColor: colors.border }]} />
                                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                                <View style={[styles.line, { backgroundColor: colors.border }]} />
                            </View>

                            <VibrantButton
                                title="Continue with Google"
                                onPress={handleGoogleSignIn}
                                variant="outline"
                                disabled={loading}
                                leftIcon={<GoogleIcon />}
                                style={styles.googleButton}
                                textStyle={styles.googleButtonText}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center',
    },
    button: {
        marginTop: 16,
    },
    toggleButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    line: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    googleButton: {
        marginTop: 0,
        height: 56,
        borderRadius: 12,
    },
    googleButtonText: {
        fontSize: 19,
        fontWeight: '600',
    },
    methodToggle: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: 'rgba(150,150,150,0.1)',
        padding: 4,
        borderRadius: 12,
    },
    methodBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    skeuoCardWrapper: {
        borderRadius: 28,
    },
    skeuoCardInner: {
        borderRadius: 28,
    },
    skeuoCardContent: {
        padding: 24,
        borderRadius: 28,
    },
    skeuoToggleInner: {
        flex: 1,
        flexDirection: 'row',
        padding: 4,
        borderRadius: 24,
    },
    skeuoActiveBtn: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    }
});
