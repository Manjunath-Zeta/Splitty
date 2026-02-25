import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSplittyStore } from '../../../store/useSplittyStore';
import { GlassCard } from '../../../components/GlassCard';
import { CategoryIcon } from '../../../components/CategoryIcon';

export default function BudgetCategorySceen() {
    const router = useRouter();
    const { month, categoryId } = useLocalSearchParams<{ month: string, categoryId: string }>();
    const { colors, expenses, formatCurrency, friends, getCategoryById } = useSplittyStore();

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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <View style={[styles.iconWrapper, { backgroundColor: catData.color + '20' }]}>
                        <CategoryIcon name={catData.icon} color={catData.color} size={32} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{catData.label}</Text>
                </View>
                <View style={{ width: 28 }} />
            </View>

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

                            return (
                                <GlassCard
                                    key={expense.id}
                                    style={[styles.expenseCard, { backgroundColor: colors.surface }]}
                                >
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
        </SafeAreaView>
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
    expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    expenseDesc: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 16 },
    expenseAmount: { fontSize: 16, fontWeight: '700' },
    expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expenseDate: { fontSize: 13, fontWeight: '500' },
    splitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    splitText: { fontSize: 11, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});
