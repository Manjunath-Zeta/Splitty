import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Settings2, ChevronDown } from 'lucide-react-native';
import { useSplittyStore } from '../../store/useSplittyStore';
import { CircularProgress } from '../../components/CircularProgress';
import { GlassCard } from '../../components/GlassCard';
import { VibrantButton } from '../../components/VibrantButton';
import { CategoryIcon } from '../../components/CategoryIcon';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay, useAnimatedRef, measure, runOnUI } from 'react-native-reanimated';

// Extracted Category Row Component to manage its own animation lifecycle
const CategoryRow = ({ item, index, monthExpenses }: { item: any; index: number; monthExpenses: any[] }) => {
    const router = useRouter();
    const { colors, formatCurrency, getCategoryById } = useSplittyStore();
    const catData = getCategoryById(item.categoryId);
    // Include rollover in display log
    const totalBudgetWithRollover = item.budget + (item.rollover || 0);
    const isOver = item.spent >= totalBudgetWithRollover && totalBudgetWithRollover > 0;
    const isWarning = item.spent >= totalBudgetWithRollover * 0.85 && totalBudgetWithRollover > 0 && !isOver;

    const [isExpanded, setIsExpanded] = useState(false);
    const animatedWidth = useSharedValue(0);
    const contentHeight = useSharedValue(0);
    const rotation = useSharedValue(0);
    const listRef = useAnimatedRef<Animated.View>();

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

    const expandStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(contentHeight.value, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            opacity: withTiming(isExpanded ? 1 : 0, { duration: 300 }),
            overflow: 'hidden'
        };
    });

    const chevronStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${withTiming(rotation.value, { duration: 300 })}deg` }]
        };
    });

    const toggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isExpanded) {
            contentHeight.value = 0;
            rotation.value = 0;
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
            rotation.value = -180;
            // Measure the absolute height of the hidden content using a worklet
            runOnUI(() => {
                const measurement = measure(listRef);
                if (measurement) {
                    contentHeight.value = measurement.height;
                }
            })();
        }
    };

    // Calculate top 3 expenses for this category
    const recentExpenses = useMemo(() => {
        return monthExpenses
            .filter(e => e.category === item.categoryId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);
    }, [monthExpenses, item.categoryId]);

    return (
        <View style={styles.categoryItemWrapper}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleExpand}
                style={styles.categorySummary}
            >
                <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                        <View style={[styles.iconContainer, { backgroundColor: catData.color + '20' }]}>
                            <CategoryIcon name={catData.icon} size={24} color={catData.color} />
                        </View>
                        <View>
                            <Text style={[styles.categoryName, { color: colors.text }]}>{catData.label}</Text>
                            <Text style={[styles.categoryAmounts, { color: colors.textSecondary }]}>
                                {formatCurrency(item.spent)} {totalBudgetWithRollover > 0 ? `of ${formatCurrency(totalBudgetWithRollover)}` : ''}
                            </Text>
                            {(item.rollover || 0) !== 0 && (
                                <Text style={[styles.rolloverIndicator, { color: (item.rollover || 0) > 0 ? colors.success : colors.error }]}>
                                    {(item.rollover || 0) > 0 ? '+' : ''}{formatCurrency(item.rollover || 0)} rollover
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.percentContainer}>
                        <Text style={[styles.categoryPercent, { color: isOver ? colors.error : isWarning ? '#F59E0B' : colors.text }]}>
                            {item.percentage}%
                        </Text>
                        <Animated.View style={chevronStyle}>
                            <ChevronDown color={colors.textSecondary} size={20} />
                        </Animated.View>
                    </View>
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

            {/* Expandable Content Container */}
            <Animated.View style={expandStyle}>
                <Animated.View ref={listRef} style={styles.expandedContentInner}>
                    {recentExpenses.length > 0 ? (
                        <>
                            <Text style={[styles.recentActivityTitle, { color: colors.textSecondary }]}>Recent Activity</Text>
                            {recentExpenses.map((expense) => {
                                // Calculate exact share for display
                                let myShare = 0;
                                if (expense.splitType === 'unequal' && expense.splitDetails) {
                                    myShare = expense.splitDetails['self'] || 0;
                                } else {
                                    const totalPeople = (expense.splitWith?.length || 0) + 1;
                                    myShare = expense.amount / totalPeople;
                                }

                                return (
                                    <View key={expense.id} style={styles.miniExpenseRow}>
                                        <View>
                                            <Text style={[styles.miniDesc, { color: colors.text }]} numberOfLines={1}>
                                                {expense.description}
                                            </Text>
                                            <Text style={[styles.miniDate, { color: colors.textSecondary }]}>
                                                {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {expense.payerName} paid
                                            </Text>
                                        </View>
                                        <Text style={[styles.miniAmount, { color: colors.text }]}>
                                            {formatCurrency(myShare)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </>
                    ) : (
                        <Text style={[styles.miniDate, { color: colors.textSecondary, textAlign: 'center', marginVertical: 10 }]}>
                            No spending yet
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.seeAllBtn, { backgroundColor: colors.surface }]}
                        onPress={() => router.push(`/budget-category/${item.monthKey}/${item.categoryId}`)}
                    >
                        <Text style={[styles.seeAllBtnText, { color: colors.primary }]}>See All Details</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
    );
};

export default function BudgetsScreen() {
    const router = useRouter();
    const { colors, budgets, expenses, setCategoryBudget, formatCurrency, categories, getCategoryById, categoryOrder, hiddenBudgetCategories, isRolloverEnabled } = useSplittyStore();
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
    const categorySpendData = useMemo(() => {
        const spend: Record<string, number> = {};
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const monthExpenses = expenses.filter(e => {
            if (e.isSettlement) return false;
            if (hiddenBudgetCategories.includes(e.category)) return false;
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

        return { spend, monthExpenses }; // Return expenses too so we can pass them down
    }, [expenses, currentDate, hiddenBudgetCategories]);

    const categorySpend = categorySpendData.spend;
    const monthExpenses = categorySpendData.monthExpenses;

    // Get Budget for current month
    const currentBudget = useMemo(() => budgets.find(b => b.month === monthKey), [budgets, monthKey]);

    // Calculate Rollover Amounts
    const rolloverData = useMemo(() => {
        if (!isRolloverEnabled) return {};

        const rolloverAmounts: Record<string, number> = {};
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Find all budgets prior to current month
        budgets.forEach(b => {
            const budgetDate = new Date(`${b.month}-01T00:00:00Z`);

            // Only consider past months
            if (budgetDate < currentMonthStart) {
                // Get all expenses for that month, excluding settled & hidden
                const startOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
                const endOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0, 23, 59, 59);

                const pastMonthExpenses = expenses.filter(e => {
                    if (e.isSettlement) return false;
                    const eDate = new Date(e.date);
                    return eDate >= startOfThatMonth && eDate <= endOfThatMonth;
                });

                // Calculate spend per category for that past month
                const pastSpend: Record<string, number> = {};
                pastMonthExpenses.forEach(e => {
                    let myShare = 0;
                    if (e.splitType === 'unequal' && e.splitDetails) {
                        myShare = e.splitDetails['self'] || 0;
                    } else {
                        const totalPeople = (e.splitWith?.length || 0) + 1;
                        myShare = e.amount / totalPeople;
                    }
                    if (myShare > 0) {
                        if (!pastSpend[e.category]) pastSpend[e.category] = 0;
                        pastSpend[e.category] += myShare;
                    }
                });

                // Add (budget - spend) to rollover amount for each category
                Object.entries(b.categories).forEach(([categoryId, budgetAmount]) => {
                    if (hiddenBudgetCategories.includes(categoryId)) return;

                    const spent = pastSpend[categoryId] || 0;
                    const unspent = budgetAmount - spent;

                    if (!rolloverAmounts[categoryId]) rolloverAmounts[categoryId] = 0;
                    rolloverAmounts[categoryId] += unspent;
                });
            }
        });

        return rolloverAmounts;
    }, [budgets, expenses, currentDate, isRolloverEnabled, hiddenBudgetCategories]);

    const totalBudget = useMemo(() => {
        let baseBudget = 0;
        if (currentBudget) {
            baseBudget = Object.entries(currentBudget.categories).reduce((sum, [catId, val]) => {
                if (hiddenBudgetCategories.includes(catId)) return sum;
                return sum + val;
            }, 0);
        }

        let rolloverTotal = 0;
        if (isRolloverEnabled) {
            rolloverTotal = Object.entries(rolloverData).reduce((sum, [catId, val]) => {
                if (hiddenBudgetCategories.includes(catId)) return sum;
                return sum + val;
            }, 0);
        }

        return baseBudget + rolloverTotal;
    }, [currentBudget, hiddenBudgetCategories, isRolloverEnabled, rolloverData]);

    const totalSpent = useMemo(() => {
        return Object.values(categorySpend).reduce((sum, val) => sum + val, 0);
    }, [categorySpend]);

    const remaining = Math.max(0, totalBudget - totalSpent);
    const numDaysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const dailyAvg = totalSpent / Math.max(1, currentDate.getMonth() === new Date().getMonth() ? new Date().getDate() : numDaysInMonth);

    const activeCategories = useMemo(() => {
        const catSet = new Set<string>();
        Object.keys(categorySpend).forEach(c => {
            if (!hiddenBudgetCategories.includes(c)) catSet.add(c);
        });
        if (currentBudget) {
            Object.keys(currentBudget.categories).forEach(c => {
                if (!hiddenBudgetCategories.includes(c)) catSet.add(c);
            });
        }

        if (isRolloverEnabled) {
            Object.keys(rolloverData).forEach(c => {
                if (!hiddenBudgetCategories.includes(c)) catSet.add(c);
            });
        }

        return Array.from(catSet).map(categoryId => {
            const spent = categorySpend[categoryId] || 0;
            const budgetAmt = currentBudget?.categories[categoryId] || 0;
            const rolloverAmt = rolloverData[categoryId] || 0;
            const totalBudgetAmt = Math.max(0, budgetAmt + rolloverAmt); // Prevent total budget going strictly negative for display? Or allow it. Let's allow it to show negative rollover but clamp calculation. Let's not clamp overall so they see they carry debt.
            const percentage = totalBudgetAmt > 0 ? Math.min((spent / totalBudgetAmt) * 100, 100) : (spent > 0 ? 100 : 0);
            return {
                categoryId,
                spent,
                budget: budgetAmt,
                rollover: rolloverAmt,
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
    }, [categorySpend, currentBudget, categoryOrder, hiddenBudgetCategories, isRolloverEnabled, rolloverData]);

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
                            <CategoryRow key={item.categoryId} item={item} index={index} monthExpenses={monthExpenses} />
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
    categoryItemWrapper: { marginBottom: 24 },
    categorySummary: { paddingVertical: 4 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    categoryName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    categoryAmounts: { fontSize: 13, fontWeight: '500' },
    rolloverIndicator: { fontSize: 11, fontWeight: '600', marginTop: 2, fontStyle: 'italic' },
    percentContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    categoryPercent: { fontSize: 16, fontWeight: '700' },
    progressBarBg: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    expandedContentInner: { paddingTop: 16, position: 'absolute', top: 0, left: 0, right: 0 },
    recentActivityTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12, marginLeft: 56 },
    miniExpenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 56, marginBottom: 16, paddingRight: 8 },
    miniDesc: { fontSize: 14, fontWeight: '600', marginBottom: 4, maxWidth: Dimensions.get('window').width - 150 },
    miniDate: { fontSize: 12 },
    miniAmount: { fontSize: 14, fontWeight: '700' },
    seeAllBtn: { marginHorizontal: 56, paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: -4 },
    seeAllBtnText: { fontSize: 13, fontWeight: '700' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 },
    emptyStateTitle: { fontSize: 24, fontWeight: '700', marginTop: 30, marginBottom: 10 },
    emptyStateText: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 20 }
});
