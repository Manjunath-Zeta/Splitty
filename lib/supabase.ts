import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables are missing! Check your .env or Vercel settings.');
}

// Custom storage for cross-platform support
const customStorage = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            try {
                return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
            } catch (e) {
                return null;
            }
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
            } catch (e) { }
            return;
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') window.localStorage.removeItem(key);
            } catch (e) { }
            return;
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
