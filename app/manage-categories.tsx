import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Tag, X, DollarSign, RefreshCw } from 'lucide-react-native';
import { useSplittyStore } from '../store/useSplittyStore';
import { GlassCard } from '../components/GlassCard';
import * as IconComponents from 'lucide-react-native';
import { CategoryIcon } from '../components/CategoryIcon';

const PRESET_COLORS = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#06B6D4', // Cyan
];

const PRESET_ICONS = [
    'Utensils', 'Bus', 'Home', 'Clapperboard', 'ShoppingCart',
    'HeartPulse', 'Plane', 'Wifi', 'GraduationCap', 'Gift',
    'Car', 'Coffee', 'Gamepad2', 'Briefcase', 'Dumbbell',
    'Music', 'Smartphone', 'Zap'
];

export default function ManageCategoriesScreen() {
    const router = useRouter();
    const { colors, categories, deleteCategory, addCategory, updateCategory, getCurrencySymbol } = useSplittyStore();
    const currency = getCurrencySymbol();

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
    const [newIconName, setNewIconName] = useState(PRESET_ICONS[0]);
    const [newDefaultBudget, setNewDefaultBudget] = useState('');
    const [applyToAll, setApplyToAll] = useState(false);

    const openModal = (category?: any) => {
        if (category) {
            setEditingId(category.id);
            setNewLabel(category.label);
            setNewColor(category.color);
            setNewIconName(category.icon);
            setNewDefaultBudget(category.defaultBudget ? category.defaultBudget.toString() : '');
            setApplyToAll(false);
        } else {
            setEditingId(null);
            setNewLabel('');
            setNewColor(PRESET_COLORS[0]);
            setNewIconName(PRESET_ICONS[0]);
            setNewDefaultBudget('');
            setApplyToAll(false);
        }
        setAddModalVisible(true);
    };

    const handleDelete = (id: string, label: string) => {
        if (id === 'general') {
            Alert.alert("Action Denied", "The General category cannot be deleted.");
            return;
        }

        Alert.alert(
            "Delete Category?",
            `Are you sure you want to delete '${label}'?\n\nAny existing expenses tied to this category will be reassigned to General.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteCategory(id)
                }
            ]
        );
    };

    const handleSaveCategory = () => {
        if (!newLabel.trim()) {
            Alert.alert("Error", "Please provide a name for the category.");
            return;
        }

        const budgetAmt = newDefaultBudget.trim() ? parseFloat(newDefaultBudget.trim()) : undefined;

        if (editingId) {
            updateCategory(
                editingId,
                { label: newLabel.trim(), color: newColor, icon: newIconName, defaultBudget: budgetAmt },
                applyToAll
            );
        } else {
            addCategory(
                { label: newLabel.trim(), color: newColor, icon: newIconName, defaultBudget: budgetAmt },
                applyToAll
            );
        }

        setAddModalVisible(false);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Categories</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
                    <Plus color={colors.primary} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.list}>
                    {categories.map((cat) => {
                        const isGeneral = cat.id === 'general';

                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => openModal(cat)}
                                activeOpacity={0.7}
                            >
                                <GlassCard style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
                                    <View style={styles.categoryLeft}>
                                        <View style={[styles.iconWrapper, { backgroundColor: cat.color + '20' }]}>
                                            <CategoryIcon name={cat.icon} color={cat.color} size={20} />
                                        </View>
                                        <View>
                                            <Text style={[styles.categoryLabel, { color: colors.text }]}>{cat.label}</Text>
                                            {cat.defaultBudget && cat.defaultBudget > 0 && (
                                                <Text style={[styles.categorySubLabel, { color: colors.textSecondary }]}>
                                                    Default Budget: {currency}{cat.defaultBudget}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {!isGeneral && (
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDelete(cat.id, cat.label)}
                                        >
                                            <Trash2 color={colors.error} size={20} />
                                        </TouchableOpacity>
                                    )}
                                </GlassCard>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Category Modal */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingId ? 'Edit Category' : 'New Category'}
                            </Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseButton}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody}>
                            {/* Preview */}
                            <View style={styles.previewContainer}>
                                <View style={[styles.previewIcon, { backgroundColor: newColor + '20' }]}>
                                    {React.createElement((IconComponents as any)[newIconName], { color: newColor, size: 32 })}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category Name</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Tag color={colors.textSecondary} size={20} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="e.g. Groceries"
                                        placeholderTextColor={colors.textSecondary}
                                        value={newLabel}
                                        onChangeText={setNewLabel}
                                        autoFocus={!editingId}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Default Budget (Optional)</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '600', marginLeft: 4, marginRight: 2 }}>{currency}</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="0.00"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="decimal-pad"
                                        value={newDefaultBudget}
                                        onChangeText={text => setNewDefaultBudget(text.replace(/[^0-9.]/g, ''))}
                                    />
                                </View>
                            </View>

                            {newDefaultBudget.trim() !== '' && (
                                <View style={[styles.toggleGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.toggleTextContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <RefreshCw size={16} color={colors.primary} />
                                            <Text style={[styles.toggleTitle, { color: colors.text }]}>Apply to existing months</Text>
                                        </View>
                                        <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                                            This will aggressively backfill this budget amount to all past and present months.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={applyToAll}
                                        onValueChange={setApplyToAll}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Color Theme</Text>
                                <View style={styles.colorGrid}>
                                    {PRESET_COLORS.map(color => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: color },
                                                newColor === color && styles.colorCircleSelected
                                            ]}
                                            onPress={() => setNewColor(color)}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Icon</Text>
                                <View style={styles.iconGrid}>
                                    {PRESET_ICONS.map(iconName => (
                                        <TouchableOpacity
                                            key={iconName}
                                            style={[
                                                styles.iconSelectBtn,
                                                { backgroundColor: colors.surface },
                                                newIconName === iconName && { borderColor: colors.primary, borderWidth: 2 }
                                            ]}
                                            onPress={() => setNewIconName(iconName)}
                                        >
                                            {React.createElement((IconComponents as any)[iconName], { color: newIconName === iconName ? colors.primary : colors.text, size: 24 })}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                                onPress={handleSaveCategory}
                            >
                                <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Save Category'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal >

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    addButton: { padding: 4 },
    container: { padding: 20 },
    list: { gap: 12 },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrapper: {
        padding: 10,
        borderRadius: 12,
    },
    categoryLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalCloseButton: { padding: 4 },
    modalBody: { padding: 20 },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    previewIcon: {
        padding: 20,
        borderRadius: 24,
    },
    inputGroup: { marginBottom: 24 },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    colorCircleSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    iconSelectBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    categorySubLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
    },
    toggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    toggleTextContainer: {
        flex: 1,
        paddingRight: 16,
    },
    toggleTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    toggleDesc: {
        fontSize: 13,
        lineHeight: 18,
    }
});
