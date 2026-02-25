import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useSplittyStore } from '../store/useSplittyStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
    spent: number;
    budget: number;
    color?: string;
    size?: number;
    strokeWidth?: number;
}

export const CircularProgress = ({
    spent,
    budget,
    color,
    size = 200,
    strokeWidth = 16,
}: CircularProgressProps) => {
    const { colors, formatCurrency } = useSplittyStore();

    const defaultColor = color || colors.primary;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    const percentage = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const strokeDashoffset = circumference - percentage * circumference;

    const animatedOffset = useSharedValue(circumference);

    React.useEffect(() => {
        animatedOffset.value = withTiming(strokeDashoffset, {
            duration: 1200,
            easing: Easing.out(Easing.cubic),
        });
    }, [strokeDashoffset]);

    const animatedProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: animatedOffset.value,
        };
    });

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Circle */}
                <Circle
                    stroke={colors.border}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                {/* Progress Circle */}
                <AnimatedCircle
                    stroke={defaultColor}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    animatedProps={animatedProps}
                    // Rotate to start from top
                    transform={`translate(${size}, 0) rotate(90)`}
                    origin={`${size / 2}, ${size / 2}`}
                    rotation="-90"
                />
            </Svg>
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>Spent</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>
                    {formatCurrency(spent)}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                    of {formatCurrency(budget)}
                </Text>
            </View>
        </View>
    );
};
