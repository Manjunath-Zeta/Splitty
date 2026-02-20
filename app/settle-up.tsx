import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import { ChevronLeft, Check, User } from 'lucide-react-native';
import { VibrantButton } from '../components/VibrantButton';

export default function SettleUpScreen() {
    const router = useRouter();
    const { friends, colors, formatCurrency, settleUp } = useSplittyStore();
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [isPaying, setIsPaying] = useState<boolean>(true); // true = User pays Friend; false = Friend pays User

    // Filter friends with non-zero balances
    const friendsWithBalances = friends.filter(auth => Math.abs(auth.balance) > 0.01);

    const handleSelectFriend = (friendId: string, balance: number) => {
        setSelectedFriendId(friendId);
        setAmount(Math.abs(balance).toFixed(2));
        // If balance > 0, friend owes user (friend pays user)
        // If balance < 0, user owes friend (user pays friend)
        setIsPaying(balance < 0);
    };

    const handleSettleSubmit = () => {
        if (!selectedFriendId || !amount) {
            Alert.alert("Error", "Please select a friend and enter an amount.");
            return;
        }

        const numericAmount = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Error", "Please enter a valid amount greater than 0.");
            return;
        }

        const payerId = isPaying ? 'self' : selectedFriendId;
        const receiverId = isPaying ? selectedFriendId : 'self';

        try {
            settleUp(payerId, receiverId, numericAmount);
            Alert.alert("Success", "Settlement recorded successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to record settlement.");
        }
    };

    if (selectedFriendId) {
        const friend = friends.find(f => f.id === selectedFriendId);
        if (!friend) return null;

        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedFriendId(null)}>
                            <ChevronLeft size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Record Settlement</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <GlassCard style={[styles.card, { backgroundColor: colors.surface }]}>
                            <View style={styles.fixedDirectionContainer}>
                                <Text style={[styles.fixedDirectionText, { color: isPaying ? colors.primary : colors.success }]}>
                                    {isPaying ? `You pay ${friend.name}` : `${friend.name} pays You`}
                                </Text>
                            </View>

                            <View style={styles.amountContainer}>
                                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to settle</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                    autoFocus
                                />
                                <Text style={[styles.currentBalanceInfo, { color: colors.textSecondary }]}>
                                    Remaining balance: {formatCurrency(Math.abs(friend.balance))}
                                </Text>
                            </View>
                        </GlassCard>
                    </ScrollView>

                    <View style={styles.footer}>
                        <VibrantButton
                            title={`Confirm Settlement`}
                            onPress={handleSettleSubmit}
                        />
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settle Up</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {friendsWithBalances.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Check size={48} color={colors.success} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>All Settled Up!</Text>
                        <Text style={[styles.emptyStateDesc, { color: colors.textSecondary }]}>
                            You don't have any pending balances with your friends.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select a friend to settle with</Text>
                        <GlassCard style={[styles.listCard, { backgroundColor: colors.surface }]}>
                            {friendsWithBalances.map((friend, index) => (
                                <TouchableOpacity
                                    key={friend.id}
                                    style={[
                                        styles.friendItem,
                                        index < friendsWithBalances.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                                    ]}
                                    onPress={() => handleSelectFriend(friend.id, friend.balance)}
                                >
                                    <View style={styles.friendInfoRow}>
                                        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                                            <User size={20} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                                    </View>
                                    <View style={styles.balanceInfo}>
                                        <Text style={[
                                            styles.balanceText,
                                            { color: friend.balance > 0 ? colors.success : colors.error }
                                        ]}>
                                            {friend.balance > 0 ? 'Owes you ' : 'You owe '}
                                            {formatCurrency(friend.balance)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </GlassCard>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    backButton: { padding: 8 },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyStateDesc: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 4,
    },
    listCard: {
        padding: 0,
        overflow: 'hidden',
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    friendInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
    },
    balanceInfo: {
        alignItems: 'flex-end',
    },
    balanceText: {
        fontSize: 14,
        fontWeight: '700',
    },
    card: {
        padding: 24,
    },
    fixedDirectionContainer: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 12,
        backgroundColor: 'rgba(150,150,150,0.1)',
        borderRadius: 12,
    },
    fixedDirectionText: {
        fontWeight: '700',
        fontSize: 16,
    },
    amountContainer: {
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    amountInput: {
        fontSize: 48,
        fontWeight: '800',
        textAlign: 'center',
        width: '100%',
        marginBottom: 16,
    },
    currentBalanceInfo: {
        fontSize: 14,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
});
