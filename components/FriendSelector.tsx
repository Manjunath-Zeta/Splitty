import React, { memo, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Check, Search, X, Users, ChevronRight, UserPlus } from 'lucide-react-native';
import { Friend, Group, useSplittyStore } from '../store/useSplittyStore';
// import * as Contacts from 'expo-contacts';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

interface FriendSelectorProps {
    type: 'individual' | 'group';
    friends: Friend[];
    groups: Group[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    disabled?: boolean;
}

export const FriendSelector = memo(({ type, friends, groups, selectedIds, onToggle, disabled }: FriendSelectorProps) => {
    const colors = useSplittyStore(state => state.colors);
    const appearance = useSplittyStore(state => state.appearance);
    const designPreference = useSplittyStore(state => state.designPreference);
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const addFriend = useSplittyStore(state => state.addFriend);

    const items = type === 'individual' ? friends : groups;

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item => item.name.toLowerCase().includes(lowerQuery));
    }, [items, searchQuery]);

    const selectedNames = useMemo(() => {
        return selectedIds
            .map(id => items.find(i => i.id === id)?.name)
            .filter(Boolean) as string[];
    }, [selectedIds, items]);

    const label = type === 'individual' ? 'friends' : 'groups';

    const openModal = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setModalVisible(true);
    };

    const importContact = async () => {
        try {
            // Dynamic require to prevent evaluation error
            const Contacts = require('expo-contacts');
            if (!Contacts?.requestPermissionsAsync) {
                Alert.alert('Module Missing', 'The contacts module is not available on this build.');
                return;
            }
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow contacts access in your device settings.');
                return;
            }

            const contact = await Contacts.presentContactPickerAsync();
            if (!contact) return; 

            const phoneRecord = contact.phoneNumbers?.[0];
            if (!phoneRecord?.number) {
                Alert.alert('No Phone Number', 'The selected contact does not have a phone number.');
                return;
            }

            const rawNumber = phoneRecord.number;
            let normalizedNumber = rawNumber;
            try {
                // Try parsing cleanly first (defaulting to US if no country code provided, though devices vary)
                const phoneNumberObj = parsePhoneNumberWithError(rawNumber, 'US');
                normalizedNumber = phoneNumberObj.format('E.164'); 
            } catch (err) {
                // Fallback to basic stripping
                normalizedNumber = rawNumber.replace(/[^\d+]/g, '');
            }

            setIsImporting(true);
            const resolvedName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
            const contactName = contact.name || resolvedName || contact.company || 'Unknown Contact';

            // Check if phone number is registered in Supabase
            const { data, error } = await supabase.rpc('lookup_user_by_phone', { search_phone: normalizedNumber });
            
            if (error) {
                console.error("Lookup error:", error);
                throw error;
            }

            let newFriendId: string;
            if (data && data.id) {
                const existingLinkedFriend = items.find(f => (f as any).linkedUserId === data.id);
                if (existingLinkedFriend) {
                    newFriendId = existingLinkedFriend.id;
                    Alert.alert('Success', `Auto-selected existing friend ${existingLinkedFriend.name}!`);
                } else {
                    newFriendId = await addFriend(contactName, data.id, normalizedNumber);
                    Alert.alert('Success', `Matched with registered user ${data.full_name}!`);
                }
            } else {
                const existingLocalFriend = items.find(f => f.name.toLowerCase() === contactName.toLowerCase());
                if (existingLocalFriend) {
                    newFriendId = existingLocalFriend.id;
                    Alert.alert('Success', `Auto-selected existing contact ${existingLocalFriend.name}!`);
                } else {
                    newFriendId = await addFriend(contactName, undefined, normalizedNumber);
                    Alert.alert('Success', `Added ${contactName} as a local contact.`);
                }
            }

            // Auto-select the newly added or existing friend
            if (!selectedIds.includes(newFriendId)) {
                onToggle(newFriendId);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to import contact.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            {isSkeuomorphic ? (
                <Pressable onPress={openModal} disabled={disabled}>
                    <View style={[styles.skeuoTriggerWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoTriggerInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={[styles.triggerButton, { borderWidth: 0 }]}>
                                <View style={styles.triggerLeft}>
                                    <Users size={18} color={selectedIds.length > 0 ? colors.primary : colors.textSecondary} />
                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                        {selectedIds.length === 0 ? (
                                            <Text style={[styles.triggerPlaceholder, { color: colors.textSecondary }]}>
                                                Tap to select {label}...
                                            </Text>
                                        ) : (
                                            <>
                                                <Text style={[styles.triggerCount, { color: colors.primary }]}>
                                                    {selectedIds.length} {label} selected
                                                </Text>
                                                <Text
                                                    style={[styles.triggerNames, { color: colors.textSecondary }]}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {selectedNames.join(', ')}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                <ChevronRight size={18} color={colors.textSecondary} />
                            </LinearGradient>
                        </View>
                    </View>
                </Pressable>
            ) : (
                <Pressable
                    style={[
                        styles.triggerButton,
                        {
                            backgroundColor: colors.surface,
                            borderColor: selectedIds.length > 0 ? colors.primary : colors.border,
                        },
                        disabled && { opacity: 0.7 }
                    ]}
                    onPress={openModal}
                    disabled={disabled}
                >
                    <View style={styles.triggerLeft}>
                        <Users size={18} color={selectedIds.length > 0 ? colors.primary : colors.textSecondary} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            {selectedIds.length === 0 ? (
                                <Text style={[styles.triggerPlaceholder, { color: colors.textSecondary }]}>
                                    Tap to select {label}...
                                </Text>
                            ) : (
                                <>
                                    <Text style={[styles.triggerCount, { color: colors.primary }]}>
                                        {selectedIds.length} {label} selected
                                    </Text>
                                    <Text
                                        style={[styles.triggerNames, { color: colors.textSecondary }]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {selectedNames.join(', ')}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                    <ChevronRight size={18} color={colors.textSecondary} />
                </Pressable>
            )}

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Modal Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Select {label}
                        </Text>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setModalVisible(false);
                            }}
                            style={[styles.doneButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.doneButtonText}>
                                Done {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Search Bar */}
                    <View style={isSkeuomorphic ? [styles.skeuoSearchWrapper, skeuo.inset.dark] : [styles.searchBar, { backgroundColor: colors.surface }]}>
                        <View style={isSkeuomorphic ? [styles.skeuoSearchInner, skeuo.inset.light] : { flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput
                                placeholder={`Search ${label}...`}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.searchInput, { color: colors.text }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                clearButtonMode="while-editing"
                            />
                            {searchQuery.length > 0 && (
                                <Pressable onPress={() => setSearchQuery('')}>
                                    <X size={16} color={colors.textSecondary} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Import Contact Button */}
                    {type === 'individual' && (
                        <Pressable 
                            style={[
                                styles.importContactButton, 
                                isSkeuomorphic ? skeuo.outset.light : { backgroundColor: colors.primary + '15' }
                            ]}
                            onPress={importContact}
                            disabled={isImporting}
                        >
                            <View style={isSkeuomorphic ? [styles.skeuoImportInner, skeuo.outset.dark] : styles.importInner}>
                                {isImporting ? (
                                    <ActivityIndicator size="small" color={isSkeuomorphic ? colors.text : colors.primary} />
                                ) : (
                                    <UserPlus size={18} color={isSkeuomorphic ? colors.text : colors.primary} />
                                )}
                                <Text style={[
                                    styles.importContactText, 
                                    { color: isSkeuomorphic ? colors.text : colors.primary }
                                ]}>
                                    {isImporting ? 'Importing...' : 'Add from Contacts'}
                                </Text>
                            </View>
                        </Pressable>
                    )}

                    {/* Selected count header */}
                    {selectedIds.length > 0 && (
                        <View style={[styles.selectionBanner, { backgroundColor: colors.primary + '18' }]}>
                            <Text style={[styles.selectionBannerText, { color: colors.primary }]}>
                                ✓ {selectedNames.join(', ')}
                            </Text>
                        </View>
                    )}

                    {/* List */}
                    <FlatList
                        data={filteredItems}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <Pressable
                                    style={[
                                        styles.listItem,
                                        !isSkeuomorphic && {
                                            backgroundColor: colors.surface,
                                            borderColor: isSelected ? colors.primary : colors.border
                                        },
                                        !isSkeuomorphic && isSelected && {
                                            backgroundColor: isDark
                                                ? 'rgba(99,102,241,0.15)'
                                                : 'rgba(99,102,241,0.08)'
                                        },
                                        isSkeuomorphic && styles.skeuoListItem,
                                        isSkeuomorphic && (isSelected ? skeuo.outset.light : skeuo.inset.dark)
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onToggle(item.id);
                                    }}
                                >
                                    <View style={isSkeuomorphic ? (isSelected ? [styles.skeuoItemInner, skeuo.outset.dark] : [styles.skeuoItemInner, skeuo.inset.light]) : { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                                        {/* Avatar */}
                                        <View style={[
                                            styles.avatar,
                                            {
                                                backgroundColor: isSelected
                                                    ? colors.primary
                                                    : colors.primary + '25'
                                            }
                                        ]}>
                                            <Text style={[styles.avatarText, { color: isSelected ? 'white' : colors.primary }]}>
                                                {item.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>

                                        <Text style={[
                                            styles.itemText,
                                            { color: colors.text, flex: 1 },
                                            isSelected && { color: isSkeuomorphic ? colors.text : colors.primary, fontWeight: '600' }
                                        ]}>
                                            {item.name}
                                        </Text>

                                        <View style={[
                                            styles.checkbox,
                                            { borderColor: isSelected ? colors.primary : colors.textSecondary },
                                            isSelected && { backgroundColor: colors.primary }
                                        ]}>
                                            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No {label} found.
                            </Text>
                        }
                    />
                </View>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    triggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
    },
    triggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    triggerPlaceholder: {
        fontSize: 15,
    },
    triggerCount: {
        fontSize: 15,
        fontWeight: '600',
    },
    triggerNames: {
        fontSize: 12,
        marginTop: 2,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    doneButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
    },
    doneButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 24,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    selectionBanner: {
        marginHorizontal: 16,
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    selectionBannerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 15,
        fontWeight: '700',
    },
    itemText: {
        fontSize: 15,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 14,
        marginTop: 20,
    },
    skeuoTriggerWrapper: {
        marginBottom: 16,
        borderRadius: 28,
    },
    skeuoTriggerInner: {
        borderRadius: 28,
    },
    skeuoSearchWrapper: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 24,
    },
    skeuoSearchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 24,
    },
    skeuoListItem: {
        borderWidth: 0,
    },
    skeuoItemInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        gap: 12,
        flex: 1,
    },
    importContactButton: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 24,
    },
    importInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    skeuoImportInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
        borderRadius: 24,
    },
    importContactText: {
        fontWeight: '600',
        fontSize: 15,
    }
});
