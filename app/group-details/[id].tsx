import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSplittyStore } from '../../store/useSplittyStore';
import { GlassCard } from '../../components/GlassCard';
import { ArrowLeft, Users, Receipt, Banknote, Trash2, CheckCircle, ArrowRightLeft, Plus } from 'lucide-react-native';
import { InitialsAvatar } from '../../components/InitialsAvatar';
import { CategoryIcon } from '../../components/CategoryIcon';
import * as Haptics from 'expo-haptics';
import { Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { VibrantButton } from '../../components/VibrantButton';

export default function GroupDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const {
        groups, expenses, friends, colors, formatCurrency,
        deleteExpense, settleUp, userProfile, unknownFriendNames, getCategoryById,
        appearance, designPreference
    } = useSplittyStore();

    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const group = groups.find(g => g.id === id);
    const groupExpenses = expenses.filter(e => e.groupId === id);
    const sortedExpenses = [...groupExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getMemberName = (memberId: string) => {
        if (memberId === 'self') return 'You';
        return friends.find(f => f.id === memberId)?.name || unknownFriendNames[memberId] || 'Unknown';
    };

    // Who paid how much (excluding settlements)
    const contributions = useMemo(() => {
        const map: Record<string, number> = {};
        groupExpenses.forEach(e => {
            if (e.isSettlement) return;
            map[e.payerId] = (map[e.payerId] || 0) + e.amount;
        });
        return map;
    }, [groupExpenses]);

    const totalGroupSpending = Object.values(contributions).reduce((a, b) => a + b, 0);

    // Net balance per member relative to "self"
    // Positive = member owes self, Negative = self owes member
    const memberBalances = useMemo(() => {
        const allMembers = ['self', ...(group?.members.filter(m => m !== 'self') ?? [])];
        const net: Record<string, number> = {};
        allMembers.forEach(m => { net[m] = 0; });

        groupExpenses.forEach(e => {
            if (e.isSettlement) {
                if (e.payerId === 'self') {
                    e.splitWith.forEach(recipient => {
                        net[recipient] = (net[recipient] || 0) - (e.splitDetails?.[recipient] ?? e.amount);
                    });
                } else {
                    net[e.payerId] = (net[e.payerId] || 0) + (e.splitDetails?.['self'] ?? e.amount);
                }
                return;
            }

            // Build participant list — always include self if it's a group expense
            const rawParticipants = new Set([
                ...e.splitWith,
                e.payerId,
                'self'
            ]);
            const participants = Array.from(rawParticipants);
            const splitCount = participants.length;

            participants.forEach(participant => {
                if (participant === e.payerId) return;

                let share = 0;
                if (e.splitType === 'unequal' && e.splitDetails) {
                    share = e.splitDetails[participant] ?? 0;
                } else {
                    share = e.amount / splitCount;
                }

                if (e.payerId === 'self') {
                    net[participant] = (net[participant] || 0) + share;
                } else if (participant === 'self') {
                    net[e.payerId] = (net[e.payerId] || 0) - share;
                }
            });
        });

        delete net['self'];
        return net;
    }, [groupExpenses, group]);

    const handleSettle = (memberId: string, balance: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const name = getMemberName(memberId);
        const amount = Math.abs(balance);
        const payerId = balance > 0 ? 'self' : memberId;
        const receiverId = balance > 0 ? memberId : 'self';
        const msg = balance > 0
            ? `Mark that you paid ${name} ${formatCurrency(amount)}?`
            : `Mark that ${name} paid you ${formatCurrency(amount)}?`;

        Alert.alert('Settle Up', msg, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Settle',
                onPress: () => {
                    settleUp(payerId, receiverId, amount);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        ]);
    };

    const handleDeleteExpense = (expenseId: string) => {
        Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(expenseId) }
        ]);
    };

    if (!group) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
                        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                            <Text style={{ color: colors.primary }}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    const nonSelfMembers = group.members.filter(m => m !== 'self');

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                                <TouchableOpacity onPress={() => router.back()} style={[styles.backButtonSkeuo, { backgroundColor: skeuo.background }]}>
                                    <ArrowLeft size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Group Details</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Group Summary Card */}
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoSectionCard}>
                                <View style={[styles.groupIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Users size={32} color={colors.primary} />
                                </View>
                                <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                                <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                                    {`${nonSelfMembers.length + 1} members (inc. you)`}
                                </Text>
                                <View style={[styles.balanceContainer, { borderTopColor: colors.border }]}>
                                    <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Group Total</Text>
                                    <Text style={[styles.balanceAmount, { color: colors.text }]}>
                                        {formatCurrency(totalGroupSpending)}
                                    </Text>
                                    <Text style={[styles.balanceSub, { color: colors.textSecondary }]}>total spent</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </View>
                ) : (
                    <GlassCard style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                        <View style={[styles.groupIcon, { backgroundColor: colors.inputBackground }]}>
                            <Users size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                        <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                            {nonSelfMembers.length + 1} members (inc. you)
                        </Text>
                        <View style={[styles.balanceContainer, { borderTopColor: colors.border }]}>
                            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Group Total</Text>
                            <Text style={[styles.balanceAmount, { color: colors.text }]}>
                                {formatCurrency(totalGroupSpending)}
                            </Text>
                            <Text style={[styles.balanceSub, { color: colors.textSecondary }]}>total spent</Text>
                        </View>
                    </GlassCard>
                )}

                {/* ── Balances Card ── */}
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoSectionCard}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Balances</Text>
                                {nonSelfMembers.length === 0 ? (
                                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                        Add more members to see balances.
                                    </Text>
                                ) : (
                                    nonSelfMembers.map((mId, idx) => {
                                        const balance = memberBalances[mId] ?? 0;
                                        const isSettled = Math.abs(balance) < 0.01;
                                        const theyOweMe = balance > 0;
                                        const memberFriend = friends.find(f => f.id === mId);
                                        const isLast = idx === nonSelfMembers.length - 1;

                                        return (
                                            <View
                                                key={mId}
                                                style={[
                                                    styles.balanceRow,
                                                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border + '30' }
                                                ]}
                                            >
                                                <InitialsAvatar
                                                    name={getMemberName(mId)}
                                                    avatarUrl={memberFriend?.avatarUrl}
                                                    size={42}
                                                    isLocal={!memberFriend?.linkedUserId}
                                                />
                                                <View style={styles.balanceInfo}>
                                                    <Text style={[styles.balanceMemberName, { color: colors.text }]}>
                                                        {getMemberName(mId)}
                                                    </Text>
                                                    {isSettled ? (
                                                        <Text style={[styles.balanceStatus, { color: colors.success }]}>
                                                            All settled up ✓
                                                        </Text>
                                                    ) : (
                                                        <Text style={[styles.balanceStatus, {
                                                            color: theyOweMe ? colors.success : colors.accent
                                                        }]}>
                                                            {theyOweMe
                                                                ? `Owes you ${formatCurrency(balance)}`
                                                                : `You owe ${formatCurrency(Math.abs(balance))}`}
                                                        </Text>
                                                    )}
                                                </View>
                                                {isSettled ? (
                                                    <CheckCircle size={22} color={colors.success} />
                                                ) : (
                                                    <VibrantButton
                                                        style={styles.settleButtonSmall}
                                                        onPress={() => handleSettle(mId, balance)}
                                                        variant="outline"
                                                        leftIcon={<ArrowRightLeft size={14} color={colors.primary} />}
                                                        title="Settle"
                                                    />
                                                )}
                                            </View>
                                        );
                                    })
                                )}
                            </LinearGradient>
                        </View>
                    </View>
                ) : (
                    <GlassCard style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Balances</Text>
                        {nonSelfMembers.length === 0 ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                Add more members to see balances.
                            </Text>
                        ) : (
                            nonSelfMembers.map((mId, idx) => {
                                const balance = memberBalances[mId] ?? 0;
                                const isSettled = Math.abs(balance) < 0.01;
                                const theyOweMe = balance > 0;
                                const memberFriend = friends.find(f => f.id === mId);
                                const isLast = idx === nonSelfMembers.length - 1;

                                return (
                                    <View
                                        key={mId}
                                        style={[
                                            styles.balanceRow,
                                            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                                        ]}
                                    >
                                        <InitialsAvatar
                                            name={getMemberName(mId)}
                                            avatarUrl={memberFriend?.avatarUrl}
                                            size={42}
                                            isLocal={!memberFriend?.linkedUserId}
                                        />
                                        <View style={styles.balanceInfo}>
                                            <Text style={[styles.balanceMemberName, { color: colors.text }]}>
                                                {getMemberName(mId)}
                                            </Text>
                                            {isSettled ? (
                                                <Text style={[styles.balanceStatus, { color: colors.success }]}>
                                                    All settled up ✓
                                                </Text>
                                            ) : (
                                                <Text style={[styles.balanceStatus, {
                                                    color: theyOweMe ? colors.success : colors.accent
                                                }]}>
                                                    {theyOweMe
                                                        ? `Owes you ${formatCurrency(balance)}`
                                                        : `You owe ${formatCurrency(Math.abs(balance))}`}
                                                </Text>
                                            )}
                                        </View>
                                        {isSettled ? (
                                            <CheckCircle size={22} color={colors.success} />
                                        ) : (
                                            <VibrantButton
                                                style={styles.settleButtonSmall}
                                                onPress={() => handleSettle(mId, balance)}
                                                variant="outline"
                                                leftIcon={<ArrowRightLeft size={14} color={colors.primary} />}
                                                title="Settle"
                                            />
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </GlassCard>
                )}

                {/* ── Spending Summary ── */}
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoSectionCard}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Summary</Text>
                                <View style={styles.contributionRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <InitialsAvatar name={userProfile.name || 'You'} avatarUrl={userProfile.avatar} size={32} />
                                        <View style={{ width: 10 }} />
                                        <Text style={[styles.contributionName, { color: colors.text }]}>You</Text>
                                    </View>
                                    <Text style={[styles.contributionAmount, { color: colors.text }]}>
                                        {formatCurrency(contributions['self'] || 0)}
                                    </Text>
                                </View>
                                {nonSelfMembers.map(mId => (
                                    <View key={mId} style={styles.contributionRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <InitialsAvatar
                                                name={getMemberName(mId)}
                                                avatarUrl={friends.find(f => f.id === mId)?.avatarUrl}
                                                size={32}
                                                isLocal={!friends.find(f => f.id === mId)?.linkedUserId}
                                            />
                                            <View style={{ width: 10 }} />
                                            <Text style={[styles.contributionName, { color: colors.text }]}>{getMemberName(mId)}</Text>
                                        </View>
                                        <Text style={[styles.contributionAmount, { color: colors.text }]}>
                                            {formatCurrency(contributions[mId] || 0)}
                                        </Text>
                                    </View>
                                ))}
                                <View style={[styles.totalRow, { borderTopColor: colors.border + '30' }]}>
                                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                                    <Text style={[styles.totalAmount, { color: colors.text }]}>{formatCurrency(totalGroupSpending)}</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </View>
                ) : (
                    <GlassCard style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Summary</Text>
                        <View style={styles.contributionRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <InitialsAvatar name={userProfile.name || 'You'} avatarUrl={userProfile.avatar} size={32} />
                                <View style={{ width: 10 }} />
                                <Text style={[styles.contributionName, { color: colors.text }]}>You</Text>
                            </View>
                            <Text style={[styles.contributionAmount, { color: colors.text }]}>
                                {formatCurrency(contributions['self'] || 0)}
                            </Text>
                        </View>
                        {nonSelfMembers.map(mId => (
                            <View key={mId} style={styles.contributionRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <InitialsAvatar
                                        name={getMemberName(mId)}
                                        avatarUrl={friends.find(f => f.id === mId)?.avatarUrl}
                                        size={32}
                                        isLocal={!friends.find(f => f.id === mId)?.linkedUserId}
                                    />
                                    <View style={{ width: 10 }} />
                                    <Text style={[styles.contributionName, { color: colors.text }]}>{getMemberName(mId)}</Text>
                                </View>
                                <Text style={[styles.contributionAmount, { color: colors.text }]}>
                                    {formatCurrency(contributions[mId] || 0)}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                            <Text style={[styles.totalAmount, { color: colors.text }]}>{formatCurrency(totalGroupSpending)}</Text>
                        </View>
                    </GlassCard>
                )}

                {/* ── Members ── */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Members</Text>
                <View style={styles.membersRow}>
                    <View style={styles.memberItem}>
                        <View style={{ marginBottom: 8 }}>
                            <InitialsAvatar name={userProfile.name || 'You'} avatarUrl={userProfile.avatar} size={48} />
                        </View>
                        <Text style={[styles.memberName, { color: colors.text }]}>You</Text>
                    </View>
                    {nonSelfMembers.map(mId => (
                        <View key={mId} style={styles.memberItem}>
                            <View style={{ marginBottom: 8 }}>
                                <InitialsAvatar
                                    name={getMemberName(mId)}
                                    avatarUrl={friends.find(f => f.id === mId)?.avatarUrl}
                                    size={48}
                                    isLocal={!friends.find(f => f.id === mId)?.linkedUserId}
                                />
                            </View>
                            <Text style={[styles.memberName, { color: colors.text }]}>{getMemberName(mId)}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Expenses ── */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Expenses</Text>
                {sortedExpenses.length > 0 ? (
                    sortedExpenses.map(expense => (
                        <TouchableOpacity
                            key={expense.id}
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/add-expense', params: { id: expense.id } })}
                        >
                            {isSkeuomorphic ? (
                                <View style={[styles.skeuoCardOuter, skeuo.outset.light, { marginBottom: 12 }]}>
                                    <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                                        <LinearGradient colors={skeuo.surfaceGradient} style={styles.skeuoActivityItem}>
                                            <View style={[styles.categoryIcon, {
                                                backgroundColor: expense.isSettlement ? colors.success + '20' : getCategoryById(expense.category).color + '20'
                                            }]}>
                                                {expense.isSettlement ? (
                                                    <Banknote size={20} color={colors.success} />
                                                ) : (
                                                    <CategoryIcon name={getCategoryById(expense.category).icon} size={20} color={getCategoryById(expense.category).color} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.activityDesc, { color: colors.text }]}>{expense.description}</Text>
                                                <Text style={[styles.activitySub, { color: colors.textSecondary }]}>
                                                    {`${getMemberName(expense.payerId)} paid • ${new Date(expense.date).toLocaleDateString()}`}
                                                </Text>
                                            </View>
                                            <View style={styles.activityRight}>
                                                <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(expense.amount)}</Text>
                                                <VibrantButton
                                                    onPress={() => handleDeleteExpense(expense.id)}
                                                    variant="outline"
                                                    style={styles.listDeleteButton}
                                                    leftIcon={<Trash2 size={18} color={colors.error} />}
                                                />
                                            </View>
                                        </LinearGradient>
                                    </View>
                                </View>
                            ) : (
                                <GlassCard style={[
                                    styles.activityItem,
                                    { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: expense.isSettlement ? colors.success : getCategoryById(expense.category).color }
                                ]}>
                                    <View style={[styles.categoryIcon, {
                                        backgroundColor: expense.isSettlement ? colors.success + '20' : getCategoryById(expense.category).color + '20'
                                    }]}>
                                        {expense.isSettlement ? (
                                            <Banknote size={20} color={colors.success} />
                                        ) : (
                                            <CategoryIcon name={getCategoryById(expense.category).icon} size={20} color={getCategoryById(expense.category).color} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.activityDesc, { color: colors.text }]}>{expense.description}</Text>
                                        <Text style={[styles.activitySub, { color: colors.textSecondary }]}>
                                            {`${getMemberName(expense.payerId)} paid • ${new Date(expense.date).toLocaleDateString()}`}
                                        </Text>
                                    </View>
                                    <View style={styles.activityRight}>
                                        <Text style={[styles.activityAmount, { color: colors.text }]}>{formatCurrency(expense.amount)}</Text>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id); }}
                                            hitSlop={10}
                                        >
                                            <Trash2 size={18} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </GlassCard>
                            )}
                        </TouchableOpacity>
                    ))
                ) : (
                    <GlassCard style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                        <Receipt size={40} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses in this group yet.</Text>
                    </GlassCard>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <VibrantButton
                style={styles.fab}
                onPress={() => router.push({ pathname: '/add-expense', params: { groupId: id } })}
                leftIcon={<Plus size={32} color="#FFF" />}
                variant="primary"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16,
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
    container: { padding: 20, paddingTop: 0 },
    // Summary card
    summaryCard: { alignItems: 'center', padding: 24, marginBottom: 16, borderRadius: 24 },
    skeuoSectionCard: { padding: 24, borderRadius: 24 },
    groupIcon: {
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    groupName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    memberCount: { fontSize: 14, marginBottom: 20 },
    balanceContainer: { alignItems: 'center', width: '100%', paddingTop: 16, borderTopWidth: 1 },
    balanceLabel: { fontSize: 14, marginBottom: 4 },
    balanceAmount: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
    balanceSub: { fontSize: 12 },
    // Shared section card
    sectionCard: { padding: 20, marginBottom: 16, borderRadius: 24 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
    // Balances rows
    balanceRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, gap: 12,
    },
    balanceInfo: { flex: 1 },
    balanceMemberName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    balanceStatus: { fontSize: 13, fontWeight: '500' },
    settleButtonSmall: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 12,
    },
    listDeleteButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
    },
    activityRight: { alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
    contributionRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    contributionName: { fontSize: 14, fontWeight: '500' },
    contributionAmount: { fontSize: 14, fontWeight: '600' },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1,
    },
    totalLabel: { fontSize: 14, fontWeight: '600' },
    totalAmount: { fontSize: 16, fontWeight: '700' },
    // Members
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    memberItem: { alignItems: 'center', width: 60 },
    memberName: { fontSize: 12, textAlign: 'center' },
    // Expense rows
    activityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 24 },
    skeuoActivityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 28 },
    categoryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    activityDesc: { fontSize: 16, fontWeight: '600' },
    activitySub: { fontSize: 12, marginTop: 4 },
    activityAmount: { fontSize: 16, fontWeight: '700' },
    emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, borderRadius: 24 },
    emptyText: { fontSize: 14 },
    skeuoIconWrapper: { borderRadius: 22 },
    skeuoIconInner: { borderRadius: 22 },
    skeuoCardOuter: { borderRadius: 28, marginBottom: 16 },
    skeuoCardInner: { borderRadius: 28 },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 28,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});
