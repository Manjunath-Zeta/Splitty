import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    TouchableOpacity, FlatList, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react-native';
import { useSplittyStore } from '../../store/useSplittyStore';
import { CategoryIcon } from '../../components/CategoryIcon';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue, useAnimatedProps, withTiming, Easing, withDelay
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Mini Ring Chart for category tiles ──────────────────────────────────────
const RingChart = ({
    percentage, color, ringBgColor, size = 68, strokeWidth = 6, index = 0
}: {
    percentage: number; color: string; ringBgColor: string; size?: number; strokeWidth?: number; index?: number;
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    const animatedOffset = useSharedValue(circumference);
    React.useEffect(() => {
        animatedOffset.value = withDelay(
            index * 80,
            withTiming(offset, { duration: 900, easing: Easing.out(Easing.cubic) })
        );
    }, [offset, index]);

    const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: animatedOffset.value }));

    return (
        <Svg width={size} height={size}>
            <Circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={ringBgColor} fill="none" strokeWidth={strokeWidth}
            />
            <AnimatedCircle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={color} fill="none" strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                animatedProps={animatedProps}
                rotation="-90" origin={`${size / 2}, ${size / 2}`}
            />
        </Svg>
    );
};

// ─── Category Tile ────────────────────────────────────────────────────────────
const CategoryTile = ({
    item, index, monthKey, colors, isDarkMode
}: {
    item: any; index: number; monthKey: string; colors: any; isDarkMode: boolean;
}) => {
    const router = useRouter();
    const { getCategoryById } = useSplittyStore();
    const catData = getCategoryById(item.categoryId);
    const isOver = item.percentage >= 100;
    const isWarning = item.percentage >= 85 && !isOver;
    const ringColor = isOver ? colors.error : isWarning ? '#F59E0B' : catData.color;
    const ringBgColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    return (
        <TouchableOpacity
            style={[styles.categoryTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.75}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/budget-category/${monthKey}/${item.categoryId}`);
            }}
        >
            {/* Ring + Icon stacked */}
            <View style={styles.ringWrapper}>
                <RingChart percentage={item.percentage} color={ringColor} ringBgColor={ringBgColor} index={index} />
                <View style={styles.ringIconOverlay}>
                    <CategoryIcon name={catData.icon} size={22} color={ringColor} />
                </View>
            </View>
            <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>{catData.label}</Text>
            <Text style={[styles.tilePercent, { color: ringColor }]}>{item.percentage}% spent</Text>
        </TouchableOpacity>
    );
};

// ─── Transaction Row ──────────────────────────────────────────────────────────
const TransactionRow = ({ expense, colors, isDarkMode }: { expense: any; colors: any; isDarkMode: boolean }) => {
    const { getCategoryById, formatCurrency } = useSplittyStore();
    const catData = getCategoryById(expense.category);

    let myShare = 0;
    if (expense.splitType === 'unequal' && expense.splitDetails) {
        myShare = expense.splitDetails['self'] || 0;
    } else {
        const totalPeople = (expense.splitWith?.length || 0) + 1;
        myShare = expense.amount / totalPeople;
    }

    const dateLabel = (() => {
        const d = new Date(expense.date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    })();

    return (
        <View style={styles.txRow}>
            <View style={[styles.txIconPill, { backgroundColor: isDarkMode ? catData.color + '25' : catData.color + '15' }]}>
                <CategoryIcon name={catData.icon} size={20} color={catData.color} />
            </View>
            <View style={styles.txMeta}>
                <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>{expense.description}</Text>
                <Text style={[styles.txSub, { color: colors.textSecondary }]}>{catData.label} · {dateLabel}</Text>
            </View>
            <Text style={[styles.txAmount, { color: colors.error }]}>-{formatCurrency(myShare)}</Text>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BudgetsScreen() {
    const router = useRouter();
    const {
        colors, isDarkMode, budgets, expenses, categories, formatCurrency, getCategoryById,
        categoryOrder, hiddenBudgetCategories, isRolloverEnabled
    } = useSplittyStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // ── Spending calculation ────────────────────────────────────────────────
    const { categorySpend, monthExpenses } = useMemo(() => {
        const spend: Record<string, number> = {};
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const filtered = expenses.filter(e => {
            if (e.isSettlement) return false;
            if (hiddenBudgetCategories.includes(e.category)) return false;
            const eDate = new Date(e.date);
            return eDate >= startOfMonth && eDate <= endOfMonth;
        });

        filtered.forEach(e => {
            let myShare = 0;
            if (e.splitType === 'unequal' && e.splitDetails) {
                myShare = e.splitDetails['self'] || 0;
            } else {
                const totalPeople = (e.splitWith?.length || 0) + 1;
                myShare = e.amount / totalPeople;
            }
            if (myShare > 0) {
                spend[e.category] = (spend[e.category] || 0) + myShare;
            }
        });

        return { categorySpend: spend, monthExpenses: filtered };
    }, [expenses, currentDate, hiddenBudgetCategories]);

    const currentBudget = useMemo(
        () => budgets.find(b => b.month === monthKey),
        [budgets, monthKey]
    );

    // ── Rollover ────────────────────────────────────────────────────────────
    const rolloverData = useMemo(() => {
        if (!isRolloverEnabled) return {};
        const rolloverAmounts: Record<string, number> = {};
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        budgets.forEach(b => {
            const budgetDate = new Date(`${b.month}-01T00:00:00Z`);
            if (budgetDate < currentMonthStart) {
                const startOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
                const endOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0, 23, 59, 59);
                const pastSpend: Record<string, number> = {};

                expenses
                    .filter(e => {
                        if (e.isSettlement) return false;
                        const eDate = new Date(e.date);
                        return eDate >= startOfThatMonth && eDate <= endOfThatMonth;
                    })
                    .forEach(e => {
                        let myShare = e.splitType === 'unequal' && e.splitDetails
                            ? e.splitDetails['self'] || 0
                            : e.amount / ((e.splitWith?.length || 0) + 1);
                        if (myShare > 0) pastSpend[e.category] = (pastSpend[e.category] || 0) + myShare;
                    });

                Object.entries(b.categories).forEach(([catId, budgetAmt]) => {
                    if (hiddenBudgetCategories.includes(catId)) return;
                    rolloverAmounts[catId] = (rolloverAmounts[catId] || 0) + (budgetAmt - (pastSpend[catId] || 0));
                });
            }
        });
        return rolloverAmounts;
    }, [budgets, expenses, currentDate, isRolloverEnabled, hiddenBudgetCategories]);

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalBudget = useMemo(() => {
        let base = 0;
        categories.forEach(cat => {
            if (hiddenBudgetCategories.includes(cat.id)) return;
            const explicitAmt = currentBudget?.categories[cat.id];
            const defaultAmt = cat.defaultBudget || 0;
            base += explicitAmt !== undefined ? explicitAmt : defaultAmt;
        });

        const rolloverTotal = isRolloverEnabled
            ? Object.entries(rolloverData).reduce((sum, [catId, val]) =>
                hiddenBudgetCategories.includes(catId) ? sum : sum + val, 0)
            : 0;
        return base + rolloverTotal;
    }, [currentBudget, categories, hiddenBudgetCategories, isRolloverEnabled, rolloverData]);

    const totalSpent = useMemo(
        () => Object.values(categorySpend).reduce((s, v) => s + v, 0),
        [categorySpend]
    );
    const remaining = Math.max(0, totalBudget - totalSpent);

    // ── Active categories list ──────────────────────────────────────────────
    const activeCategories = useMemo(() => {
        const catSet = new Set<string>();
        Object.keys(categorySpend).forEach(c => { if (!hiddenBudgetCategories.includes(c)) catSet.add(c); });
        if (currentBudget) {
            Object.keys(currentBudget.categories).forEach(c => { if (!hiddenBudgetCategories.includes(c)) catSet.add(c); });
        }
        if (isRolloverEnabled) {
            Object.keys(rolloverData).forEach(c => { if (!hiddenBudgetCategories.includes(c)) catSet.add(c); });
        }
        categories.forEach(c => {
            if (c.defaultBudget && c.defaultBudget > 0 && !hiddenBudgetCategories.includes(c.id)) catSet.add(c.id);
        });

        return Array.from(catSet).map(categoryId => {
            const spent = categorySpend[categoryId] || 0;
            const explicitAmt = currentBudget?.categories[categoryId];
            const catDef = categories.find(c => c.id === categoryId)?.defaultBudget || 0;
            const budgetAmt = explicitAmt !== undefined ? explicitAmt : catDef;
            const rolloverAmt = rolloverData[categoryId] || 0;
            const totalBudgetAmt = Math.max(0, budgetAmt + rolloverAmt);
            const percentage = totalBudgetAmt > 0
                ? Math.min(Math.round((spent / totalBudgetAmt) * 100), 100)
                : spent > 0 ? 100 : 0;
            return { categoryId, spent, budget: budgetAmt, rollover: rolloverAmt, percentage, monthKey };
        }).sort((a, b) => {
            if (categoryOrder?.length > 0) {
                const ia = categoryOrder.indexOf(a.categoryId);
                const ib = categoryOrder.indexOf(b.categoryId);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
            }
            return b.spent - a.spent;
        });
    }, [categorySpend, currentBudget, categories, categoryOrder, hiddenBudgetCategories, isRolloverEnabled, rolloverData]);

    // ── Recent transactions (last 5) ────────────────────────────────────────
    const recentTransactions = useMemo(
        () => [...monthExpenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5),
        [monthExpenses]
    );

    const hasBudget = totalBudget > 0;
    const spentPct = hasBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* ── Month Navigator ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                    <ChevronLeft color={colors.text} size={22} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{monthName}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                    <ChevronRight color={colors.text} size={22} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Card ── */}
                <View style={[styles.heroCard, { backgroundColor: isDarkMode ? '#1E40AF' : colors.primary }]}>
                    <View style={styles.heroTop}>
                        <Text style={styles.heroLabel}>Total Budget</Text>
                        <View style={styles.heroIconCircle}>
                            <BarChart2 color="#FFFFFF" size={18} />
                        </View>
                    </View>
                    <Text style={styles.heroAmount}>{formatCurrency(totalBudget)}</Text>

                    {/* Thin progress bar */}
                    <View style={styles.heroProg}>
                        <View style={[styles.heroProgFill, { width: `${spentPct}%` }]} />
                    </View>

                    <View style={styles.heroSubRow}>
                        <View style={styles.heroSubCard}>
                            <Text style={styles.heroSubLabel}>MONTHLY SPENDING</Text>
                            <View style={styles.heroSubPill}>
                                <Text style={styles.heroSubValue}>{formatCurrency(totalSpent)}</Text>
                            </View>
                        </View>
                        <View style={[styles.heroSubCard, { alignItems: 'flex-end' }]}>
                            <Text style={styles.heroSubLabel}>SAVINGS</Text>
                            <View style={[styles.heroSubPill, styles.heroSubPillRight]}>
                                <Text style={styles.heroSubValue}>
                                    {formatCurrency(remaining)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Budget Categories ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Categories</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/set-budget', params: { month: monthKey } })}>
                            <Text style={[styles.sectionLink, { color: colors.primary }]}>Edit Budget</Text>
                        </TouchableOpacity>
                    </View>

                    {activeCategories.length > 0 ? (
                        <FlatList
                            data={activeCategories}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.categoryId}
                            contentContainerStyle={styles.tilesRow}
                            renderItem={({ item, index }) => (
                                <CategoryTile item={item} index={index} monthKey={monthKey} colors={colors} isDarkMode={isDarkMode} />
                            )}
                        />
                    ) : (
                        <TouchableOpacity
                            style={[styles.emptyCategories, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: '/set-budget', params: { month: monthKey } })}
                        >
                            <Text style={[styles.emptyCatText, { color: colors.primary }]}>Tap to set a budget →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Recent Transactions ── */}
                {recentTransactions.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
                            <TouchableOpacity onPress={() => router.push('/activity')}>
                                <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {recentTransactions.map((expense, idx) => (
                                <React.Fragment key={expense.id}>
                                    <TransactionRow expense={expense} colors={colors} isDarkMode={isDarkMode} />
                                    {idx < recentTransactions.length - 1 && (
                                        <View style={[styles.txDivider, { backgroundColor: colors.border }]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 48 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
    navBtn: { padding: 8 },

    scroll: { paddingHorizontal: 18, paddingTop: 6 },

    // Hero card
    heroCard: {
        borderRadius: 24, padding: 24, paddingBottom: 32, marginBottom: 28,
        shadowColor: 'rgba(0,0,0,0.3)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500', letterSpacing: 0.3 },
    heroIconCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    heroAmount: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 12 },
    heroProg: {
        height: 0, // Hidden for exactly matching the reference
    },
    heroProgFill: { height: 0 },
    heroSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    heroSubCard: { flex: 1 },
    heroSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
    heroSubPill: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignSelf: 'flex-start',
        minWidth: 120
    },
    heroSubPillRight: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    heroSubValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

    // Section
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '700' },
    sectionLink: { fontSize: 14, fontWeight: '600' },

    // Category tiles
    tilesRow: { paddingRight: 8, gap: 12 },
    categoryTile: {
        width: 108,
        borderRadius: 18, padding: 14, alignItems: 'center',
        borderWidth: 1,
    },
    ringWrapper: { width: 68, height: 68, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    ringIconOverlay: {
        position: 'absolute', justifyContent: 'center', alignItems: 'center',
        width: '100%', height: '100%',
    },
    tileName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 3 },
    tilePercent: { fontSize: 11, fontWeight: '600' },

    emptyCategories: {
        borderRadius: 18, padding: 24,
        alignItems: 'center', borderWidth: 1,
    },
    emptyCatText: { fontWeight: '600', fontSize: 15 },

    // Transaction card
    txCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    txRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    txIconPill: {
        width: 42, height: 42, borderRadius: 13,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    txMeta: { flex: 1 },
    txDesc: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
    txSub: { fontSize: 12, fontWeight: '500' },
    txAmount: { fontSize: 15, fontWeight: '700' },
    txDivider: { height: 1, marginHorizontal: 16 },
});
