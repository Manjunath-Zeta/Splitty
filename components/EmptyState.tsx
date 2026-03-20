import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from './GlassCard';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    message: string;
    style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, style }) => {
    const colors = useSplittyStore(s => s.colors);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);
    
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    if (isSkeuomorphic) {
        return (
            <View style={[styles.skeuoWrapper, skeuo.outset.light, style]}>
                <View style={[styles.skeuoInner, skeuo.outset.dark]}>
                    <LinearGradient colors={skeuo.surfaceGradient} style={styles.container}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
                            <Icon size={48} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    </LinearGradient>
                </View>
            </View>
        );
    }

    return (
        <GlassCard style={[styles.container, { backgroundColor: colors.surface + '80' }, style]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Icon size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    skeuoWrapper: {
        borderRadius: 32,
        marginVertical: 20,
    },
    skeuoInner: {
        borderRadius: 32,
    },
    container: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.7,
    },
});
