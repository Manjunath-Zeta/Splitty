import React, { memo, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Search } from 'lucide-react-native';
import { Friend, Group, useSplittyStore } from '../store/useSplittyStore';
import { StyledInput } from './StyledInput';

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

    const [searchQuery, setSearchQuery] = useState('');

    const items = type === 'individual' ? friends : groups;

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item => item.name.toLowerCase().includes(lowerQuery));
    }, [items, searchQuery]);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <StyledInput
                    placeholder={`Search ${type === 'individual' ? 'friends' : 'groups'}...`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    containerStyle={{ marginBottom: 0 }}
                    editable={!disabled}
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        fontSize: 14,
                        backgroundColor: colors.surface,
                        borderRadius: 10,
                        opacity: disabled ? 0.7 : 1
                    }}
                />
            </View>

            <View style={styles.list}>
                {filteredItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.listItem,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                isSelected && {
                                    borderColor: colors.primary,
                                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)'
                                },
                                disabled && { opacity: 0.8 }
                            ]}
                            onPress={() => onToggle(item.id)}
                            activeOpacity={0.7}
                            disabled={disabled}
                        >
                            <Text style={[
                                styles.itemText,
                                { color: colors.text },
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
                })}
                {filteredItems.length === 0 && (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results found.</Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    searchContainer: {
        marginBottom: 12,
    },
    list: {
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
    },
    itemText: {
        fontSize: 15,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 14,
        marginTop: 8,
    }
});
