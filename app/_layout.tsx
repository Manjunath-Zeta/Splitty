import { useEffect } from 'react';
import { Alert, View, Text } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useSplittyStore } from '../store/useSplittyStore';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { setSession, fetchData, subscribeToChanges, initNotifications } = useSplittyStore();
    const session = useSplittyStore(state => state.session);

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

        // Auth Initial Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('RootLayout: Session fetched', !!session);
            setSession(session);
            setIsReady(true);
        });

        // Auth Listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('RootLayout: Auth event', event, !!session);
            setSession(session);
        });

        return () => authSubscription.unsubscribe();
    }, []);

    // Handle Auth Routing
    useEffect(() => {
        if (!isReady || !rootNavigationState?.key) return;

        const inAuthGroup = segments[0] === 'auth';

        if (session && inAuthGroup) {
            // First time they are authenticated, ensure we get their profile/data
            fetchData();
            console.log('RootLayout: Redirecting to Tabs. Session Active.');
            router.replace('/(tabs)');
        } else if (!session && !inAuthGroup) {
            console.log('RootLayout: Redirecting to Auth. No session.');
            router.replace('/auth');
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

    const appearance = useSplittyStore(state => state.appearance);
    const colors = useSplittyStore(state => state.colors);
    const isDark = appearance === 'dark';

    const isConfigMissing = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    return (
        <>
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
        </>
    );
}
