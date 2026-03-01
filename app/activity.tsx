import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { ArrowLeft, Search, Trash2, Banknote, Users } from 'lucide-react-native';
import { getCategoryById } from '../constants/Categories';
import * as Haptics from 'expo-haptics';

export default function ActivityScreen() {
    const router = useRouter();

    // Granular selectors — component only re-renders when these specific slices change
    const expenses = useSplittyStore(s => s.expenses);
    const friends = useSplittyStore(s => s.friends);
    const groups = useSplittyStore(s => s.groups);
    const colors = useSplittyStore(s => s.colors);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const deleteExpense = useSplittyStore(s => s.deleteExpense);
    const fetchData = useSplittyStore(s => s.fetchData);
    const unknownFriendNames = useSplittyStore(s => s.unknownFriendNames);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Memoized helper — avoids recreation on every render
    const getPayerName = useCallback((id: string) => {
        if (id === 'self') return 'You';
        return friends.find(f => f.id === id)?.name || unknownFriendNames[id] || 'Unknown';
    }, [friends, unknownFriendNames]);

    // Memoized filtered + enriched expense list
    const filteredExpenses = useMemo(() => {
        let filtered = expenses;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.description.toLowerCase().includes(query) ||
                (e.amount && e.amount.toString().includes(query)) ||
                (e.payerId === 'self' ? 'you' : friends.find(f => f.id === e.payerId)?.name || '').toLowerCase().includes(query) ||
                (e.tags && e.tags.some(t => t.toLowerCase().includes(query)))
            );
        }

        if (selectedTag) {
            filtered = filtered.filter(e => e.tags && e.tags.includes(selectedTag));
        }

        // Pre-compute category per expense so renderItem doesn't call getCategoryById on every pass
        return filtered
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(e => ({
                ...e,
                _category: getCategoryById(e.category),
                _payerName: e.payerId === 'self' ? 'You' : friends.find(f => f.id === e.payerId)?.name || unknownFriendNames[e.payerId] || 'Unknown',
                _groupName: e.groupId ? groups.find(g => g.id === e.groupId)?.name : undefined,
            }));
    }, [expenses, searchQuery, selectedTag, friends, groups, unknownFriendNames]);

    // Extract all unique tags — memoized
    const allUniqueTags = useMemo(() => {
        return Array.from(new Set(expenses.flatMap(e => e.tags || []))).sort();
    }, [expenses]);

    const handleDelete = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            "Delete Expense",
            "Are you sure you want to delete this expense?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteExpense(id)
                }
            ]
        );
    }, [deleteExpense]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    const renderItem = useCallback(({ item }: { item: typeof filteredExpenses[0] }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/add-expense', params: { id: item.id } })}
        >
            <GlassCard style={[
                styles.activityItem,
                { backgroundColor: colors.surface },
                { borderLeftWidth: 3, borderLeftColor: item.isSettlement ? colors.success : item._category.color }
            ]}>
                <View style={[
                    styles.categoryIcon,
                    { backgroundColor: item.isSettlement ? colors.success + '20' : item._category.color + '20' }
                ]}>
                    {item.isSettlement ? (
                        <Banknote size={20} color={colors.primary} />
                    ) : (
                        <CategoryIcon name={item._category.icon} size={20} color={item._category.color} />
                    )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.activityDesc, { color: colors.text }]}>{item.description}</Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                            {new Date(item.date).toLocaleDateString()}
                        </Text>
                        {item._groupName && (
                            <View style={[styles.groupTag, { backgroundColor: colors.inputBackground }]}>
                                <Users size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.groupTagText, { color: colors.textSecondary }]}>
                                    {item._groupName}
                                </Text>
                            </View>
                        )}
                    </View>
                    {item.tags && item.tags.length > 0 && (
                        <View style={styles.itemTagsWrapper}>
                            {item.tags.map(tag => (
                                <View key={tag} style={[styles.itemTag, { backgroundColor: colors.inputBackground }]}>
                                    <Text style={[styles.itemTagText, { color: colors.primary }]}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {!item.isSettlement && (
                        <Text style={[styles.paidByText, { color: colors.textSecondary }]}>
                            {item._payerName} paid
                        </Text>
                    )}
                </View>
                <View style={styles.activityRight}>
                    <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                        }}
                        hitSlop={10}
                    >
                        <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </GlassCard>
        </TouchableOpacity>
    ), [colors, formatCurrency, handleDelete, router]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Activity</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                    <Search size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search expenses..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {allUniqueTags.length > 0 && (
                <View style={styles.tagsContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={allUniqueTags}
                        keyExtractor={(item) => item}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    { borderColor: colors.border, backgroundColor: colors.surface },
                                    selectedTag === item && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedTag(selectedTag === item ? null : item);
                                }}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    { color: colors.textSecondary },
                                    selectedTag === item && { color: 'white', fontWeight: 'bold' }
                                ]}>
                                    #{item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <FlatList
                data={filteredExpenses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: colors.textSecondary }}>No activity found.</Text>
                    </View>
                }
                removeClippedSubviews
                maxToRenderPerBatch={12}
                windowSize={7}
                initialNumToRender={10}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 16 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityDesc: { fontSize: 16, fontWeight: '600' },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
        gap: 8,
    },
    activityDate: { fontSize: 12 },
    groupTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    groupTagText: { fontSize: 10, fontWeight: '500' },
    itemTagsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    itemTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    itemTagText: { fontSize: 10, fontWeight: '600' },
    paidByText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    activityRight: { alignItems: 'flex-end', gap: 8 },
    activityAmount: { fontSize: 16, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
    tagsContainer: { marginBottom: 16 },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
    },
    filterChipText: { fontSize: 13 },
});
