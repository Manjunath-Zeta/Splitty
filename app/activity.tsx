import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    TextInput,
    RefreshControl,
    Pressable
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { VibrantButton } from '../components/VibrantButton';
import { ArrowLeft, Search, Trash2, Banknote, Users, Receipt } from 'lucide-react-native';
import { EmptyState } from '../components/EmptyState';
import { CATEGORIES } from '../constants/Categories';
import * as Haptics from 'expo-haptics';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function ActivityScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const expenses = useSplittyStore(s => s.expenses);
    const friends = useSplittyStore(s => s.friends);
    const groups = useSplittyStore(s => s.groups);
    const colors = useSplittyStore(s => s.colors);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const deleteExpense = useSplittyStore(s => s.deleteExpense);
    const fetchData = useSplittyStore(s => s.fetchData);
    const unknownFriendNames = useSplittyStore(s => s.unknownFriendNames);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const getCategory = useSplittyStore(s => s.getCategoryById);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const getPayerName = useCallback((id: string) => {
        if (id === 'self') return 'You';
        return friends.find(f => f.id === id)?.name || unknownFriendNames[id] || 'Unknown';
    }, [friends, unknownFriendNames]);

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

        return filtered
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(e => ({
                ...e,
                _category: getCategory(e.category),
                _payerName: e.payerId === 'self' ? 'You' : friends.find(f => f.id === e.payerId)?.name || unknownFriendNames[e.payerId] || 'Unknown',
                _groupName: e.groupId ? groups.find(g => g.id === e.groupId)?.name : undefined,
            }));
    }, [expenses, searchQuery, selectedTag, friends, groups, unknownFriendNames, getCategory]);

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
        <Pressable
            onPress={() => router.push({ pathname: '/add-expense', params: { id: item.id } })}
        >
            {isSkeuomorphic ? (
                <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                    <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                        <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoActivityItem}>
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
                                        <View style={[styles.groupTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
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
                                            <View key={tag} style={[styles.itemTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[styles.itemTagText, { color: colors.primary }]}>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={styles.activityRight}>
                                <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                                <VibrantButton
                                    onPress={() => handleDelete(item.id)}
                                    variant="outline"
                                    style={styles.deleteButton}
                                    leftIcon={<Trash2 size={18} color={colors.error} />}
                                />
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            ) : (
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
                    </View>
                    <View style={styles.activityRight}>
                        <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                        <VibrantButton
                            onPress={() => handleDelete(item.id)}
                            variant="outline"
                            style={styles.deleteButton}
                            leftIcon={<Trash2 size={18} color={colors.error} />}
                        />
                    </View>
                </GlassCard>
            )}
        </Pressable>
    ), [colors, formatCurrency, handleDelete, router, isSkeuomorphic, skeuo, isDark]);

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: insets.top + (isSkeuomorphic ? 10 : 0) }]}>
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                            <Pressable 
                                onPress={() => router.back()} 
                                style={[styles.backButtonSkeuo, { backgroundColor: skeuo.background }]}
                                hitSlop={20}
                            >
                                <ArrowLeft size={24} color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable 
                        onPress={() => router.back()} 
                        style={styles.backButton}
                        hitSlop={20}
                    >
                        <ArrowLeft size={24} color={colors.text} />
                    </Pressable>
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Activity</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.searchContainer}>
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoSearchWrapper, skeuo.inset.dark]}>
                        <View style={[styles.skeuoSearchInner, skeuo.inset.light]}>
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
                ) : (
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
                )}
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
                            <Pressable
                                style={[
                                    styles.filterChip,
                                    !isSkeuomorphic && { borderColor: colors.border, backgroundColor: colors.surface },
                                    isSkeuomorphic && (selectedTag === item ? skeuo.outset.light : skeuo.inset.dark),
                                    selectedTag === item && !isSkeuomorphic && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedTag(selectedTag === item ? null : item);
                                }}
                            >
                                <View style={isSkeuomorphic ? (selectedTag === item ? [styles.skeuoChipInner, skeuo.outset.dark] : [styles.skeuoChipInner, skeuo.inset.light]) : null}>
                                    <Text style={[
                                        styles.filterChipText,
                                        { color: colors.textSecondary },
                                        selectedTag === item && { color: isSkeuomorphic ? colors.primary : 'white', fontWeight: 'bold' }
                                    ]}>
                                        #{item}
                                    </Text>
                                </View>
                            </Pressable>
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
                    <EmptyState
                        icon={Receipt}
                        title="No Expenses Found"
                        message={searchQuery ? `No results for "${searchQuery}"` : "You haven't added any split bills yet."}
                    />
                }
                removeClippedSubviews
                maxToRenderPerBatch={12}
                windowSize={7}
                initialNumToRender={10}
            />
        </View>
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
    backButtonSkeuo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    skeuoSearchWrapper: {
        borderRadius: 24,
    },
    skeuoSearchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
    },
    searchInput: { flex: 1, fontSize: 16 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 24,
    },
    skeuoActivityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
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
        borderRadius: 12,
    },
    groupTagText: { fontSize: 10, fontWeight: '500' },
    itemTagsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    itemTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
    itemTagText: { fontSize: 10, fontWeight: '600' },
    paidByText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    activityRight: { alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    activityAmount: { fontSize: 16, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
    tagsContainer: { marginBottom: 16 },
    filterChip: {
        borderRadius: 24,
        marginRight: 8,
    },
    skeuoChipInner: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
    },
    filterChipText: { fontSize: 13 },
    skeuoIconWrapper: {
        borderRadius: 22,
    },
    skeuoIconInner: {
        borderRadius: 22,
    },
    skeuoCardOuter: {
        borderRadius: 24,
        marginBottom: 12,
    },
    skeuoCardInner: {
        borderRadius: 24,
    }
});
