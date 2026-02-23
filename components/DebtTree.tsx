import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSplittyStore } from '../store/useSplittyStore';
import { useRouter } from 'expo-router';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NODE_WIDTH = 80;
const NODE_SPACING = 110;
const VERTICAL_SPACING = 60;

export const DebtTree = ({ filterGroupId }: { filterGroupId?: string | null }) => {
    const router = useRouter();
    const { friends: allFriends, userProfile, formatCurrency, colors, groups } = useSplittyStore();

    let friends = allFriends;
    if (filterGroupId) {
        const group = groups.find(g => g.id === filterGroupId);
        if (group) {
            friends = friends.filter(f => group.members.includes(f.id) || group.members.includes(f.linkedUserId || ''));
        }
    }

    const maxBalance = Math.max(...friends.map(f => Math.abs(f.balance)), 1);
    const getStrokeWidth = (balance: number) => Math.max(2, (Math.abs(balance) / maxBalance) * 8);

    const topFriends = friends.filter(f => f.balance > 0).sort((a, b) => b.balance - a.balance);
    const bottomFriends = friends.filter(f => f.balance < 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    if (topFriends.length === 0 && bottomFriends.length === 0) {
        return null; // Return empty if no debts
    }

    const dashOffset = useSharedValue(0);
    React.useEffect(() => {
        dashOffset.value = withRepeat(withTiming(-100, { duration: 1200, easing: Easing.linear }), -1, false);
    }, []);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: dashOffset.value,
    }));

    // Canvas calculation
    const topRowWidth = topFriends.length * NODE_SPACING;
    const bottomRowWidth = bottomFriends.length * NODE_SPACING;
    const canvasWidth = Math.max(topRowWidth, bottomRowWidth, SCREEN_WIDTH - 40);

    const userNodeX = canvasWidth / 2;

    const getXPosition = (index: number, total: number) => {
        const startX = canvasWidth / 2 - (total * NODE_SPACING) / 2 + NODE_SPACING / 2;
        return startX + index * NODE_SPACING;
    };

    const renderNode = (name: string, balance: number, type: 'owe_me' | 'i_owe' | 'user', id?: string) => {
        const isUser = type === 'user';
        const isPositive = type === 'owe_me';
        const color = isUser ? colors.primary : (isPositive ? colors.success : colors.accent);

        const displayName = name.split(' ')[0] || name;

        const handleLongPress = () => {
            if (!id || isUser) return;
            Alert.alert(
                "Settle Up",
                `Do you want to settle your balance with ${displayName}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Settle",
                        onPress: () => router.push('/settle-up')
                    }
                ]
            );
        };

        return (
            <TouchableOpacity
                activeOpacity={id ? 0.7 : 1}
                onPress={() => id ? router.push({ pathname: '/friend-details/[id]', params: { id } }) : null}
                onLongPress={handleLongPress}
                delayLongPress={400}
                style={[
                    styles.node,
                    { backgroundColor: colors.surface, borderColor: color + '50' }
                ]}
            >
                <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.avatarText, { color }]}>
                        {displayName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                </Text>
                {!isUser && (
                    <Text style={[styles.amountText, { color }]}>
                        {formatCurrency(Math.abs(balance))}
                    </Text>
                )}
                {isUser && (
                    <Text style={[styles.amountText, { color: colors.textSecondary }]}>
                        You
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text }]}>Cash Flow Tree</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.treeCanvas, { width: canvasWidth }]}>

                    {/* TOP ROW: People who owe you */}
                    {topFriends.length > 0 && (
                        <View style={[styles.row, { height: NODE_WIDTH }]}>
                            {topFriends.map((friend, index) => {
                                const x = getXPosition(index, topFriends.length);
                                return (
                                    <View key={friend.id} style={[styles.nodeWrapper, { left: x - NODE_WIDTH / 2 }]}>
                                        {renderNode(friend.name, friend.balance, 'owe_me', friend.id)}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* PATHS FROM TOP TO CENTER */}
                    {topFriends.length > 0 && (
                        <Svg width={canvasWidth} height={VERTICAL_SPACING}>
                            <Defs>
                                <LinearGradient id="gradTop" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={colors.success} stopOpacity="0.4" />
                                    <Stop offset="1" stopColor={colors.success} stopOpacity="0.1" />
                                </LinearGradient>
                            </Defs>
                            {topFriends.map((friend, index) => {
                                const topX = getXPosition(index, topFriends.length);
                                const d = `M ${topX} 0 C ${topX} ${VERTICAL_SPACING / 2}, ${userNodeX} ${VERTICAL_SPACING / 2}, ${userNodeX} ${VERTICAL_SPACING}`;
                                const sw = getStrokeWidth(friend.balance);
                                return (
                                    <React.Fragment key={`top-grp-${index}`}>
                                        {/* Base solid background path */}
                                        <Path d={d} stroke="url(#gradTop)" strokeWidth={sw} fill="none" />
                                        {/* Animated flowing particles overlay */}
                                        <AnimatedPath
                                            d={d}
                                            stroke={colors.success}
                                            strokeWidth={sw * 0.6}
                                            fill="none"
                                            strokeDasharray="4, 12"
                                            strokeLinecap="round"
                                            animatedProps={animatedProps}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </Svg>
                    )}

                    {/* CENTER ROW: YOU */}
                    <View style={[styles.row, { height: NODE_WIDTH }]}>
                        <View style={[styles.nodeWrapper, { left: userNodeX - NODE_WIDTH / 2 }]}>
                            {renderNode(userProfile.name || 'User', 0, 'user')}
                        </View>
                    </View>

                    {/* PATHS FROM CENTER TO BOTTOM */}
                    {bottomFriends.length > 0 && (
                        <Svg width={canvasWidth} height={VERTICAL_SPACING}>
                            <Defs>
                                <LinearGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={colors.accent} stopOpacity="0.1" />
                                    <Stop offset="1" stopColor={colors.accent} stopOpacity="0.4" />
                                </LinearGradient>
                            </Defs>
                            {bottomFriends.map((friend, index) => {
                                const bottomX = getXPosition(index, bottomFriends.length);
                                const d = `M ${userNodeX} 0 C ${userNodeX} ${VERTICAL_SPACING / 2}, ${bottomX} ${VERTICAL_SPACING / 2}, ${bottomX} ${VERTICAL_SPACING}`;
                                const sw = getStrokeWidth(friend.balance);
                                return (
                                    <React.Fragment key={`bot-grp-${index}`}>
                                        {/* Base solid background path */}
                                        <Path d={d} stroke="url(#gradBottom)" strokeWidth={sw} fill="none" />
                                        {/* Animated flowing particles overlay */}
                                        <AnimatedPath
                                            d={d}
                                            stroke={colors.accent}
                                            strokeWidth={sw * 0.6}
                                            fill="none"
                                            strokeDasharray="4, 12"
                                            strokeLinecap="round"
                                            animatedProps={animatedProps}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </Svg>
                    )}

                    {/* BOTTOM ROW: People you owe */}
                    {bottomFriends.length > 0 && (
                        <View style={[styles.row, { height: NODE_WIDTH }]}>
                            {bottomFriends.map((friend, index) => {
                                const x = getXPosition(index, bottomFriends.length);
                                return (
                                    <View key={friend.id} style={[styles.nodeWrapper, { left: x - NODE_WIDTH / 2 }]}>
                                        {renderNode(friend.name, friend.balance, 'i_owe', friend.id)}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    treeCanvas: {
        alignItems: 'flex-start',
        paddingBottom: 20,
    },
    row: {
        width: '100%',
        position: 'relative',
    },
    nodeWrapper: {
        position: 'absolute',
        width: NODE_WIDTH,
        alignItems: 'center',
    },
    node: {
        width: NODE_WIDTH,
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
        borderWidth: 1,
        // Glass effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    nameText: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
        textAlign: 'center',
    },
    amountText: {
        fontSize: 11,
        fontWeight: '800',
    }
});
