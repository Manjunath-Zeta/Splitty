import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSplittyStore } from '../../../store/useSplittyStore';
import { GlassCard } from '../../../components/GlassCard';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { Skeuomorphic } from '../../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function BudgetCategorySceen() {
    const router = useRouter();
    const { month, categoryId } = useLocalSearchParams<{ month: string, categoryId: string }>();
    const colors = useSplittyStore(s => s.colors);
    const expenses = useSplittyStore(s => s.expenses);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const friends = useSplittyStore(s => s.friends);
    const getCategoryById = useSplittyStore(s => s.getCategoryById);
    const designPreference = useSplittyStore(s => s.designPreference);
    const appearance = useSplittyStore(s => s.appearance);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const catData = getCategoryById(categoryId);

    const dateObj = new Date(`${month}-01T00:00:00Z`);
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Filter and map expenses
    const categoryExpenses = useMemo(() => {
        const startOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59);

        // Filter exact month and category, ignoring settlements
        const filtered = expenses.filter(e => {
            if (e.isSettlement || e.category !== categoryId) return false;
            const eDate = new Date(e.date);
            return eDate >= startOfMonth && eDate <= endOfMonth;
        });

        // Calculate user's specific share for each expense
        return filtered.map(e => {
            let myShare = 0;
            if (e.splitType === 'unequal' && e.splitDetails) {
                myShare = e.splitDetails['self'] || 0;
            } else {
                const totalPeople = (e.splitWith?.length || 0) + 1;
                myShare = e.amount / totalPeople;
            }

            return {
                ...e,
                myShare
            };
        }).filter(e => e.myShare > 0) // Only show if user paid something toward it
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

    }, [expenses, month, categoryId]);

    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.myShare, 0);

    const Header = () => (
        <View style={styles.header}>
            {isSkeuomorphic ? (
                <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                    <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                        <Pressable onPress={() => router.back()} style={[styles.backButtonSkeuo, { backgroundColor: skeuo.background }]}>
                            <ChevronLeft color={colors.text} size={28} />
                        </Pressable>
                    </View>
                </View>
            ) : (
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </Pressable>
            )}
            <View style={styles.headerTitleContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: catData.color + '20' }]}>
                    <CategoryIcon name={catData.icon} color={catData.color} size={32} />
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{catData.label}</Text>
            </View>
            <View style={{ width: 44 }} />
        </View>
    );

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header />

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.summaryContainer}>
                    <Text style={[styles.summaryMonth, { color: colors.textSecondary }]}>{monthName}</Text>
                    <Text style={[styles.summaryTotal, { color: colors.text }]}>{formatCurrency(totalSpent)}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                </View>

                <View style={styles.transactionsHeader}>
                    <Text style={[styles.transactionsTitle, { color: colors.text }]}>Transactions</Text>
                    <Text style={[styles.transactionsCount, { color: colors.textSecondary }]}>
                        {categoryExpenses.length} transaction{categoryExpenses.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                {categoryExpenses.length > 0 ? (
                    <View style={styles.transactionsList}>
                        {categoryExpenses.map(expense => {
                            // Helper to find who paid if not 'self'
                            const paidByFriend = expense.payerId !== 'self' ? friends.find(f => f.id === expense.payerId)?.name || 'Someone' : null;

                            const cardContent = (
                                <>
                                    <View style={styles.expenseHeader}>
                                        <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>
                                            {expense.description}
                                        </Text>
                                        <Text style={[styles.expenseAmount, { color: colors.text }]}>
                                            {formatCurrency(expense.myShare)}
                                        </Text>
                                    </View>

                                    <View style={styles.expenseFooter}>
                                        <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                                            {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text>
                                        <View style={[styles.splitBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Text style={[styles.splitText, { color: colors.primary }]}>
                                                {expense.payerId === 'self' ? 'You paid' : `${paidByFriend} paid`}
                                                {' • '}
                                                {formatCurrency(expense.amount)} total
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            );

                            if (isSkeuomorphic) {
                                return (
                                    <View key={expense.id} style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoExpenseCard}>
                                                {cardContent}
                                            </LinearGradient>
                                        </View>
                                    </View>
                                );
                            }

                            return (
                                <GlassCard
                                    key={expense.id}
                                    style={[styles.expenseCard, { backgroundColor: colors.surface }]}
                                >
                                    {cardContent}
                                </GlassCard>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No personal transactions found in this category for {monthName}.
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: { padding: 4 },
    backButtonSkeuo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrapper: { padding: 8, borderRadius: 10 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    summaryContainer: { alignItems: 'center', marginVertical: 30 },
    summaryMonth: { fontSize: 16, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    summaryTotal: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
    summaryLabel: { fontSize: 14, fontWeight: '500' },
    transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
    transactionsTitle: { fontSize: 20, fontWeight: '700' },
    transactionsCount: { fontSize: 14, fontWeight: '600' },
    transactionsList: { gap: 12 },
    expenseCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    skeuoExpenseCard: { padding: 16, borderRadius: 28 },
    expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    expenseDesc: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 16 },
    expenseAmount: { fontSize: 16, fontWeight: '700' },
    expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expenseDate: { fontSize: 13, fontWeight: '500' },
    splitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    splitText: { fontSize: 11, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
    skeuoIconWrapper: {
        borderRadius: 22,
    },
    skeuoIconInner: {
        borderRadius: 22,
    },
    skeuoCardOuter: {
        borderRadius: 28,
    },
    skeuoCardInner: {
        borderRadius: 28,
    }
});
