import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSplittyStore } from '../store/useSplittyStore';
import { DebtTree } from '../components/DebtTree';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Skeuomorphic } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

// We import Zoom from 'react-native-zoom-reanimated'
import Zoom from 'react-native-zoom-reanimated';

export default function DebtTreeScreen() {
    const router = useRouter();
    const colors = useSplittyStore(s => s.colors);
    const groups = useSplittyStore(s => s.groups);
    const appearance = useSplittyStore(s => s.appearance);
    const designPreference = useSplittyStore(s => s.designPreference);
    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, !isSkeuomorphic && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                {isSkeuomorphic ? (
                    <View style={[styles.skeuoIconWrapper, skeuo.outset.light]}>
                        <View style={[styles.skeuoIconInner, skeuo.outset.dark]}>
                            <Pressable onPress={() => router.back()} style={[styles.backButtonSkeuo, { backgroundColor: skeuo.background }]}>
                                <ChevronLeft size={28} color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={28} color={colors.text} />
                    </Pressable>
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>Debt Flow Map</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={[styles.filterContainer, !isSkeuomorphic && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                    <Pressable
                        style={[
                            styles.filterChip,
                            {
                                borderColor: colors.primary,
                                backgroundColor: selectedGroupId === null ? colors.primary : (isSkeuomorphic ? 'transparent' : 'transparent'),
                                borderWidth: isSkeuomorphic && selectedGroupId !== null ? 0 : 1
                            },
                        ]}
                        onPress={() => setSelectedGroupId(null)}
                    >
                        {isSkeuomorphic && selectedGroupId !== null ? (
                            <View style={[styles.skeuoChipOuter, skeuo.outset.light]}>
                                <View style={[styles.skeuoChipInner, skeuo.outset.dark]}>
                                    <View style={[styles.skeuoChipContent, { backgroundColor: skeuo.background }]}>
                                        <Text style={[styles.filterChipText, { color: colors.primary }]}>All</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Text style={[styles.filterChipText, { color: selectedGroupId === null ? '#FFF' : colors.primary }]}>All</Text>
                        )}
                    </Pressable>

                    {groups.map(g => (
                        <Pressable
                            key={g.id}
                            style={[
                                styles.filterChip,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: selectedGroupId === g.id ? colors.primary : 'transparent',
                                    borderWidth: isSkeuomorphic && selectedGroupId !== g.id ? 0 : 1
                                }
                            ]}
                            onPress={() => setSelectedGroupId(g.id)}
                        >
                            {isSkeuomorphic && selectedGroupId !== g.id ? (
                                <View style={[styles.skeuoChipOuter, skeuo.outset.light]}>
                                    <View style={[styles.skeuoChipInner, skeuo.outset.dark]}>
                                        <View style={[styles.skeuoChipContent, { backgroundColor: skeuo.background }]}>
                                            <Text style={[styles.filterChipText, { color: colors.primary }]}>{g.name}</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text style={[styles.filterChipText, { color: selectedGroupId === g.id ? '#FFF' : colors.primary }]}>{g.name}</Text>
                            )}
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.canvasContainer}>
                <Zoom style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <DebtTree filterGroupId={selectedGroupId} />
                    </ScrollView>
                </Zoom>
            </View>

            {isSkeuomorphic ? (
                <View style={[styles.legendSkeuo, skeuo.outset.light]}>
                    <View style={[styles.legendInnerSkeuo, skeuo.outset.dark]}>
                        <LinearGradient colors={skeuo.surfaceGradient} style={styles.legendGradient}>
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                                Pinch to zoom, drag to pan
                            </Text>
                        </LinearGradient>
                    </View>
                </View>
            ) : (
                <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                        Pinch to zoom, drag to pan
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
        marginLeft: -4,
    },
    backButtonSkeuo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    filterContainer: {
        paddingVertical: 12,
        zIndex: 10,
    },
    canvasContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20
    },
    legend: {
        position: 'absolute',
        bottom: 110,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    legendSkeuo: {
        position: 'absolute',
        bottom: 110,
        alignSelf: 'center',
        borderRadius: 24,
    },
    legendInnerSkeuo: {
        borderRadius: 24,
    },
    legendGradient: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterChip: {
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 36,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 16,
    },
    skeuoIconWrapper: {
        borderRadius: 22,
    },
    skeuoIconInner: {
        borderRadius: 22,
    },
    skeuoChipOuter: {
        borderRadius: 24,
    },
    skeuoChipInner: {
        borderRadius: 24,
    },
    skeuoChipContent: {
        borderRadius: 24,
        paddingVertical: 6,
    }
});
