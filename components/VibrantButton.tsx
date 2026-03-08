import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View, Platform } from 'react-native';
import { Skeuomorphic } from '../constants/Colors';
import { useSplittyStore } from '../store/useSplittyStore';
import { LinearGradient } from 'expo-linear-gradient';

interface VibrantButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline';
    disabled?: boolean;
    leftIcon?: React.ReactNode;
}

export const VibrantButton: React.FC<VibrantButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    variant = 'primary',
    disabled = false,
    leftIcon
}) => {
    const { colors, designPreference, appearance } = useSplittyStore();
    const [isPressed, setIsPressed] = useState(false);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const isOutline = variant === 'outline';
    const isSecondary = variant === 'secondary';

    if (isSkeuomorphic) {
        const isOutline = variant === 'outline';
        const isSecondary = variant === 'secondary';

        return (
            <Pressable
                onPress={onPress}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                disabled={disabled}
                style={({ pressed }) => [
                    styles.skeuoWrapper,
                    !pressed && !isOutline && skeuo.outset.light,
                    isOutline && skeuo.inset.dark,
                    style,
                    disabled && styles.disabled
                ]}
            >
                {({ pressed }) => (
                    <View style={[
                        styles.skeuoOuterDark,
                        !pressed && !isOutline && skeuo.outset.dark,
                        isOutline && skeuo.inset.light,
                        pressed && styles.skeuoPressed
                    ]}>
                        <LinearGradient
                            colors={disabled ? [colors.border, colors.border] :
                                (isOutline ? ['transparent', 'transparent'] :
                                    (pressed ? [skeuo.surfaceGradient[1], skeuo.surfaceGradient[0]] :
                                        (isSecondary ? [colors.secondary, colors.secondary] : skeuo.surfaceGradient)))}
                            style={styles.skeuoGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.content}>
                                {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
                                <Text style={[
                                    styles.text,
                                    { color: disabled ? colors.textSecondary : (isSecondary ? colors.text : colors.primary) },
                                    textStyle
                                ]}>
                                    {title}
                                </Text>
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
            disabled={disabled}
        >
            {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
            <Text style={[
                styles.text,
                { color: finalTextColor },
                textStyle
            ]}>
                {title}
            </Text>
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
        borderRadius: 20,
    },
    skeuoOuterDark: {
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    skeuoGradient: {
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    skeuoPressed: {
        transform: [{ scale: 0.98 }],
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
