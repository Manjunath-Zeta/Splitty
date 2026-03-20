import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert, Modal, Platform } from 'react-native';
import { Image } from 'expo-image';
import { AccentPalettes, AccentName, AppearanceMode, Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { useSplittyStore } from '../../store/useSplittyStore';
import { User, Bell, Trash2, LogOut, ChevronRight, CreditCard, DollarSign, Activity, Palette, X, Tag, BarChart2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const clearData = useSplittyStore(s => s.clearData);
    const appearance = useSplittyStore(s => s.appearance);
    const setAppearance = useSplittyStore(s => s.setAppearance);
    const accent = useSplittyStore(s => s.accent);
    const setAccent = useSplittyStore(s => s.setAccent);
    const colors = useSplittyStore(s => s.colors);
    const currency = useSplittyStore(s => s.currency);
    const setCurrency = useSplittyStore(s => s.setCurrency);
    const userProfile = useSplittyStore(s => s.userProfile);
    const notificationsEnabled = useSplittyStore(s => s.notificationsEnabled);
    const setNotificationsEnabled = useSplittyStore(s => s.setNotificationsEnabled);
    const isRolloverEnabled = useSplittyStore(s => s.isRolloverEnabled);
    const setRolloverEnabled = useSplittyStore(s => s.setRolloverEnabled);
    const signOut = useSplittyStore(s => s.signOut);
    const designPreference = useSplittyStore(s => s.designPreference);
    const setDesignPreference = useSplittyStore(s => s.setDesignPreference);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;
    const [themeModalVisible, setThemeModalVisible] = useState(false);

    const accentOptions: { name: AccentName; label: string; preview: string }[] = [
        { name: 'classic', label: 'Classic', preview: AccentPalettes.classic.primary },
        { name: 'midnight', label: 'Midnight', preview: AccentPalettes.midnight.primary },
        { name: 'sunset', label: 'Sunset', preview: AccentPalettes.sunset.primary },
        { name: 'forest', label: 'Forest', preview: AccentPalettes.forest.primary },
        { name: 'ruby', label: 'Ruby', preview: AccentPalettes.ruby.primary },
        { name: 'ocean', label: 'Ocean', preview: AccentPalettes.ocean.primary },
        { name: 'sunflower', label: 'Sunflower', preview: AccentPalettes.sunflower.primary },
        { name: 'emerald', label: 'Emerald', preview: AccentPalettes.emerald.primary },
        { name: 'amethyst', label: 'Amethyst', preview: AccentPalettes.amethyst.primary },
        { name: 'rose', label: 'Rose', preview: AccentPalettes.rose.primary },
        { name: 'amber', label: 'Amber', preview: AccentPalettes.amber.primary },
        { name: 'sapphire', label: 'Sapphire', preview: AccentPalettes.sapphire.primary },
        { name: 'fuchsia', label: 'Fuchsia', preview: AccentPalettes.fuchsia.primary },
        { name: 'slate', label: 'Slate', preview: AccentPalettes.slate.primary },
    ];

    const handleCurrencyChange = () => {
        Alert.alert(
            "Select Currency",
            "Choose your preferred currency symbol",
            [
                { text: "USD ($)", onPress: () => setCurrency('USD') },
                { text: "EUR (€)", onPress: () => setCurrency('EUR') },
                { text: "GBP (£)", onPress: () => setCurrency('GBP') },
                { text: "INR (₹)", onPress: () => setCurrency('INR') },
                { text: "JPY (¥)", onPress: () => setCurrency('JPY') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleClearData = async () => {
        Alert.alert(
            "Delete Account",
            "This will delete all friends, groups, and expenses. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.rpc('delete_user_account');
                            if (error) throw error;

                            await signOut();
                            Alert.alert("Account Deleted", "Your account and all associated data have been permanently removed.");
                        } catch (err: any) {
                            Alert.alert("Error Deleting Account", err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleSettleUp = () => {
        router.push('/settle-up');
    };

    const handleSignOut = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: signOut
                }
            ]
        );
    };

    const renderSettingItem = (icon: React.ReactNode, label: string, rightElement: React.ReactNode, onPress?: () => void) => (
        <Pressable
            style={({ pressed }) => [styles.settingItem, { opacity: onPress && pressed ? 0.7 : 1 }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingLeft}>
                {icon}
                <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
            </View>
            {rightElement}
        </Pressable>
    );

    const renderCard = (title: string, children: React.ReactNode) => {
        if (isSkeuomorphic) {
            return (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
                    <View style={[styles.skeuoCardWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <View style={[styles.settingsCard, { backgroundColor: skeuo.background }]}>
                                {children}
                            </View>
                        </View>
                    </View>
                </View>
            );
        }
        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
                <GlassCard style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                    {children}
                </GlassCard>
            </View>
        );
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background, paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 120 }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Profile</Text>
                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoCardWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                                <LinearGradient colors={skeuo.surfaceGradient} style={styles.profileCard}>
                                    <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                                        {userProfile.avatar ? (
                                            <Image source={{ uri: userProfile.avatar }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <User size={32} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={styles.profileInfo}>
                                        <Text style={[styles.profileName, { color: colors.text }]}>{userProfile.name}</Text>
                                        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userProfile.email}</Text>
                                    </View>
                                    <Pressable
                                        style={[styles.editButton, { borderColor: colors.border }]}
                                        onPress={() => router.push('/profile-edit')}
                                    >
                                        <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
                                    </Pressable>
                                </LinearGradient>
                            </View>
                        </View>
                    ) : (
                        <GlassCard style={[styles.profileCard, { backgroundColor: colors.surface }]}>
                            <View style={[styles.avatar, { backgroundColor: colors.primary + '20', overflow: 'hidden' }]}>
                                {userProfile.avatar ? (
                                    <Image source={{ uri: userProfile.avatar }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <User size={32} color={colors.primary} />
                                )}
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.profileName, { color: colors.text }]}>{userProfile.name}</Text>
                                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userProfile.email}</Text>
                            </View>
                            <Pressable
                                style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => router.push('/profile-edit')}
                            >
                                <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
                            </Pressable>
                        </GlassCard>
                    )}
                </View>

                {renderCard("Appearance", (
                    <>
                        {renderSettingItem(
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.text }} />,
                            "Dark Mode",
                            <Switch
                                value={isDark}
                                onValueChange={(val) => setAppearance(val ? 'dark' : 'light')}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'white'}
                            />
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <Palette size={20} color={colors.textSecondary} />,
                            "UI Design",
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                                    {`${designPreference === 'skeuomorphic' ? 'Skeuomorphic' : 'Existing'}`}
                                </Text>
                                <ChevronRight size={20} color={colors.textSecondary} />
                            </View>,
                            () => {
                                Alert.alert(
                                    "UI Design",
                                    "Choose your preferred interface style",
                                    [
                                        { text: "Existing (Default)", onPress: () => setDesignPreference('existing') },
                                        { text: "Skeuomorphic", onPress: () => setDesignPreference('skeuomorphic') },
                                        { text: "Cancel", style: "cancel" }
                                    ]
                                );
                            }
                        )}
                    </>
                ))}

                {renderCard("Accent Theme", (
                    renderSettingItem(
                        <Palette size={20} color={colors.textSecondary} />,
                        "Choose Theme",
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: (AccentPalettes[accent] || AccentPalettes.classic).primary }} />
                            <ChevronRight size={20} color={colors.textSecondary} />
                        </View>,
                        () => setThemeModalVisible(true)
                    )
                ))}

                {renderCard("General", (
                    <>
                        {renderSettingItem(
                            <BarChart2 size={20} color={colors.textSecondary} />,
                            "View Analytics",
                            <ChevronRight size={20} color={colors.textSecondary} />,
                            () => router.push('/analytics')
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <Activity size={20} color={colors.textSecondary} />,
                            "Activity Log",
                            <ChevronRight size={20} color={colors.textSecondary} />,
                            () => router.push('/activity-log')
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <DollarSign size={20} color={colors.textSecondary} />,
                            "Currency",
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{currency}</Text>
                                <ChevronRight size={20} color={colors.textSecondary} />
                            </View>,
                            handleCurrencyChange
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <Tag size={20} color={colors.textSecondary} />,
                            "Manage Categories",
                            <ChevronRight size={20} color={colors.textSecondary} />,
                            () => router.push('/manage-categories')
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <Bell size={20} color={colors.textSecondary} />,
                            "Notifications",
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'white'}
                            />
                        )}
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        {renderSettingItem(
                            <Activity size={20} color={colors.textSecondary} />,
                            "Budget Rollover",
                            <Switch
                                value={isRolloverEnabled}
                                onValueChange={setRolloverEnabled}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'white'}
                            />
                        )}
                    </>
                ))}

                {renderCard("Actions", (
                    renderSettingItem(
                        <CreditCard size={20} color={colors.textSecondary} />,
                        "Settle Up",
                        <ChevronRight size={20} color={colors.textSecondary} />,
                        handleSettleUp
                    )
                ))}

                {renderCard("Danger Zone", (
                    renderSettingItem(
                        <Trash2 size={20} color={colors.error} />,
                        "Delete Account",
                        <ChevronRight size={20} color={colors.textSecondary} />,
                        handleClearData
                    )
                ))}

                {renderCard("Account", (
                    renderSettingItem(
                        <LogOut size={20} color={colors.error} />,
                        "Sign Out",
                        <ChevronRight size={20} color={colors.textSecondary} />,
                        handleSignOut
                    )
                ))}

                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: colors.textSecondary }]}>Splitty v1.0.0 (Build 2)</Text>
                </View>
            </ScrollView>

            <Modal
                visible={themeModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setThemeModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Accent Theme</Text>
                            <Pressable onPress={() => setThemeModalVisible(false)} style={styles.modalCloseButton}>
                                <X size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalGrid} showsVerticalScrollIndicator={false}>
                            {accentOptions.map((opt) => (
                                <Pressable
                                    key={opt.name}
                                    style={[
                                        styles.themeOptionModal,
                                        { borderColor: accent === opt.name ? colors.primary : colors.border },
                                        accent === opt.name && { backgroundColor: colors.primary + '10' }
                                    ]}
                                    onPress={() => {
                                        setAccent(opt.name);
                                        setThemeModalVisible(false);
                                    }}
                                >
                                    <View style={[styles.themePreviewModal, { backgroundColor: opt.preview }]} />
                                    <Text style={[styles.themeLabelModal, { color: accent === opt.name ? colors.primary : colors.text }]}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            <View style={{ width: '100%', height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        padding: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
    },
    profileEmail: {
        fontSize: 14,
    },
    editButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    settingsCard: {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 24,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 16,
    },
    separator: {
        height: 1,
        marginLeft: 48,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    versionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    copyrightText: {
        fontSize: 12,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        padding: 20,
    },
    themeOptionModal: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 24,
        borderWidth: 2,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    themePreviewModal: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginBottom: 8,
    },
    themeLabelModal: {
        fontSize: 12,
        fontWeight: '600',
    },
    skeuoCardWrapper: {
        borderRadius: 24,
        marginBottom: 8,
    },
    skeuoCardInner: {
        borderRadius: 24,
    },
});
