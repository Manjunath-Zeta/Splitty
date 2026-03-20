import React from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { Skeuomorphic } from '../constants/Colors';
import { useSplittyStore } from '../store/useSplittyStore';

interface StyledInputProps extends TextInputProps {
    label?: string;
    labelStyle?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    rightAccessory?: React.ReactNode;
    inputStyle?: StyleProp<TextStyle>;
}

export const StyledInput: React.FC<StyledInputProps> = ({ label, style, labelStyle, containerStyle, rightAccessory, inputStyle, ...props }) => {
    const colors = useSplittyStore(s => s.colors);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    if (isSkeuomorphic) {
        return (
            <View style={[styles.container, containerStyle]}>
                {label && <Text style={[styles.label, { color: colors.textSecondary }, labelStyle]}>{label}</Text>}
                <View style={[
                    styles.skeuoInsetWrapper, 
                    { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' },
                    skeuo.inset.dark,
                    styles.inputContainer
                ]}>
                    <TextInput
                        style={[styles.input, {
                            color: colors.text,
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1
                        }, inputStyle]}
                        placeholderTextColor={colors.textSecondary}
                        {...props}
                    />
                    {rightAccessory && (
                        <View style={styles.accessoryContainer}>
                            {rightAccessory}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { color: colors.text }, labelStyle]}>{label}</Text>}
            <View style={[styles.inputContainer, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16
            }, style]}>
                <TextInput
                    style={[styles.input, { color: colors.text, flex: 1 }, inputStyle]}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
                {rightAccessory && (
                    <View style={styles.accessoryContainer}>
                        {rightAccessory}
                    </View>
                )}
            </View>
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        padding: 16,
        fontSize: 16,
    },
    accessoryContainer: {
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeuoInsetWrapper: {
        borderRadius: 16,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    skeuoInsetInner: {
        borderRadius: 16,
        backgroundColor: 'transparent',
    }
});
