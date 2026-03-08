import React from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { Skeuomorphic } from '../constants/Colors';
import { useSplittyStore } from '../store/useSplittyStore';

interface StyledInputProps extends TextInputProps {
    label?: string;
    labelStyle?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
}

export const StyledInput: React.FC<StyledInputProps> = ({ label, style, labelStyle, containerStyle, ...props }) => {
    const { colors, designPreference, appearance } = useSplittyStore();
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    if (isSkeuomorphic) {
        return (
            <View style={[styles.container, containerStyle]}>
                {label && <Text style={[styles.label, { color: colors.textSecondary }, labelStyle]}>{label}</Text>}
                <View style={[styles.skeuoInsetWrapper, skeuo.inset.dark]}>
                    <View style={[styles.skeuoInsetInner, skeuo.inset.light]}>
                        <TextInput
                            style={[styles.input, {
                                color: colors.text,
                                backgroundColor: 'transparent',
                                borderWidth: 0,
                            }, style]}
                            placeholderTextColor={colors.textSecondary}
                            {...props}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { color: colors.text }, labelStyle]}>{label}</Text>}
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border
                }, style]}
                placeholderTextColor={colors.textSecondary}
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    skeuoInsetWrapper: {
        borderRadius: 16,
        backgroundColor: 'transparent',
    },
    skeuoInsetInner: {
        borderRadius: 16,
        backgroundColor: 'transparent',
    }
});
