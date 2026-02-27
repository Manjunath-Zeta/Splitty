import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react-native';
import { useSplittyStore } from '../../store/useSplittyStore';
import { CircularProgress } from '../../components/CircularProgress';
import { GlassCard } from '../../components/GlassCard';
import { VibrantButton } from '../../components/VibrantButton';
import { CategoryIcon } from '../../components/CategoryIcon';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay } from 'react-native-reanimated';

// Extracted Category Row Component to manage its own animation lifecycle
const CategoryRow = ({ item, index }: { item: any; index: number }) => {
    const router = useRouter();
    const { colors, formatCurrency, getCategoryById } = useSplittyStore();
    const catData = getCategoryById(item.categoryId);
    const isOver = item.spent >= item.budget && item.budget > 0;
    const isWarning = item.spent >= item.budget * 0.85 && item.budget > 0 && !isOver;

    const animatedWidth = useSharedValue(0);

    React.useEffect(() => {
        // Stagger animation based on index
        animatedWidth.value = withDelay(
            index * 100,
            withTiming(item.percentage, { duration: 800, easing: Easing.out(Easing.cubic) })
        );
    }, [item.percentage, index]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${animatedWidth.value}%`
        };
    });

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/budget-category/${item.monthKey}/${item.categoryId}`)}
            style={styles.categoryItem}
        >
            <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: catData.color + '20' }]}>
                        <CategoryIcon name={catData.icon} size={24} color={catData.color} />
                    </View>
                    <View>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{catData.label}</Text>
                        <Text style={[styles.categoryAmounts, { color: colors.textSecondary }]}>
                            {formatCurrency(item.spent)} {item.budget > 0 ? `of ${formatCurrency(item.budget)}` : ''}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.categoryPercent, { color: isOver ? colors.error : isWarning ? '#F59E0B' : colors.text }]}>
                    {item.percentage}%
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <Animated.View
                    style={[
                        styles.progressBarFill,
                        { backgroundColor: isOver ? colors.error : isWarning ? '#F59E0B' : catData.color },
                        animatedStyle
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
};

export default function BudgetsScreen() {
    const router = useRouter();
    const { colors, budgets, expenses, setCategoryBudget, formatCurrency, categories, getCategoryById, categoryOrder } = useSplittyStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Handle Month Navigation
    const handlePrevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Calculate Spent
    const categorySpend = useMemo(() => {
        const spend: Record<string, number> = {};
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const monthExpenses = expenses.filter(e => {
            if (e.isSettlement) return false;
            const eDate = new Date(e.date);
            return eDate >= startOfMonth && eDate <= endOfMonth;
        });

        monthExpenses.forEach(e => {
            let myShare = 0;
            if (e.splitType === 'unequal' && e.splitDetails) {
                myShare = e.splitDetails['self'] || 0;
            } else {
                const totalPeople = (e.splitWith?.length || 0) + 1;
                myShare = e.amount / totalPeople;
            }

            if (myShare > 0) {
                if (!spend[e.category]) spend[e.category] = 0;
                spend[e.category] += myShare;
            }
        });

        return spend;
    }, [expenses, currentDate]);

    // Get Budget for current month
    const currentBudget = useMemo(() => budgets.find(b => b.month === monthKey), [budgets, monthKey]);

    const totalBudget = useMemo(() => {
        if (!currentBudget) return 0;
        return Object.values(currentBudget.categories).reduce((sum, val) => sum + val, 0);
    }, [currentBudget]);

    const totalSpent = useMemo(() => {
        return Object.values(categorySpend).reduce((sum, val) => sum + val, 0);
    }, [categorySpend]);

    const remaining = Math.max(0, totalBudget - totalSpent);
    const numDaysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const dailyAvg = totalSpent / Math.max(1, currentDate.getMonth() === new Date().getMonth() ? new Date().getDate() : numDaysInMonth);

    // Merge categories with spending or budget
    const activeCategories = useMemo(() => {
        const catSet = new Set<string>();
        Object.keys(categorySpend).forEach(c => catSet.add(c));
        if (currentBudget) {
            Object.keys(currentBudget.categories).forEach(c => catSet.add(c));
        }

        return Array.from(catSet).map(categoryId => {
            const spent = categorySpend[categoryId] || 0;
            const budgetAmt = currentBudget?.categories[categoryId] || 0;
            const percentage = budgetAmt > 0 ? Math.min((spent / budgetAmt) * 100, 100) : (spent > 0 ? 100 : 0);
            return {
                categoryId,
                spent,
                budget: budgetAmt,
                percentage: Math.round(percentage),
                monthKey // Pass monthKey down for drill-down routing
            };
        }).sort((a, b) => {
            // 1. If we have a custom order, respect it first
            if (categoryOrder && categoryOrder.length > 0) {
                const indexA = categoryOrder.indexOf(a.categoryId);
                const indexB = categoryOrder.indexOf(b.categoryId);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
            }

            // 2. Fall back to highest spend first for unordered/new categories
            return b.spent - a.spent;
        });
    }, [categorySpend, currentBudget, categoryOrder]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                    <ChevronLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{monthName} Budget</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                    <ChevronRight color={colors.text} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                {totalBudget > 0 ? (
                    <>
                        <View style={styles.chartContainer}>
                            <CircularProgress spent={totalSpent} budget={totalBudget} color={colors.primary} size={220} />
                        </View>

                        <View style={styles.summaryRow}>
                            <GlassCard style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>REMAINING</Text>
                                <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(remaining)}</Text>
                            </GlassCard>
                            <GlassCard style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>DAILY AVG</Text>
                                <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(dailyAvg)}</Text>
                            </GlassCard>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
                            <TouchableOpacity onPress={() => router.push({ pathname: '/set-budget', params: { month: monthKey } })}>
                                <Text style={[styles.seeAll, { color: colors.primary }]}>Edit Budget</Text>
                            </TouchableOpacity>
                        </View>

                        {activeCategories.map((item, index) => (
                            <CategoryRow key={item.categoryId} item={item} index={index} />
                        ))}
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <CircularProgress spent={totalSpent} budget={0} color={colors.textSecondary} size={220} />
                        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Budget Set</Text>
                        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                            Set a budget for {monthName} to track your spending effectively.
                        </Text>
                        <VibrantButton
                            title="Set Budget"
                            onPress={() => router.push({ pathname: '/set-budget', params: { month: monthKey } })}
                            style={{ width: '100%', marginTop: 20 }}
                        />
                    </View>
                )}

                {/* Spacer for bottom tabs */}
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
    headerTitle: { fontSize: 18, fontWeight: '700' },
    navButton: { padding: 8 },
    chartContainer: { alignItems: 'center', marginVertical: 30 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    summaryCard: { width: '48%', padding: 20, alignItems: 'center' },
    summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    summaryValue: { fontSize: 24, fontWeight: '800' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: '700' },
    seeAll: { fontSize: 16, fontWeight: '600' },
    categoryItem: { marginBottom: 24 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    categoryName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    categoryAmounts: { fontSize: 13, fontWeight: '500' },
    categoryPercent: { fontSize: 16, fontWeight: '700' },
    progressBarBg: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 },
    emptyStateTitle: { fontSize: 24, fontWeight: '700', marginTop: 30, marginBottom: 10 },
    emptyStateText: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 20 }
});
