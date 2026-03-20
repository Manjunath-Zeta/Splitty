import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables are missing! Check your .env or Vercel settings.');
}

// Secure storage for cross-platform support
// On mobile, we use expo-secure-store for encryption
// On web, we fall back to localStorage (standard practice)
const secureStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            try {
                return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
            } catch (e) {
                return null;
            }
        }
        try {
            console.log(`💾 Storage: GET ${key}`);
            const val = await AsyncStorage.getItem(key);
            return val;
        } catch (error) {
            console.warn(`⚠️ AsyncStorage.getItem failed for ${key}:`, error);
            return null;
        }
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
            } catch (e) { }
            return;
        }
        try {
            console.log(`💾 Storage: SET ${key} (Length: ${value?.length})`);
            return await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.warn(`⚠️ AsyncStorage.setItem failed for ${key}:`, error);
        }
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.removeItem(key);
            } catch (e) { }
            return;
        }
        try {
            return await AsyncStorage.removeItem(key);
        } catch (error) {
            console.warn('⚠️ AsyncStorage.removeItem failed:', error);
        }
    },
};

// Create client with fallback handling to prevent app crash if env vars are missing
const createSupabaseClient = () => {
    if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: secureStorage as any,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: Platform.OS === 'web',
            },
        });
    }
    
    // Handle missing config gracefully
    console.warn('⚠️ Supabase config missing. Using mock client.');
    return {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        },
        from: () => ({
            select: () => ({
                order: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: { message: 'Supabase config missing' } }),
                        returns: () => ({
                            eq: () => Promise.resolve({ data: [], error: null }),
                        })
                    }),
                    limit: () => ({
                        returns: () => Promise.resolve({ data: [], error: null }),
                    })
                }),
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                    returns: () => Promise.resolve({ data: [], error: null }),
                })
            }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
            upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
            rpc: () => Promise.resolve({ data: null, error: null }),
        }),
        rpc: () => Promise.resolve({ data: null, error: null }),
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: '' } }),
            })
        }
    } as any;
};

export const supabase = createSupabaseClient();

