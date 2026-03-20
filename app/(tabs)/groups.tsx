import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Themes, ThemeName, Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { StyledInput } from '../../components/StyledInput';
import { VibrantButton } from '../../components/VibrantButton';
import { useSplittyStore } from '../../store/useSplittyStore';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/EmptyState';

export default function GroupsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const groups = useSplittyStore(s => s.groups);
    const friends = useSplittyStore(s => s.friends);
    const addGroup = useSplittyStore(s => s.addGroup);
    const editGroup = useSplittyStore(s => s.editGroup);
    const deleteGroup = useSplittyStore(s => s.deleteGroup);
    const appearance = useSplittyStore(s => s.appearance);
    const colors = useSplittyStore(s => s.colors);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const fetchData = useSplittyStore(s => s.fetchData);
    const designPreference = useSplittyStore(s => s.designPreference);
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleSaveGroup = () => {
        if (groupName.trim() && selectedMembers.length > 0) {
            if (editingId) {
                editGroup(editingId, groupName.trim(), selectedMembers);
            } else {
                addGroup(groupName.trim(), selectedMembers);
            }
            resetForm();
        } else {
            Alert.alert('Error', 'Please enter a name and select at least one member');
        }
    };

    const resetForm = () => {
        setGroupName('');
        setSelectedMembers([]);
        setShowAdd(false);
        setEditingId(null);
    };

    const handleEdit = (group: any) => {
        setGroupName(group.name);
        setSelectedMembers(group.members);
        setEditingId(group.id);
        setShowAdd(true);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "Archive Group",
            `This will hide "${name}" from your view. Other members will still see it and all shared expenses will be preserved.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: () => deleteGroup(id)
                }
            ]
        );
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background, paddingTop: insets.top }]}>
            <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
                {!showAdd ? (
                    <VibrantButton
                        title="Create New Group"
                        onPress={() => { resetForm(); setShowAdd(true); }}
                        style={{ marginBottom: 20 }}
                    />
                ) : (
                    <View style={isSkeuomorphic ? [styles.skeuoAddWrapper, skeuo.outset.light] : null}>
                        <View style={isSkeuomorphic ? [styles.skeuoAddInner, skeuo.outset.dark] : null}>
                            <LinearGradient
                                colors={isSkeuomorphic ? skeuo.surfaceGradient : ['transparent', 'transparent']}
                                style={[styles.addCard, !isSkeuomorphic && { backgroundColor: colors.surface }]}
                            >
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>{editingId ? 'Edit Group' : 'New Group'}</Text>
                                <StyledInput
                                    label="Group Name"
                                    placeholder="e.g. Goa Trip"
                                    value={groupName}
                                    onChangeText={setGroupName}
                                    style={{ backgroundColor: isSkeuomorphic ? 'transparent' : colors.inputBackground, color: colors.text }}
                                    labelStyle={{ color: colors.textSecondary }}
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <Text style={[styles.label, { color: colors.text }]}>Select Members</Text>
                                <View style={styles.membersList}>
                                    {friends.map(friend => {
                                        const isSelected = selectedMembers.includes(friend.id);
                                        return (
                                            <Pressable
                                                key={friend.id}
                                                style={[
                                                    styles.memberChip,
                                                    !isSkeuomorphic && {
                                                        backgroundColor: isSelected ? colors.primary : colors.surface,
                                                        borderColor: isSelected ? colors.primary : colors.border
                                                    },
                                                    isSkeuomorphic && (isSelected ? skeuo.outset.light : skeuo.inset.dark)
                                                ]}
                                                onPress={() => toggleMember(friend.id)}
                                            >
                                                <View style={isSkeuomorphic ? (isSelected ? [styles.skeuoChipInner, skeuo.outset.dark] : [styles.skeuoChipInner, skeuo.inset.light]) : null}>
                                                    <Text style={[
                                                        styles.memberText,
                                                        { color: isSelected ? (isSkeuomorphic ? colors.primary : 'white') : colors.textSecondary },
                                                        isSkeuomorphic && isSelected && { fontWeight: '700' }
                                                    ]}>
                                                        {friend.name}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                                <View style={styles.actions}>
                                    <VibrantButton
                                        title="Cancel"
                                        onPress={resetForm}
                                        variant="outline"
                                        style={{ flex: 1 }}
                                        textStyle={{ color: colors.text }}
                                    />
                                    <VibrantButton
                                        title={editingId ? "Update" : "Create"}
                                        onPress={handleSaveGroup}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            </LinearGradient>
                        </View>
                    </View>
                )}

                <View style={[styles.listContainer, { flex: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Groups</Text>
                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoListWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoListInner, skeuo.outset.dark]}>
                                <View style={[styles.skeuoListContent, { backgroundColor: skeuo.background }]}>
                                    <FlatList
                                        data={groups}
                                        keyExtractor={(item) => item.id}
                                        refreshControl={
                                            <RefreshControl
                                                refreshing={refreshing}
                                                onRefresh={handleRefresh}
                                                tintColor={colors.primary}
                                            />
                                        }
                                        renderItem={({ item, index }) => (
                                            <React.Fragment key={item.id}>
                                                <Pressable
                                                    onPress={() => router.push({ pathname: '/group-details/[id]', params: { id: item.id } })}
                                                    style={styles.groupCard}
                                                >
                                                    <View style={[styles.groupIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.inputBackground }]}>
                                                        <Users color={colors.textSecondary} size={24} />
                                                    </View>
                                                    <View style={styles.groupInfo}>
                                                        <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                                                        <Text style={[styles.groupMembers, { color: colors.textSecondary }]}>
                                                            {item.members.length} members
                                                        </Text>
                                                    </View>
                                                    <View style={styles.rightActions}>
                                                        <Text style={[
                                                            styles.groupBalance,
                                                            { color: item.balance >= 0 ? colors.success : colors.accent, marginRight: 12 }
                                                        ]}>
                                                            {item.balance >= 0 ? `+${formatCurrency(item.balance)}` : `-${formatCurrency(Math.abs(item.balance))}`}
                                                        </Text>
                                                        <View style={styles.iconRow}>
                                                            <VibrantButton
                                                                onPress={() => handleEdit(item)}
                                                                variant="outline"
                                                                style={styles.actionButton}
                                                                leftIcon={<Pencil size={18} color={colors.primary} />}
                                                            />
                                                            <VibrantButton
                                                                onPress={() => handleDelete(item.id, item.name)}
                                                                variant="outline"
                                                                style={styles.actionButton}
                                                                leftIcon={<Trash2 size={18} color={colors.error} />}
                                                            />
                                                        </View>
                                                    </View>
                                                </Pressable>
                                                {index < groups.length - 1 && (
                                                    <View style={[styles.separator, { backgroundColor: colors.border + '20' }]} />
                                                )}
                                            </React.Fragment>
                                        )}
                                        ListEmptyComponent={
                                            <EmptyState
                                                icon={Users}
                                                title="No Groups Yet"
                                                message="Create a group to start sharing expenses with your travel buddies or roommates."
                                            />
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <FlatList
                            data={groups}
                            keyExtractor={(item) => item.id}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    tintColor={colors.primary}
                                />
                            }
                            renderItem={({ item }) => (
                                <Pressable
                                    key={item.id}
                                    onPress={() => router.push({ pathname: '/group-details/[id]', params: { id: item.id } })}
                                >
                                    <View style={[styles.groupCard, { backgroundColor: colors.surface, marginBottom: 12, borderRadius: 16, padding: 12 }]}>
                                        <View style={[styles.groupIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.inputBackground }]}>
                                            <Users color={colors.textSecondary} size={24} />
                                        </View>
                                        <View style={styles.groupInfo}>
                                            <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                                            <Text style={[styles.groupMembers, { color: colors.textSecondary }]}>
                                                {item.members.length} members
                                            </Text>
                                        </View>
                                        <View style={styles.rightActions}>
                                            <Text style={[
                                                styles.groupBalance,
                                                { color: item.balance >= 0 ? colors.success : colors.accent, marginRight: 12 }
                                            ]}>
                                                {item.balance >= 0 ? `+${formatCurrency(item.balance)}` : `-${formatCurrency(Math.abs(item.balance))}`}
                                            </Text>
                                            <View style={styles.iconRow}>
                                                <VibrantButton
                                                    onPress={() => handleEdit(item)}
                                                    variant="outline"
                                                    style={styles.actionButton}
                                                    leftIcon={<Pencil size={18} color={colors.primary} />}
                                                />
                                                <VibrantButton
                                                    onPress={() => handleDelete(item.id, item.name)}
                                                    variant="outline"
                                                    style={styles.actionButton}
                                                    leftIcon={<Trash2 size={18} color={colors.error} />}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <EmptyState
                                    icon={Users}
                                    title="No Groups Yet"
                                    message="Create a group to start sharing expenses with your travel buddies or roommates."
                                />
                            }
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },
    addCard: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    membersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    memberChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    memberText: {
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    listContainer: {
        flex: 1,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 16,
        borderRadius: 24,
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
    },
    groupMembers: {
        fontSize: 12,
        marginTop: 4,
    },
    rightActions: {
        alignItems: 'flex-end',
    },
    groupBalance: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    iconRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 18,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    skeuoGroupWrapper: {
        marginBottom: 12,
    },
    skeuoGroupOuter: {
        borderRadius: 24,
    },
    skeuoGroupInner: {
        borderRadius: 24,
    },
    skeuoListWrapper: {
        borderRadius: 24,
        flex: 1,
        marginBottom: 20,
    },
    skeuoListInner: {
        borderRadius: 24,
        flex: 1,
    },
    skeuoListContent: {
        borderRadius: 24,
        flex: 1,
        overflow: 'hidden',
    },
    separator: {
        height: 1,
        marginHorizontal: 16,
    },
    skeuoAddWrapper: {
        marginBottom: 24,
        borderRadius: 24,
    },
    skeuoAddInner: {
        borderRadius: 24,
    },
    skeuoChipInner: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 24,
    }
});
