import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import { VibrantButton } from '../components/VibrantButton';
import { CategoryIcon } from '../components/CategoryIcon';
import * as Haptics from 'expo-haptics';

export default function SetBudgetScreen() {
    const router = useRouter();
    const { month } = useLocalSearchParams<{ month: string }>();
    const { colors, budgets, setCategoryBudget, autoFillBudget, formatCurrency, getCurrencySymbol, categories } = useSplittyStore();

    // Fallback to current month if navigating here without params
    const monthKey = typeof month === 'string' ? month : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Extract Display label e.g., November 2023
    const dateObj = new Date(`${monthKey}-01T00:00:00Z`);
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    const currentBudget = budgets.find(b => b.month === monthKey);

    // We maintain a local editing state of all categories
    const [localBudgets, setLocalBudgets] = useState<Record<string, string>>({});

    useEffect(() => {
        // Initialize local input values based on store budget
        const initialForm: Record<string, string> = {};
        if (currentBudget) {
            Object.entries(currentBudget.categories).forEach(([cat, amt]) => {
                if (amt > 0) {
                    initialForm[cat] = amt.toString();
                }
            });
        }
        setLocalBudgets(initialForm);
    }, [currentBudget]);

    const handleAutoFill = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        autoFillBudget(monthKey);
        // Toast or notification could be added here
        Alert.alert("Auto-Fill Completed", "We analyzed your last 3 months to suggest these amounts.");
    };

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Loop through all inputs and save to store
        Object.entries(localBudgets).forEach(([categoryId, amountStr]) => {
            const amount = parseFloat(amountStr || '0');
            // Allow setting 0 to clear it
            setCategoryBudget(monthKey, categoryId, amount);
        });

        router.back();
    };

    const handleAmountChange = (text: string, categoryId: string) => {
        // Only allow numbers and decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        setLocalBudgets(prev => ({ ...prev, [categoryId]: cleaned }));
    };

    const totalProjected = Object.values(localBudgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const currency = getCurrencySymbol();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <X color={colors.text} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Set Category Budgets</Text>
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                        <CheckCircle2 color={colors.primary} size={28} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Plan your spending for {monthName}
                    </Text>

                    <GlassCard style={[styles.autoFillCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                        <View style={styles.autoFillHeader}>
                            <Sparkles color={colors.primary} size={24} />
                            <Text style={[styles.autoFillTitle, { color: colors.text }]}>Smart Auto-Fill</Text>
                        </View>
                        <Text style={[styles.autoFillDesc, { color: colors.textSecondary }]}>
                            Based on your average spending from the last 3 months.
                        </Text>
                        <VibrantButton
                            title="Apply All"
                            onPress={handleAutoFill}
                            style={{ alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 10, height: 40 }}
                            textStyle={{ fontSize: 14 }}
                        />
                    </GlassCard>

                    <View style={styles.categoriesList}>
                        {categories.map(category => {
                            // Skip general category usually used for settlements
                            if (category.id === 'general') return null;

                            // Check if currentStore has value for suggested hint?
                            // For true auto-fill hints next to the field, we could pre-calculate here, but auto-fill btn is enough.
                            const value = localBudgets[category.id] || '';

                            return (
                                <View key={category.id} style={styles.categoryItem}>
                                    <View style={styles.catHeader}>
                                        <View style={[styles.iconWrapper, { backgroundColor: category.color + '20' }]}>
                                            <CategoryIcon name={category.icon} color={category.color} size={24} />
                                        </View>
                                        <Text style={[styles.catName, { color: colors.text }]}>{category.label}</Text>
                                    </View>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                        <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>{currency}</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            keyboardType="decimal-pad"
                                            placeholder="0.00"
                                            placeholderTextColor={colors.textSecondary + '80'}
                                            value={value}
                                            onChangeText={(text) => handleAmountChange(text, category.id)}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <View style={{ height: 140 }} />
                </ScrollView>

                {/* Fixed Total Bottom Bar */}
                <View style={[styles.totalBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <View>
                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>PROJECTED BUDGET</Text>
                        <Text style={[styles.totalAmount, { color: colors.text }]}>{formatCurrency(totalProjected)}</Text>
                    </View>
                    <VibrantButton
                        title="Save Budget"
                        onPress={handleSave}
                        style={{ paddingHorizontal: 24 }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },
    container: { padding: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    closeButton: { padding: 4 },
    saveButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    subtitle: { fontSize: 16, marginBottom: 24 },
    autoFillCard: { padding: 20, marginBottom: 30, borderWidth: 1 },
    autoFillHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    autoFillTitle: { fontSize: 18, fontWeight: '700' },
    autoFillDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
    categoriesList: { gap: 24 },
    categoryItem: { gap: 12 },
    catHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrapper: { padding: 10, borderRadius: 12 },
    catName: { fontSize: 18, fontWeight: '600' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    currencyPrefix: { fontSize: 18, marginRight: 8 },
    input: { flex: 1, fontSize: 18, fontWeight: '600', height: '100%' },
    totalBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    totalLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    totalAmount: { fontSize: 28, fontWeight: '800' },
});
