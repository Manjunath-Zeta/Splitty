import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useSplittyStore } from '../store/useSplittyStore';
import { StyledInput } from '../components/StyledInput';
import { VibrantButton } from '../components/VibrantButton';
import { GoogleIcon } from '../components/GoogleIcon';

WebBrowser.maybeCompleteAuthSession();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AuthScreen() {
    const { colors, designPreference, appearance } = useSplittyStore();
    const router = useRouter();
    
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerification, setShowVerification] = useState(false);


    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const isWeb = Platform.OS === 'web';
            const redirectUri = isWeb ? window.location.origin : 'com.manjunath.splitty://';

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUri, skipBrowserRedirect: !isWeb },
            });

            if (error) throw error;

            if (!isWeb && data.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
                if (res.type === 'success' && res.url) {
                    const raw = res.url.split('#')[1] || res.url.split('?')[1]?.split('#')[0];
                    if (raw) {
                        const params = Object.fromEntries(raw.split('&').map(p => {
                            const [key, ...rest] = p.split('=');
                            return [key, decodeURIComponent(rest.join('='))];
                        }));
                        const { access_token, refresh_token } = params;
                        if (access_token && refresh_token) {
                            await supabase.auth.setSession({ access_token, refresh_token });
                        }
                    }
                }
            }
        } catch (error: any) {
            Alert.alert('Google Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        if (authMethod === 'phone') {
            setLoading(true);
            try {
                if (!showVerification) {
                    const { error } = await supabase.auth.signInWithOtp({ phone });
                    if (error) throw error;
                    setShowVerification(true);
                    Alert.alert('Sent', 'OTP sent to your phone.');
                } else {
                    const { error } = await supabase.auth.verifyOtp({ phone, token: verificationCode, type: 'sms' });
                    if (error) throw error;
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email: email.trim(), password });
                if (error) throw error;
                Alert.alert('Check Email', 'Please verify your email.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.card, { backgroundColor: appearance === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
                            <Text style={[styles.title, { color: colors.text }]}>
                                {authMethod === 'phone' ? (showVerification ? 'Verify' : 'Phone') : (isSignUp ? 'Join Us' : 'Welcome')}
                            </Text>

                            <View style={styles.methodToggle}>
                                <TouchableOpacity 
                                    style={[styles.methodBtn, authMethod === 'email' && { backgroundColor: colors.primary }]}
                                    onPress={() => { setAuthMethod('email'); setShowVerification(false); }}
                                >
                                    <Text style={{ color: authMethod === 'email' ? 'white' : colors.textSecondary }}>Email</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.methodBtn, authMethod === 'phone' && { backgroundColor: colors.primary }]}
                                    onPress={() => { setAuthMethod('phone'); setShowVerification(false); }}
                                >
                                    <Text style={{ color: authMethod === 'phone' ? 'white' : colors.textSecondary }}>Phone</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputs}>
                                {authMethod === 'email' ? (
                                    <>
                                        <StyledInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
                                        <StyledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
                                    </>
                                ) : (
                                    <>
                                        {!showVerification ? (
                                            <StyledInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                                        ) : (
                                            <StyledInput label="Code" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" />
                                        )}
                                    </>
                                )}
                            </View>

                            <VibrantButton 
                                title={loading ? '...' : (authMethod === 'phone' ? (showVerification ? 'Verify' : 'Send Code') : (isSignUp ? 'Sign Up' : 'Sign In'))} 
                                onPress={handleAuth} 
                                disabled={loading}
                                style={{ marginTop: 10 }}
                            />

                            {authMethod === 'email' && (
                                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20, alignItems: 'center' }}>
                                    <Text style={{ color: colors.primary }}>{isSignUp ? 'Already have an account?' : "Need an account?"}</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.divider}>
                                <View style={[styles.line, { backgroundColor: colors.border }]} />
                                <Text style={{ marginHorizontal: 10, color: colors.textSecondary }}>OR</Text>
                                <View style={[styles.line, { backgroundColor: colors.border }]} />
                            </View>

                            <VibrantButton 
                                title="Google" 
                                onPress={handleGoogleSignIn} 
                                variant="outline" 
                                leftIcon={<GoogleIcon />} 
                                disabled={loading}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        width: '100%',
        // Basic elevation for now, no complex GPU shadows
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 24,
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    methodBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    inputs: {
        marginBottom: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
    }
});
