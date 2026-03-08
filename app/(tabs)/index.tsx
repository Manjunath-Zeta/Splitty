import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import { VibrantButton } from '../../components/VibrantButton';
import { useRouter } from 'expo-router';
import { useSplittyStore } from '../../store/useSplittyStore';
import { Trash2, Banknote, Plus } from 'lucide-react-native';
import { CategoryIcon } from '../../components/CategoryIcon';
import { getCategoryById } from '../../constants/Categories';
import { Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
    const router = useRouter();

    // Granular selectors — component only re-renders when these specific slices change
    const friends = useSplittyStore(s => s.friends);
    const expenses = useSplittyStore(s => s.expenses);
    const deleteExpense = useSplittyStore(s => s.deleteExpense);
    const colors = useSplittyStore(s => s.colors);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const userProfile = useSplittyStore(s => s.userProfile);
    const fetchData = useSplittyStore(s => s.fetchData);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const [refreshing, setRefreshing] = useState(false);

    // Memoized balance summaries
    const owed = useMemo(() => friends.reduce((acc, f) => f.balance > 0 ? acc + f.balance : acc, 0), [friends]);
    const owe = useMemo(() => friends.reduce((acc, f) => f.balance < 0 ? acc + Math.abs(f.balance) : acc, 0), [friends]);

    // Memoized recent expense list with pre-computed category to avoid getCategoryById in render
    const recentExpenses = useMemo(() => {
        return [...expenses]
            .filter(e => !e.isPersonal)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(e => ({ ...e, _category: getCategoryById(e.category) }));
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

    const getPayerName = useCallback((id: string) => {
        if (id === 'self') return 'You';
        return friends.find(f => f.id === id)?.name || 'Someone';
    }, [friends]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userProfile.name?.split(' ')[0] || 'Manjunath'}!</Text>
                    <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
                        {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                    </Text>
                </View>

                <View style={styles.summaryRow}>
                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoSummaryWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoSummaryInner, skeuo.outset.dark]}>
                                <LinearGradient colors={skeuo.surfaceGradient} style={styles.summaryCardContent}>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You are owed</Text>
                                    <Text style={[styles.summaryAmount, { color: colors.success }]}>{formatCurrency(owed)}</Text>
                                </LinearGradient>
                            </View>
                        </View>
                    ) : (
                        <GlassCard style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You are owed</Text>
                            <Text style={[styles.summaryAmount, { color: colors.success }]}>{formatCurrency(owed)}</Text>
                        </GlassCard>
                    )}

                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoSummaryWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoSummaryInner, skeuo.outset.dark]}>
                                <LinearGradient colors={skeuo.surfaceGradient} style={styles.summaryCardContent}>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You owe</Text>
                                    <Text style={[styles.summaryAmount, { color: colors.accent }]}>{formatCurrency(owe)}</Text>
                                </LinearGradient>
                            </View>
                        </View>
                    ) : (
                        <GlassCard style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You owe</Text>
                            <Text style={[styles.summaryAmount, { color: colors.accent }]}>{formatCurrency(owe)}</Text>
                        </GlassCard>
                    )}
                </View>

                {(owed > 0 || owe > 0) && (
                    <View style={styles.breakdownSection}>
                        {owed > 0 && (
                            <View style={isSkeuomorphic ? [styles.skeuoBreakdownWrapper, skeuo.outset.light, { marginBottom: owe > 0 ? 16 : 0 }] : null}>
                                <View style={isSkeuomorphic ? [styles.skeuoBreakdownInner, skeuo.outset.dark] : null}>
                                    <LinearGradient
                                        colors={isSkeuomorphic ? skeuo.surfaceGradient : ['transparent', 'transparent']}
                                        style={[styles.breakdownCard, !isSkeuomorphic && { backgroundColor: colors.surface, marginBottom: owe > 0 ? 16 : 0 }]}
                                    >
                                        <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>People who owe you</Text>
                                        {friends
                                            .filter(f => f.balance > 0)
                                            .sort((a, b) => b.balance - a.balance)
                                            .slice(0, 3)
                                            .map(friend => (
                                                <TouchableOpacity
                                                    key={friend.id}
                                                    style={styles.breakdownItem}
                                                    onPress={() => router.push({ pathname: '/friend-details/[id]', params: { id: friend.id } })}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.breakdownName, { color: colors.text }]}>{friend.name}</Text>
                                                    <Text style={[styles.breakdownAmount, { color: colors.success }]}>
                                                        {formatCurrency(friend.balance)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                    </LinearGradient>
                                </View>
                            </View>
                        )}

                        {owe > 0 && (
                            <View style={isSkeuomorphic ? [styles.skeuoBreakdownWrapper, skeuo.outset.light] : null}>
                                <View style={isSkeuomorphic ? [styles.skeuoBreakdownInner, skeuo.outset.dark] : null}>
                                    <LinearGradient
                                        colors={isSkeuomorphic ? skeuo.surfaceGradient : ['transparent', 'transparent']}
                                        style={[styles.breakdownCard, !isSkeuomorphic && { backgroundColor: colors.surface }]}
                                    >
                                        <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>People you owe</Text>
                                        {friends
                                            .filter(f => f.balance < 0)
                                            .sort((a, b) => Math.abs(a.balance) - Math.abs(b.balance))
                                            .slice(0, 3)
                                            .map(friend => (
                                                <TouchableOpacity
                                                    key={friend.id}
                                                    style={styles.breakdownItem}
                                                    onPress={() => router.push({ pathname: '/friend-details/[id]', params: { id: friend.id } })}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.breakdownName, { color: colors.text }]}>{friend.name}</Text>
                                                    <Text style={[styles.breakdownAmount, { color: colors.accent }]}>
                                                        {formatCurrency(Math.abs(friend.balance))}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                    </LinearGradient>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <VibrantButton
                    title="View Analytics"
                    onPress={() => router.push('/analytics')}
                    variant="outline"
                    style={[styles.analyticsButton, isSkeuomorphic && { borderRadius: skeuo.radii.button }]}
                />

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push('/activity')}>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {recentExpenses.length > 0 ? (
                        isSkeuomorphic ? (
                            <View style={[styles.skeuoActivityGroupWrapper, skeuo.outset.light]}>
                                <View style={[styles.skeuoActivityGroupInner, skeuo.outset.dark]}>
                                    <View style={[styles.skeuoActivityGroupContent, { backgroundColor: skeuo.background }]}>
                                        {recentExpenses.map((expense: any, index: number) => (
                                            <React.Fragment key={expense.id}>
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => router.push({ pathname: '/add-expense', params: { id: expense.id } })}
                                                    style={styles.activityItem}
                                                >
                                                    <View style={[
                                                        styles.categoryIcon,
                                                        { backgroundColor: expense.isSettlement ? colors.success + '20' : expense._category.color + '20' }
                                                    ]}>
                                                        {expense.isSettlement ? (
                                                            <Banknote size={20} color={colors.primary} />
                                                        ) : (
                                                            <CategoryIcon name={expense._category.icon} size={20} color={expense._category.color} />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                                        <Text style={[styles.activityDesc, { color: colors.text }]}>{expense.description}</Text>
                                                        <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                                                            {new Date(expense.date).toLocaleDateString()}
                                                        </Text>
                                                        <Text style={[styles.paidByText, { color: colors.textSecondary }]}>
                                                            {getPayerName(expense.payerId)} paid
                                                        </Text>
                                                    </View>
                                                    <View style={styles.activityRight}>
                                                        <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(expense.amount)}</Text>
                                                        <VibrantButton
                                                            onPress={() => handleDelete(expense.id)}
                                                            variant="outline"
                                                            style={styles.deleteButton}
                                                            leftIcon={<Trash2 size={18} color={colors.error} />}
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                                {index < recentExpenses.length - 1 && (
                                                    <View style={[styles.separator, { backgroundColor: colors.border + '20' }]} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            recentExpenses.map((expense: any) => (
                                <TouchableOpacity
                                    key={expense.id}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/add-expense', params: { id: expense.id } })}
                                >
                                    <GlassCard
                                        style={[
                                            styles.activityItem,
                                            { backgroundColor: colors.surface },
                                            { borderLeftWidth: 3, borderLeftColor: expense.isSettlement ? colors.success : expense._category.color }
                                        ]}
                                    >
                                        <View style={[
                                            styles.categoryIcon,
                                            { backgroundColor: expense.isSettlement ? colors.success + '20' : expense._category.color + '20' }
                                        ]}>
                                            {expense.isSettlement ? (
                                                <Banknote size={20} color={colors.primary} />
                                            ) : (
                                                <CategoryIcon name={expense._category.icon} size={20} color={expense._category.color} />
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.activityDesc, { color: colors.text }]}>{expense.description}</Text>
                                            <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                                                {new Date(expense.date).toLocaleDateString()}
                                            </Text>
                                            <Text style={[styles.paidByText, { color: colors.textSecondary }]}>
                                                {getPayerName(expense.payerId)} paid
                                            </Text>
                                        </View>
                                        <View style={styles.activityRight}>
                                            <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(expense.amount)}</Text>
                                            <VibrantButton
                                                onPress={() => handleDelete(expense.id)}
                                                variant="outline"
                                                style={styles.deleteButton}
                                                leftIcon={<Trash2 size={18} color={colors.error} />}
                                            />
                                        </View>
                                    </GlassCard>
                                </TouchableOpacity>
                            ))
                        )
                    ) : (
                        <GlassCard style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No recent activity yet. Start spliting bills!</Text>
                        </GlassCard>
                    )}
                </View>


            </ScrollView>

            <VibrantButton
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/add-expense');
                }}
                style={[styles.fab, isSkeuomorphic && { borderRadius: skeuo.radii.fab }]}
                leftIcon={<Plus size={32} color={isSkeuomorphic ? colors.primary : "white"} />}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        padding: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'flex-start',
    },
    greeting: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subGreeting: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 48,
        fontWeight: '800',
        marginTop: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    summaryCard: {
        width: '48%',
    },
    summaryCardContent: {
        padding: 16,
        borderRadius: 24,
    },
    iconContainer: {
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 18,
        fontWeight: '700',
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '600',
    },
    activityCard: {
        padding: 40,
    },
    activityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 8,
    },
    activityRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityDesc: {
        fontSize: 16,
        fontWeight: '600',
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityDate: {
        fontSize: 12,
        marginTop: 4,
    },
    activityAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    paidByText: {
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    addButton: {
        marginBottom: 12,
    },
    analyticsButton: {
        marginBottom: 30,
        borderColor: 'rgba(150,150,150,0.5)',
    },
    breakdownSection: {
        marginBottom: 30,
    },
    breakdownCard: {
        padding: 16,
        borderRadius: 24,
    },
    breakdownTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    breakdownName: {
        fontSize: 16,
        fontWeight: '500',
    },
    breakdownAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 28,
    },
    skeuoSummaryWrapper: {
        width: '48%',
        borderRadius: 24,
    },
    skeuoSummaryInner: {
        borderRadius: 24,
    },
    skeuoActivityWrapper: {
        marginBottom: 12,
    },
    skeuoActivityOuter: {
        borderRadius: 24,
    },
    skeuoActivityInner: {
        borderRadius: 24,
    },
    skeuoBreakdownWrapper: {
        borderRadius: 24,
    },
    skeuoBreakdownInner: {
        borderRadius: 24,
    },
    skeuoActivityGroupWrapper: {
        borderRadius: 24,
        marginBottom: 20,
    },
    skeuoActivityGroupInner: {
        borderRadius: 24,
    },
    skeuoActivityGroupContent: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    separator: {
        height: 1,
        marginHorizontal: 16,
    },
});
