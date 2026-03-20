import { useEffect, useRef } from 'react';
import { Alert, View, Text, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useSplittyStore } from '../store/useSplittyStore';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might cause some errors here, safe to ignore */
});

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const setSession = useSplittyStore(s => s.setSession);
    const fetchData = useSplittyStore(s => s.fetchData);
    const session = useSplittyStore(state => state.session);
    const subscribeToChanges = useSplittyStore(s => s.subscribeToChanges);
    const initNotifications = useSplittyStore(s => s.initNotifications);

    // Deep trace for session changes
    useEffect(() => {
        console.log('RootLayout: [TRACE] Session changed state:', !!session);
    }, [session]);

    const rootNavigationState = useRootNavigationState();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        initNotifications();
        console.log('RootLayout: Initializing Auth...');

        // Recurring Expenses Check
        const count = useSplittyStore.getState().checkRecurringExpenses();
        if (count > 0) {
            Alert.alert('Recurring Expenses', `${count} new expense(s) have been added based on your schedule.`);
        }

        const checkPendingPhone = async (currentSession: any) => {
            if (!currentSession) return;
            try {
                const pendingPhone = await AsyncStorage.getItem('pending_phone_number');
                if (pendingPhone) {
                    await supabase.from('profiles').update({ phone: pendingPhone }).eq('id', currentSession.user.id);
                    await AsyncStorage.removeItem('pending_phone_number'); // This line was already present in the original code.
                    console.log("RootLayout: Applied pending phone number to profile.");
                }
            } catch (e) {
                console.error("Failed to apply pending phone", e);
            }
        };

        // Auth Initial Session
        supabase.auth.getSession().then(async ({ data: { session } }: any) => {
            console.log('RootLayout: Session fetched', !!session);
            await checkPendingPhone(session);
            setSession(session);
            setIsReady(true);
        });

        // Auth Listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            console.log(`RootLayout: Auth State Event: ${event}`, !!session);
            await checkPendingPhone(session);
            setSession(session);
        });

        return () => authSubscription.unsubscribe();
    }, []);

    // Handle Auth Routing
    useEffect(() => {
        console.log('RootLayout: useEffect triggered', { isReady, rootNavigationStateReady: !!rootNavigationState?.key, session: !!session, segments });
        if (!isReady || !rootNavigationState?.key) return;

        // Once navigation is ready AND auth is ready, we can hide the splash screen
        // Added a small delay to ensure the screen has time to paint
        setTimeout(() => {
            SplashScreen.hideAsync().catch(() => { });
        }, 500);

        const inAuthGroup = segments[0] === 'auth' || segments[0] === '(auth)';
        const isAtRoot = segments.length < 1 || segments[0] === 'index' || segments[0] === '';
        const isInsideTabs = segments[0] === '(tabs)';
        const isOnProtectedScreen = segments[0] === 'add-expense' || 
                                   segments[0] === 'set-budget' || 
                                   segments[0] === 'manage-categories';

        // Use a small delay but only if we AREN'T already where we're supposed to be
        // This avoids the "double jump" and modal closing
        console.log('RootLayout: Testing Redirect Conditions', { session: !!session, inAuthGroup, isAtRoot });
        if (session && (inAuthGroup || isAtRoot)) {
            console.log('RootLayout: AUTHENTICATED REDIRECT -> /(tabs)', { segments });
            fetchData();
            router.replace('/(tabs)');
        } else if (!session && !inAuthGroup) {
            console.log('RootLayout: UNAUTHENTICATED REDIRECT -> /auth', { segments });
            router.replace('/auth');
        } else {
            console.log('RootLayout: No redirect needed or handled.', { session: !!session, segments });
        }
    }, [session, segments, rootNavigationState, isReady]);

    // Real-time Sync Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (session) {
            unsubscribe = subscribeToChanges();
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [session]);

    // AppState listener — refresh when app comes back to foreground
    // This catches any real-time events that were missed while backgrounded
    const appState = useRef<AppStateStatus>(AppState.currentState);
    useEffect(() => {
        if (!session) return;

        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                console.log('📲 App came to foreground — refreshing data...');
                fetchData();
            }
            appState.current = nextState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [session]);

    // Periodic polling fallback — every 60s while app is active
    // Catches any WebSocket events silently dropped by the OS
    useEffect(() => {
        if (!session) return;
        const interval = setInterval(() => {
            if (AppState.currentState === 'active') {
                fetchData();
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, [session]);

    const appearance = useSplittyStore(state => state.appearance);
    const colors = useSplittyStore(state => state.colors);
    const isDark = appearance === 'dark';

    const isConfigMissing = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!isReady) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                <StatusBar style="dark" />
                <Text style={{ color: '#0F172A', fontWeight: 'bold' }}>Loading Splitty...</Text>
            </View>
        );
    }

    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {isConfigMissing && (
                <View style={{ backgroundColor: '#EF4444', padding: 10, paddingTop: 50 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        ⚠️ Supabase Config Missing in Vercel. Please add Env Vars!
                    </Text>
                </View>
            )}
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: colors.background,
                        },
                        headerTitleStyle: {
                            color: colors.text,
                            fontWeight: 'bold',
                        },
                        headerShadowVisible: false,
                        headerTintColor: colors.primary,
                    }}
                >
                    <Stack.Screen name="index" options={{ headerShown: false, title: '' }} />
                    <Stack.Screen name="auth" options={{ headerShown: false, title: '' }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="add-expense"
                        options={{
                            presentation: 'modal',
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="set-budget"
                        options={{
                            presentation: 'modal',
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="budget-category/[month]/[categoryId]"
                        options={{
                            presentation: 'modal',
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="manage-categories"
                        options={{
                            presentation: 'modal',
                            headerShown: false,
                        }}
                    />
                </Stack>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
