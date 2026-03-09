import * as SecureStore from 'expo-secure-store';
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
        return await SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
            } catch (e) { }
            return;
        }
        return await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.removeItem(key);
            } catch (e) { }
            return;
        }
        return await SecureStore.deleteItemAsync(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: secureStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
