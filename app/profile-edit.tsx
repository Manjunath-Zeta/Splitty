import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    Pressable
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSplittyStore } from '../store/useSplittyStore';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { StyledInput } from '../components/StyledInput';
import { VibrantButton } from '../components/VibrantButton';
import { ArrowLeft, User, Mail, Phone } from 'lucide-react-native';

export default function ProfileEditScreen() {
    const router = useRouter();
    const userProfile = useSplittyStore(s => s.userProfile);
    const updateUserProfile = useSplittyStore(s => s.updateUserProfile);
    const appearance = useSplittyStore(s => s.appearance);
    const colors = useSplittyStore(s => s.colors);
    const designPreference = useSplittyStore(s => s.designPreference);
    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const [name, setName] = useState(userProfile.name);
    const [email, setEmail] = useState(userProfile.email);
    const [phone, setPhone] = useState(userProfile.phone || '');
    const [avatar, setAvatar] = useState(userProfile.avatar || null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !email.trim()) {
            Alert.alert('Error', 'Name and Email are required.');
            return;
        }

        updateUserProfile({ name, email, phone, avatar: avatar || undefined });
        router.back();
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                            <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: skeuo.background }]}>
                                <ArrowLeft size={24} color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </Pressable>
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.avatarSection}>
                    <Pressable onPress={pickImage}>
                        {isSkeuomorphic ? (
                            <View style={[styles.skeuoAvatarOuter, skeuo.outset.light]}>
                                <View style={[styles.skeuoAvatarInner, skeuo.outset.dark]}>
                                    <View style={[styles.avatarSkeuo, { backgroundColor: skeuo.background, overflow: 'hidden' }]}>
                                        {avatar ? (
                                            <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <User size={64} color={colors.primary} />
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(99, 102, 241, 0.1)', overflow: 'hidden' }]}>
                                {avatar ? (
                                    <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <User size={64} color={colors.primary} />
                                )}
                            </View>
                        )}
                        <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </Pressable>
                </View>

                {isSkeuomorphic ? (
                    <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoFormCard}>
                                <View style={styles.inputGroup}>
                                    <View style={styles.iconContainer}>
                                        <User size={20} color={colors.textSecondary} />
                                    </View>
                                    <StyledInput
                                        label="Full Name"
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        containerStyle={{ flex: 1, marginBottom: 0 }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.iconContainer}>
                                        <Mail size={20} color={colors.textSecondary} />
                                    </View>
                                    <StyledInput
                                        label="Email"
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        containerStyle={{ flex: 1, marginBottom: 0 }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.iconContainer}>
                                        <Phone size={20} color={colors.textSecondary} />
                                    </View>
                                    <StyledInput
                                        label="Phone Number"
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Enter phone number"
                                        keyboardType="phone-pad"
                                        containerStyle={{ flex: 1, marginBottom: 0 }}
                                    />
                                </View>
                            </LinearGradient>
                        </View>
                    </View>
                ) : (
                    <GlassCard style={[styles.formCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconContainer}>
                                <User size={20} color={colors.textSecondary} />
                            </View>
                            <StyledInput
                                label="Full Name"
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                containerStyle={{ flex: 1, marginBottom: 0 }}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.iconContainer}>
                                <Mail size={20} color={colors.textSecondary} />
                            </View>
                            <StyledInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                containerStyle={{ flex: 1, marginBottom: 0 }}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.iconContainer}>
                                <Phone size={20} color={colors.textSecondary} />
                            </View>
                            <StyledInput
                                label="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                containerStyle={{ flex: 1, marginBottom: 0 }}
                            />
                        </View>
                    </GlassCard>
                )}

                <VibrantButton
                    title="Save Changes"
                    onPress={handleSave}
                    style={styles.saveButton}
                />
                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    container: {
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarSkeuo: {
        width: 100,
        height: 100,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    changePhotoText: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
    formCard: {
        padding: 20,
        marginBottom: 24,
        borderRadius: 24,
    },
    skeuoFormCard: {
        padding: 24,
        borderRadius: 24,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 12,
    },
    iconContainer: {
        marginTop: 32,
    },
    saveButton: {
        marginTop: 20,
    },
    skeuoIconWrapper: {
        borderRadius: 22,
    },
    skeuoIconInner: {
        borderRadius: 22,
    },
    skeuoAvatarOuter: {
        borderRadius: 24,
    },
    skeuoAvatarInner: {
        borderRadius: 24,
    },
    skeuoCardOuter: {
        borderRadius: 24,
        marginBottom: 24,
    },
    skeuoCardInner: {
        borderRadius: 24,
    }
});
