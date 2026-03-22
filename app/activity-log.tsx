import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    RefreshControl,
    Alert,
    Pressable
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Clock, Activity, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSplittyStore, ActivityLog } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function ActivityLogScreen() {
    const colors = useSplittyStore(s => s.colors);
    const appearance = useSplittyStore(s => s.appearance);
    const activities = useSplittyStore(s => s.activities);
    const expenses = useSplittyStore(s => s.expenses);
    const fetchData = useSplittyStore(s => s.fetchData);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const designPreference = useSplittyStore(s => s.designPreference);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    useEffect(() => {
        fetchData();
    }, []);

    const filteredActivities = activities.filter(activity => {
        if (activity.entity_type === 'expense') {
            const expense = expenses.find(e => e.id === activity.entity_id);
            if (expense?.isPersonal) return false;
        }
        return true;
    });

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMins > 0) return `${diffMins}m ago`;
        return 'Just now';
    };

    const renderItem = ({ item }: { item: ActivityLog }) => {
        const isExpense = item.entity_type === 'expense';
        const isGroup = item.entity_type === 'group';
        const meta = item.metadata || {};

        const handlePress = () => {
            if (item.action === 'deleted' || item.action === 'removed_member' || item.action === 'left_group') {
                Alert.alert("Notice", "This item has been deleted or you are no longer a member.");
                return;
            }

            if (isExpense) {
                const exists = useSplittyStore.getState().expenses.some(e => e.id === item.entity_id);
                if (exists) {
                    router.push({ pathname: "/add-expense", params: { id: item.entity_id } });
                } else {
                    Alert.alert("Unavailable", "This expense seems to have been deleted.");
                }
            } else if (isGroup) {
                const exists = useSplittyStore.getState().groups.some(g => g.id === item.entity_id);
                if (exists) {
                    router.push({ pathname: "/group-details/[id]", params: { id: item.entity_id } });
                } else {
                    Alert.alert("Unavailable", "This group is no longer available.");
                }
            }
        };

        const CardContent = () => (
            <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: isSkeuomorphic ? 'rgba(0,0,0,0.03)' : colors.surface }]}>
                    {(() => {
                        if (isExpense) {
                            const categoryId = meta.category;
                            const categories = useSplittyStore.getState().categories;
                            const category = categories.find(c => c.id === categoryId);
                            
                            if (category) {
                                try {
                                    const { [category.icon as keyof typeof import('lucide-react-native')]: IconComponent } = require('lucide-react-native');
                                    if (IconComponent) return <IconComponent size={20} color={category.color || colors.primary} />;
                                } catch (e) {}
                            }
                            return <Activity size={20} color={colors.primary} />;
                        }
                        if (isGroup) {
                            return <Users size={20} color={colors.secondary || '#4bc0c0'} />;
                        }
                        return <Activity size={20} color={colors.textSecondary} />;
                    })()}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.description, { color: colors.text }]}>
                        {(() => {
                            let desc = item.description;
                            if (isExpense) {
                                desc = desc.replace(/^You added 'Paid (.*)'$/, "You settled '$1'");
                                desc = desc.replace(/^You added '(.*) paid you'$/, "$1 settled with you");
                                desc = desc.replace(/^(.*) added you to 'Paid .*'$/, "$1 settled with you");
                                desc = desc.replace(/^(.*) added you to '.* paid you'$/, "$1 settled with you");
                            }
                            return desc;
                        })()}
                    </Text>

                    {(meta.amount !== undefined || meta.group_name) && (
                        <View style={styles.detailsContainer}>
                            {meta.amount !== undefined && (
                                <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                                        {meta.payer_name ? `${meta.payer_name} paid ` : 'Total: '}
                                        {formatCurrency(Number(meta.amount))}
                                    </Text>
                                </View>
                            )}
                            {meta.group_name && (
                                <View style={[styles.badge, { backgroundColor: colors.textSecondary + '15' }]}>
                                    <Text style={[styles.badgeText, { color: colors.text }]}>
                                        {meta.group_name}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.metaContainer}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={[styles.time, { color: colors.textSecondary }]}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                </View>
            </View>
        );

        if (isSkeuomorphic) {
            return (
                <Pressable onPress={handlePress} style={styles.skeuoCardWrapper}>
                    <View style={[styles.skeuoCardOuter, skeuo.outset.light]}>
                        <View style={[styles.skeuoCardInner, skeuo.outset.dark]}>
                            <LinearGradient colors={skeuo.surfaceGradient} style={styles.card}>
                                <CardContent />
                            </LinearGradient>
                        </View>
                    </View>
                </Pressable>
            );
        }

        return (
            <Pressable onPress={handlePress}>
                <GlassCard style={styles.card}>
                    <CardContent />
                </GlassCard>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (isSkeuomorphic ? 10 : 0) }]}>
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                            <Pressable
                                onPress={() => router.back()}
                                style={[styles.backButton, { backgroundColor: skeuo.background }]}
                            >
                                <ArrowLeft size={24} color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: colors.surface }]}
                    >
                        <ArrowLeft size={24} color={colors.text} />
                    </Pressable>
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>Activity Log</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={filteredActivities}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon={Activity}
                        title="No Activity Logged"
                        message="Your split bills and group changes will appear here."
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    listContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 120, // Account for floating tab bar
    },
    card: {
        padding: 16,
        borderRadius: 24,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    description: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 6,
        lineHeight: 22,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    detailsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
    skeuoCardWrapper: {
        marginBottom: 16,
    },
    skeuoCardOuter: {
        borderRadius: 24,
    },
    skeuoCardInner: {
        borderRadius: 24,
    },
    skeuoIconWrapper: {
        borderRadius: 22,
    },
    skeuoIconInner: {
        borderRadius: 22,
    }
});
