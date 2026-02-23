import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSplittyStore } from '../store/useSplittyStore';
import { DebtTree } from '../components/DebtTree';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView } from 'react-native-gesture-handler';

// We import Zoom from 'react-native-zoom-reanimated'
import Zoom from 'react-native-zoom-reanimated';
import { VibrantButton } from '../components/VibrantButton';

export default function DebtTreeScreen() {
    const router = useRouter();
    const { colors, groups } = useSplittyStore();
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

    const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Debt Flow Map</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { borderColor: colors.primary, backgroundColor: selectedGroupId === null ? colors.primary : 'transparent' }
                        ]}
                        onPress={() => setSelectedGroupId(null)}
                    >
                        <Text style={[styles.filterChipText, { color: selectedGroupId === null ? '#FFF' : colors.primary }]}>All</Text>
                    </TouchableOpacity>
                    {groups.map(g => (
                        <TouchableOpacity
                            key={g.id}
                            style={[
                                styles.filterChip,
                                { borderColor: colors.primary, backgroundColor: selectedGroupId === g.id ? colors.primary : 'transparent' }
                            ]}
                            onPress={() => setSelectedGroupId(g.id)}
                        >
                            <Text style={[styles.filterChipText, { color: selectedGroupId === g.id ? '#FFF' : colors.primary }]}>{g.name}</Text>
                        </TouchableOpacity>
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

            <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    Pinch to zoom, drag to pan
                </Text>
            </View>
        </SafeAreaView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        zIndex: 10, // Ensure header sits above zoomable content
    },
    backButton: {
        padding: 4,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
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
        bottom: 40,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        // Glass effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
