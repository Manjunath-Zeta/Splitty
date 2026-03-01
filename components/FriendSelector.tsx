import React, { memo, useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal,
    SafeAreaView, FlatList, TextInput
} from 'react-native';
import { Check, Search, X, Users, ChevronRight } from 'lucide-react-native';
import { Friend, Group, useSplittyStore } from '../store/useSplittyStore';
import * as Haptics from 'expo-haptics';

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
    const isDark = appearance === 'dark';

    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    return (
        <>
            {/* Trigger Button */}
            <TouchableOpacity
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
                activeOpacity={0.7}
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
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Modal Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Select {label}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setModalVisible(false);
                            }}
                            style={[styles.doneButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.doneButtonText}>
                                Done {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
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
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

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
                                <TouchableOpacity
                                    style={[
                                        styles.listItem,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: isSelected ? colors.primary : colors.border
                                        },
                                        isSelected && {
                                            backgroundColor: isDark
                                                ? 'rgba(99,102,241,0.15)'
                                                : 'rgba(99,102,241,0.08)'
                                        }
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onToggle(item.id);
                                    }}
                                    activeOpacity={0.7}
                                >
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
                                        isSelected && { color: colors.primary, fontWeight: '600' }
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
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No {label} found.
                            </Text>
                        }
                    />
                </SafeAreaView>
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
        paddingHorizontal: 16,
        borderRadius: 12,
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
        borderRadius: 20,
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
        borderRadius: 12,
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
        borderRadius: 8,
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
        borderRadius: 12,
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
});
