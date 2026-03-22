import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View, Platform, StyleProp, ActivityIndicator } from 'react-native';
import { Skeuomorphic } from '../constants/Colors';
import { useSplittyStore } from '../store/useSplittyStore';
import { LinearGradient } from 'expo-linear-gradient';

interface VibrantButtonProps {
    title?: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    variant?: 'primary' | 'secondary' | 'outline';
    disabled?: boolean;
    leftIcon?: React.ReactNode;
    loading?: boolean;
}

export const VibrantButton: React.FC<VibrantButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    variant = 'primary',
    disabled = false,
    leftIcon,
    loading = false
}) => {
    const colors = useSplittyStore(s => s.colors);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);
    const [isPressed, setIsPressed] = useState(false);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const isOutline = variant === 'outline';
    const isSecondary = variant === 'secondary';

    // Extract custom border radius or width/height from style if present
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const customRadius = flattenedStyle.borderRadius !== undefined ? flattenedStyle.borderRadius : skeuo.radii.button;
    const isIconOnly = !title && !!leftIcon;

    if (isSkeuomorphic) {
        return (
            <Pressable
                onPress={onPress}
                onPressIn={() => !disabled && setIsPressed(true)}
                onPressOut={() => !disabled && setIsPressed(false)}
                disabled={disabled}
                style={[
                    styles.skeuoWrapper,
                    { borderRadius: customRadius as number },
                    style,
                    disabled && styles.disabled
                ]}
            >
                {({ pressed }) => (
                    <View style={[
                        styles.skeuoOuterDark,
                        { 
                            borderRadius: customRadius as number,
                            backgroundColor: isOutline ? 'transparent' : (isDark ? 'rgba(30, 35, 43, 0.95)' : 'rgba(255, 255, 255, 0.95)')
                        },
                        !pressed && !isOutline && skeuo.outset.light,
                        pressed && skeuo.inset.dark,
                        pressed && styles.skeuoPressed
                    ]}>
                        <LinearGradient
                            colors={disabled ? [colors.border, colors.border] :
                                (isOutline ? ['transparent', 'transparent'] :
                                    (pressed ? [skeuo.surfaceGradient[1], skeuo.surfaceGradient[0]] :
                                        (isSecondary ? [colors.secondary, colors.secondary] : skeuo.surfaceGradient)))}
                            style={[
                                styles.skeuoGradient,
                                { borderRadius: customRadius as number },
                                isIconOnly && { paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.content}>
                                {loading ? (
                                    <ActivityIndicator size="small" color={isOutline ? colors.primary : 'white'} />
                                ) : (
                                    <>
                                        {leftIcon && <View style={[styles.iconContainer, !title && { marginRight: 0 }]}>{leftIcon}</View>}
                                        {title ? (
                                            <Text style={[
                                                styles.text,
                                                { color: disabled ? colors.textSecondary : (isSecondary ? colors.text : (isOutline ? colors.primary : colors.primary)) },
                                                textStyle
                                            ]}>
                                                {title}
                                            </Text>
                                        ) : null}
                                    </>
                                )}
                            </View>
                        </LinearGradient>
                    </View>
                )}
            </Pressable>
        );
    }

    // Existing Design
    const buttonStyle = [
        styles.button,
        isOutline ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary } :
            isSecondary ? { backgroundColor: colors.secondary } :
                { backgroundColor: colors.primary },
        disabled && { backgroundColor: colors.border, borderColor: colors.border },
        isIconOnly && { paddingHorizontal: 0, paddingVertical: 0, width: flattenedStyle.width || 50, height: flattenedStyle.height || 50 },
        style
    ];

    const finalTextColor = isOutline ? colors.primary : (disabled ? colors.textSecondary : colors.text);

    return (
        <Pressable
            style={({ pressed }) => [
                buttonStyle,
                pressed && { opacity: 0.8 }
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="small" color={isOutline ? colors.primary : 'white'} />
                ) : (
                    <>
                        {leftIcon && <View style={[styles.iconContainer, !title && { marginRight: 0 }]}>{leftIcon}</View>}
                        {title ? (
                            <Text style={[
                                styles.text,
                                { color: finalTextColor },
                                textStyle
                            ]}>
                                {title}
                            </Text>
                        ) : null}
                    </>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    skeuoWrapper: {
    },
    skeuoOuterDark: {
        backgroundColor: 'transparent',
    },
    skeuoGradient: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    skeuoPressed: {
        opacity: 0.9,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    iconContainer: {
        marginRight: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
    },
});
