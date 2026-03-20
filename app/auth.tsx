import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useSplittyStore } from '../store/useSplittyStore';
import { VibrantButton } from '../components/VibrantButton';
import { StyledInput } from '../components/StyledInput';
import { GoogleIcon } from '../components/GoogleIcon';
import { Apple } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AuthScreen() {
    const colors = useSplittyStore(s => s.colors);
    const appearance = useSplittyStore(s => s.appearance);
    const setSession = useSplittyStore(s => s.setSession);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    const isValidPhone = phoneNumber.replace(/\D/g, '').length >= 10;

    const handleGoogleSignIn = async () => {
        if (!isValidPhone) {
            Alert.alert("Phone Required", "Please enter a valid 10-digit phone number first.");
            return;
        }
        setLoading(true);
        try {
            await SecureStore.setItemAsync('pending_phone_number', phoneNumber.replace(/\D/g, ''));
            const isWeb = Platform.OS === 'web';
            // Use Linking so it works in Expo Go, Dev Client, or Prod automatically
            const redirectUri = isWeb ? window.location.origin : Linking.createURL('');
            
            console.log('Redirect URI generated:', redirectUri);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUri, skipBrowserRedirect: !isWeb },
            });

            if (error) throw error;

            if (!isWeb && data.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
                if (res.type === 'success' && res.url) {
                    console.log('Auth: Received Redirect URL:', res.url);
                    
                    // Manually parse fragment or query string for maximum compatibility
                    const extractParams = (url: string) => {
                        const params: Record<string, string> = {};
                        // Look for anything after # or ?
                        const parts = url.split(/[#?]/);
                        if (parts.length > 1) {
                            parts.slice(1).join('&').split('&').forEach(part => {
                                const [key, value] = part.split('=');
                                if (key && value) params[key] = decodeURIComponent(value);
                            });
                        }
                        return params;
                    };

                    const params = extractParams(res.url);
                    console.log('Auth: Manually Extracted Params:', Object.keys(params));
                    
                    const code = params.code;
                    const access_token = params.access_token;
                    const refresh_token = params.refresh_token;

                    if (code) {
                        console.log('Auth: Exchanging code for session...');
                        const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(String(code));
                        if (!error && sessionData.session) {
                            console.log('Auth: Code exchange successful.');
                            setSession(sessionData.session);
                            console.log('Auth: Redirecting to /(tabs) in 100ms...');
                            setTimeout(() => router.replace('/(tabs)'), 100);
                        } else if (error) {
                            console.error('Auth: Code exchange failed:', error.message);
                        }
                    } else if (access_token && refresh_token) {
                        console.log('Auth: Setting session from tokens...');
                        
                        // Race condition protection: start a 2s timeout that forces redirect if session IS set
                        const timeoutId = setTimeout(() => {
                            supabase.auth.getSession().then(({ data: { session: currentSession } }: any) => {
                                if (currentSession) {
                                    console.log('Auth: [TIMEOUT FALLBACK] Session exists, forcing redirect!');
                                    setSession(currentSession);
                                    router.replace('/(tabs)');
                                }
                            });
                        }, 2000);

                        const { data: sessionData, error } = await supabase.auth.setSession({ 
                            access_token: String(access_token), 
                            refresh_token: String(refresh_token) 
                        });
                        
                        clearTimeout(timeoutId);

                        if (!error && sessionData.session) {
                            console.log('Auth: Token session established!');
                            setSession(sessionData.session);
                            console.log('Auth: Redirecting to /(tabs) now...');
                            router.replace('/(tabs)');
                        } else if (error) {
                            console.error('Auth: Token session failed:', error.message);
                        } else {
                            console.warn('Auth: setSession returned no session but no error.');
                        }
                    } else {
                        console.warn('Auth: No valid tokens found in redirect URL.');
                    }
                } else {
                    console.log('Auth: WebBrowser session type:', res.type);
                }
            }
        } catch (error: any) {
            Alert.alert('Google Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        if (!isValidPhone) {
            Alert.alert("Phone Required", "Please enter a valid 10-digit phone number first.");
            return;
        }
        setLoading(true);
        try {
            await SecureStore.setItemAsync('pending_phone_number', phoneNumber.replace(/\D/g, ''));
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            
            if (credential.identityToken) {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                });
                
                if (error) throw error;
            } else {
                throw new Error('No identityToken returned from Apple.');
            }
        } catch (e: any) {
            if (e.code !== 'ERR_REQUEST_CANCELED') {
                Alert.alert('Apple Sign-In Error', e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.card, { backgroundColor: appearance === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Welcome to Splitty</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Sign in to start splitting expenses with friends effortlessly.
                        </Text>

                        <StyledInput
                            label="Your Phone Number"
                            placeholder="e.g. 555 123 4567"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            style={{ marginBottom: 24 }}
                            inputStyle={{ paddingVertical: 10, fontSize: 16 }}
                        />

                        <View style={styles.buttonContainer}>
                            {Platform.OS === 'ios' && (
                                <View 
                                    style={{ marginBottom: 16, opacity: isValidPhone ? 1 : 0.5 }} 
                                    pointerEvents={isValidPhone ? 'auto' : 'none'}
                                >
                                    <AppleAuthentication.AppleAuthenticationButton
                                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                        buttonStyle={appearance === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                        cornerRadius={16}
                                        style={{ width: '100%', height: 56 }}
                                        onPress={handleAppleSignIn}
                                    />
                                </View>
                            )}

                            <VibrantButton 
                                title="Sign in with Google" 
                                onPress={handleGoogleSignIn} 
                                variant="outline"
                                style={{ 
                                    backgroundColor: appearance === 'dark' ? '#334155' : '#FFFFFF',
                                    borderColor: appearance === 'dark' ? '#475569' : '#E2E8F0',
                                    borderWidth: 1,
                                    height: 56,
                                    opacity: isValidPhone ? 1 : 0.5 
                                }}
                                textStyle={{
                                    color: appearance === 'dark' ? '#FFFFFF' : '#0F172A',
                                    fontWeight: '600',
                                    fontSize: 18
                                }}
                                leftIcon={<GoogleIcon />} 
                                disabled={loading || !isValidPhone}
                            />
                        </View>

                        <Text style={styles.footerText}>
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        padding: 24,
    },
    card: {
        borderRadius: 32,
        padding: 32,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    buttonContainer: {
        width: '100%',
        marginBottom: 32,
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        color: '#64748B',
        lineHeight: 18,
    }
});
