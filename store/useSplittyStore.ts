import { Alert } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ThemeName, AppearanceMode, AccentName, getThemeColors, ThemeColors, AccentPalettes } from '../constants/Colors';
import { notificationService } from '../lib/NotificationService';
import * as Crypto from 'expo-crypto';
import { CATEGORIES, Category } from '../constants/Categories';

// --- Phone Normalization Helper ---
const normalizePhone = (phone: string | undefined | null): string => {
    if (!phone) return '';
    // Remove all non-numeric characters and take only the last 10 digits
    const numeric = phone.replace(/\D/g, '');
    return numeric.length > 10 ? numeric.slice(-10) : numeric;
};

// --- ID Mapping Helpers ---
const mapToRealId = (localId: string, friends: Friend[], sessionUserId: string): string => {
    if (localId === 'self') return sessionUserId;
    const friend = friends.find(f => f.id === localId);
    return friend?.linkedUserId || localId; // Fallback to localId if not linked
};

const mapToLocalId = (realId: string, friends: Friend[], sessionUserId: string): string => {
    if (realId === sessionUserId) return 'self';
    const friend = friends.find(f => f.linkedUserId === realId);
    return friend?.id || realId; // Fallback to realId if no local friend found
};

const mapIdsToReal = (ids: string[], friends: Friend[], sessionUserId: string): string[] => {
    return ids.map(id => mapToRealId(id, friends, sessionUserId));
};

const mapSplitDetailsToReal = (details: Record<string, number>, friends: Friend[], sessionUserId: string): Record<string, number> => {
    const realDetails: Record<string, number> = {};
    Object.entries(details).forEach(([id, amount]) => {
        const realId = mapToRealId(id, friends, sessionUserId);
        realDetails[realId] = amount;
    });
    return realDetails;
};

// Helper to map a raw DB expense row to a store Expense object using local friend mapping
const mapRowToExpense = (e: any, friends: Friend[], userId: string): Expense => {
    const friendMap = new Map<string, string>();
    friends.forEach(f => {
        if (f.linkedUserId) friendMap.set(f.linkedUserId, f.id);
    });

    const mapRealToLocal = (realId: string | null): string => {
        if (!realId || realId === userId) return 'self';
        return friendMap.get(realId) || realId;
    };

    const localPayerId = mapRealToLocal(e.payer_id);
    let localSplitWith: string[] = [];
    let localSplitDetails: Record<string, number> = {};

    // Use split_with and split_details from the payload if available (they should be)
    localSplitWith = (e.split_with || [])
        .map((realId: string) => mapRealToLocal(realId));

    if (e.split_details) {
        Object.entries(e.split_details).forEach(([realId, amount]) => {
            localSplitDetails[mapRealToLocal(realId)] = Number(amount);
        });
    }

    return {
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        payerId: localPayerId,
        payerName: e.payer_name || undefined,
        groupId: e.group_id || undefined,
        splitWith: localSplitWith,
        date: e.date,
        splitType: e.split_type,
        splitDetails: localSplitDetails,
        category: e.category,
        isSettlement: e.is_settlement as boolean,
        isPersonal: e.is_personal || false,
        createdBy: e.created_by || undefined,
        billUrl: e.bill_url || undefined
    };
};

// Module-level variable for debouncing fetchData
let fetchDataTimeout: NodeJS.Timeout | null = null;

// --------------------------

export interface Friend {
    id: string;
    name: string;
    balance: number;
    phone?: string;
    linkedUserId?: string;
    avatarUrl?: string;
}

export interface Group {
    id: string;
    name: string;
    members: string[]; // Friend IDs
    balance: number;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    payerId: string;
    payerName?: string;
    groupId?: string;
    splitWith: string[]; // Friend IDs
    date: string;
    splitType?: 'equal' | 'unequal';
    splitDetails?: { [id: string]: number }; // ID -> Amount (ID can be 'self' or friendId)
    category: string;
    isSettlement?: boolean;
    createdBy?: string;
    isPersonal?: boolean;
    tags?: string[];
    billUrl?: string;
}

export interface MonthlyBudget {
    month: string; // e.g. "2023-11"
    categories: Record<string, number>; // Maps category ID to budget amount
}

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringExpense {
    id: string;
    description: string;
    amount: number;
    payerId: string;
    groupId?: string;
    splitWith: string[];
    splitType?: 'equal' | 'unequal';
    splitDetails?: { [id: string]: number };
    category: string;
    frequency: Frequency;
    nextDueDate: string; // ISO Date string
    active: boolean;
    billUrl?: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    actor_id: string;
    entity_type: 'expense' | 'group' | 'settlement';
    entity_id: string;
    action: string;
    description: string;
    metadata?: {
        amount?: number;
        currency?: string;
        payer_name?: string;
        group_name?: string;
        split_type?: string;
        participants?: string[];
        [key: string]: any;
    };
    created_at: string;
    is_read: boolean;
}

// --- Supabase Table Interfaces ---
export interface ProfileRow {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    email: string | null;
    preferences: any | null;
}

export interface FriendRow {
    id: string;
    name: string;
    user_id: string;
    phone: string | null;
    linked_user_id: string | null;
    avatar_url: string | null;
}

export interface ExpenseRow {
    id: string;
    description: string;
    amount: number;
    payer_id: string | null;
    payer_name: string | null;
    group_id: string | null;
    category: string;
    split_type: 'equal' | 'unequal';
    split_details: Record<string, number> | null;
    split_with: string[] | null;
    date: string;
    is_settlement: boolean;
    is_personal: boolean;
    created_at: string;
    created_by: string | null;
    bill_url: string | null;
    expense_participants?: ExpenseParticipantRow[];
}

export interface ExpenseParticipantRow {
    expense_id: string;
    profile_id: string | null;
    friend_id: string | null;
    amount: number;
}

export interface GroupRow {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
    archived_by: string[] | null;
}

export interface GroupMemberRow {
    group_id: string;
    user_id: string;
}

export interface ActivityLogRow {
    id: string;
    user_id: string;
    actor_id: string;
    entity_type: 'expense' | 'group' | 'settlement';
    entity_id: string;
    action: string;
    description: string;
    metadata: any | null;
    created_at: string;
    is_read: boolean;
}

export interface CategoryRow {
    id: string;
    label: string;
    icon: string;
    color: string;
    default_budget: number;
}

export interface RecurringExpenseRow {
    id: string;
    description: string;
    amount: number;
    payer_id: string;
    group_id: string | null;
    split_with: string[] | null;
    split_type: 'equal' | 'unequal';
    split_details: Record<string, number> | null;
    category: string;
    frequency: string;
    next_due_date: string;
    active: boolean;
}

export interface MonthlyBudgetRow {
    id: string;
    user_id: string;
    month: string;
    category_id: string;
    amount: number;
}
// --------------------------

export interface UserProfile {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
}

interface SplittyState {
    session: Session | null;
    friends: Friend[];
    groups: Group[];
    expenses: Expense[];
    recurringExpenses: RecurringExpense[];
    activities: ActivityLog[];
    budgets: MonthlyBudget[];
    categories: Category[];
    categoryOrder: string[]; // Order of category IDs for the budgets page
    setCategoryOrder: (order: string[]) => void;
    hiddenBudgetCategories: string[]; // Category IDs hidden from budget view
    toggleCategoryBudgetVisibility: (categoryId: string) => void;
    addCategory: (category: Omit<Category, 'id'>, applyToAllMonths?: boolean) => void;
    updateCategory: (id: string, updates: Partial<Category>, applyToAllMonths?: boolean) => void;
    deleteCategory: (categoryId: string) => void;
    getCategoryById: (categoryId: string) => Category;
    setCategoryBudget: (month: string, categoryId: string, amount: number) => void;
    autoFillBudget: (month: string) => void;
    addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
    deleteExpense: (id: string) => Promise<void>;
    editExpense: (id: string, updatedExpense: Omit<Expense, 'id' | 'date'>) => void;
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'nextDueDate' | 'active'>) => void;
    deleteRecurringExpense: (id: string) => void;
    checkRecurringExpenses: () => number; // Returns number of created expenses
    addFriend: (name: string, linkedUserId?: string, phone?: string) => Promise<string>;
    editFriend: (id: string, name: string, avatarUrl?: string) => Promise<void>;
    addGroup: (name: string, members: string[]) => void;
    deleteFriend: (id: string) => void;
    deleteGroup: (id: string) => void;
    editGroup: (id: string, name: string, members: string[]) => void;
    userProfile: UserProfile;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    clearData: () => void;
    theme: ThemeName; // Deprecated: use accent instead
    setTheme: (theme: ThemeName) => void;
    appearance: AppearanceMode;
    setAppearance: (mode: AppearanceMode) => void;
    accent: AccentName;
    setAccent: (accent: AccentName) => void;
    isDarkMode: boolean;
    toggleTheme: () => void; // Now toggles appearance
    colors: ThemeColors; // Helper to get merged colors directly from store
    currency: string;
    setCurrency: (currency: string) => void;
    getCurrencySymbol: () => string;
    formatCurrency: (amount: number) => string;
    settleUp: (payerId: string, receiverId: string, amount: number) => void;
    signOut: () => Promise<void>;
    subscribeToChanges: () => () => void;
    // Notifications
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => void;
    initNotifications: () => Promise<void>;
    // View Preferences
    dashboardViewPreference: 'tree' | 'list';
    setDashboardViewPreference: (pref: 'tree' | 'list') => void;
    unknownFriendNames: Record<string, string>;
    isRefreshing: boolean;
    fetchData: () => Promise<void>;
    setSession: (session: Session | null) => void;
    isRolloverEnabled: boolean;
    setRolloverEnabled: (enabled: boolean) => void;
    budgetAlertsSent: Record<string, boolean>;
    designPreference: 'existing' | 'skeuomorphic';
    setDesignPreference: (pref: 'existing' | 'skeuomorphic') => void;
    uploadBill: (uri: string) => Promise<string | null>;
}

const calculateBalances = (expenses: Expense[], friends: Friend[], groups: Group[]) => {
    // 1. Reset balances
    const newFriends = friends.map(f => ({ ...f, balance: 0 }));
    const newGroups = groups.map(g => ({ ...g, balance: 0 }));

    // 2. Iterate expenses
    expenses.forEach(expense => {
        let participants: string[] = [];
        if (expense.groupId) {
            const group = newGroups.find(g => g.id === expense.groupId);
            if (group) participants = [...group.members];
        } else if (expense.splitWith) {
            participants = [...expense.splitWith];
        }

        const amounts: { [id: string]: number } = {};
        // Prefer stored splitDetails when available (covers both equal and unequal splits
        // loaded from DB via expense_participants). Only recalculate if splitDetails is empty.
        const hasStoredDetails = expense.splitDetails && Object.keys(expense.splitDetails).length > 0;
        if (hasStoredDetails) {
            Object.assign(amounts, expense.splitDetails);
        } else {
            const totalPeople = participants.length + 1; // + Self
            const splitAmount = expense.amount / totalPeople;
            amounts['self'] = splitAmount;
            participants.forEach(p => amounts[p] = splitAmount);
        }

        if (expense.payerId === 'self') {
            // User paid -> Friends owe User
            participants.forEach(friendId => {
                const amountOwed = amounts[friendId] || 0;
                if (amountOwed > 0) {
                    const friend = newFriends.find(f => f.id === friendId);
                    if (friend) {
                        friend.balance += amountOwed;
                    }
                }
            });

            if (expense.groupId) {
                const group = newGroups.find(g => g.id === expense.groupId);
                if (group) {
                    const ownShare = amounts['self'] || 0;
                    group.balance += (expense.amount - ownShare);
                }
            }
        } else {
            // Friend paid -> User owes Friend
            const payer = newFriends.find(f => f.id === expense.payerId);
            if (payer) {
                const myShare = amounts['self'] || 0;
                payer.balance -= myShare;

                if (expense.groupId) {
                    const group = newGroups.find(g => g.id === expense.groupId);
                    if (group) {
                        group.balance -= myShare;
                    }
                }
            }
        }
    });

    return { friends: newFriends, groups: newGroups };
};

export const useSplittyStore = create<SplittyState>()(
    persist(
        (set, get) => ({
            session: null,
            friends: [],
            groups: [],
            expenses: [],
            activities: [],
            budgets: [],
            categories: CATEGORIES,
            categoryOrder: [],
            hiddenBudgetCategories: [],
            unknownFriendNames: {},
            isRefreshing: false,
            notificationsEnabled: true,
            dashboardViewPreference: 'list',
            isRolloverEnabled: false,
            currency: 'USD',
            accent: 'classic',
            appearance: 'light',
            userProfile: { name: '', email: '' },
            budgetAlertsSent: {},
            designPreference: 'existing',
            theme: 'light',
            isDarkMode: false,
            colors: getThemeColors('light', 'classic'),
            setSession: (session) => set({ session }),
            fetchData: async () => {
                if (get().isRefreshing) return;
                set({ isRefreshing: true });
                const { session } = get();
                if (!session?.user) {
                    return;
                }

                const userId = session.user.id;

                try {
                // Fallback: Populate from session metadata first
                const meta = session.user.user_metadata;
                let userProfile: UserProfile = {
                    name: meta?.full_name || meta?.name || 'New User',
                    email: session.user.email || '',
                    avatar: meta?.avatar_url || meta?.picture || '',
                    phone: session.user.phone || ''
                };

                // Parallelize fetching for better performance
                const [profileRes, friendsRes, expensesRes, groupsRes, activitiesRes, categoriesRes, recurringRes, budgetsRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    supabase.from('friends').select('*').eq('user_id', userId).order('name').returns(),
                    // Fetch expenses AND their participants in one go
                    supabase.from('expenses').select(`
                        *,
                        expense_participants (
                            profile_id,
                            friend_id,
                            amount
                        )
                    `).order('date', { ascending: false }).returns(),
                    // Fetch Groups Logic: Get memberships -> Get Groups -> Get All Members
                    (async () => {
                        const { data: myMemberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId).returns() as { data: GroupMemberRow[] | null };
                        const myGroupIds = myMemberships?.map((m: GroupMemberRow) => m.group_id) || [];

                        if (myGroupIds.length === 0) return { groups: [] as GroupRow[], members: [] as GroupMemberRow[] };

                        const { data: groups } = await supabase.from('groups').select('*').in('id', myGroupIds).order('created_at', { ascending: false }).returns() as { data: GroupRow[] | null };
                        const { data: members } = await supabase.from('group_members').select('*').in('group_id', myGroupIds).returns() as { data: GroupMemberRow[] | null };
                        return { groups: groups || [], members: members || [] };
                    })(),
                    // Fetch Activity Logs
                    supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50).returns(),
                    // Fetch User Categories
                    supabase.from('categories').select('*').eq('user_id', userId).order('created_at', { ascending: true }).returns(),
                    // Fetch Recurring Expenses
                    supabase.from('recurring_expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).returns(),
                    // Fetch Monthly Budgets
                    supabase.from('monthly_budgets').select('*').eq('user_id', userId).returns()
                ]);

                // 1. Handle Profile & Preferences
                const { data: profileData, error: profileError } = profileRes;
                let preferences = {
                    is_rollover_enabled: false,
                    currency: 'USD',
                    design_preference: 'existing',
                    category_order: [] as string[],
                    hidden_categories: [] as string[],
                    accent: 'classic' as AccentName,
                    notifications_enabled: true,
                    dashboard_view: 'list' as 'tree' | 'list',
                    unknown_friend_names: {} as Record<string, string>,
                };

                if (!profileError && profileData) {
                    userProfile = {
                        name: profileData.full_name || meta?.full_name || meta?.name || 'New User',
                        email: profileData.email || session.user.email || '',
                        avatar: profileData.avatar_url || meta?.avatar_url || meta?.picture || '',
                        phone: profileData.phone || ''
                    };
                    if (profileData.preferences) {
                        preferences = { ...preferences, ...profileData.preferences };
                    }
                }

                // Initialize strict types
                let loadedFriends: Friend[] = [];
                let loadedGroups: Group[] = [];
                let loadedExpenses: Expense[] = [];
                let loadedCategories: Category[] = [];
                let loadedRecurring: RecurringExpense[] = [];
                let loadedBudgets: MonthlyBudget[] = [];

                // 2. Handle Categories
                const { data: categoriesData, error: categoriesError } = categoriesRes;
                if (!categoriesError && categoriesData && categoriesData.length > 0) {
                    loadedCategories = (categoriesData as CategoryRow[]).map((c: CategoryRow) => ({
                        id: c.id,
                        label: c.label,
                        icon: c.icon,
                        color: c.color,
                        defaultBudget: Number(c.default_budget)
                    }));
                } else {
                    // Initialize with default CATEGORIES if none exist
                    loadedCategories = CATEGORIES;
                    // Proactively sync defaults for new user
                    if (session.user && (!categoriesData || categoriesData.length === 0)) {
                        const uploads = CATEGORIES.map(c => ({
                            user_id: userId,
                            label: c.label,
                            icon: c.icon,
                            color: c.color,
                            default_budget: c.defaultBudget || 0
                        }));
                        supabase.from('categories').insert(uploads).then();
                    }
                }

                // 2. Handle Friends
                const { data: friendsData, error: friendsError } = friendsRes;
                if (!friendsError && friendsData) {
                    let mappedFriends: Friend[] = (friendsData as FriendRow[]).map((f: FriendRow) => ({
                        id: f.id,
                        name: f.name,
                        phone: f.phone || undefined,
                        linkedUserId: f.linked_user_id || undefined,
                        avatarUrl: f.avatar_url || undefined,
                        balance: 0
                    }));

                    // Fetch avatars/profiles for linked users
                    const linkedUserIds = mappedFriends
                        .map(f => f.linkedUserId)
                        .filter((id): id is string => !!id);

                    if (linkedUserIds.length > 0) {
                        const { data: linkedProfiles } = await supabase
                            .from('profiles')
                            .select('id, avatar_url')
                            .in('id', linkedUserIds)
                            .returns() as { data: Pick<ProfileRow, 'id' | 'avatar_url'>[] | null };

                        if (linkedProfiles) {
                            const avatarMap = new Map<string, string>(
                                linkedProfiles.map((p: any) => [p.id, p.avatar_url as string])
                            );
                            mappedFriends = mappedFriends.map((f: Friend) => ({
                                ...f,
                                avatarUrl: (f.linkedUserId ? avatarMap.get(f.linkedUserId) : f.avatarUrl) || undefined
                            }));
                        }
                    }
                    loadedFriends = mappedFriends;
                }

                // Hoist ID Mapping Helper
                const friendMap = new Map<string, string>(); // Real UUID -> Local Friend ID
                if (!friendsError && friendsData) {
                    (friendsData as FriendRow[]).forEach((f: FriendRow) => {
                        if (f.linked_user_id) {
                            friendMap.set(f.linked_user_id, f.id);
                        }
                    });
                }

                const mapRealToLocal = (realId: string | null): string => {
                    if (!realId) return 'self';
                    if (realId === userId) return 'self';
                    return friendMap.get(realId) || realId; // Fallback to realId
                };

                // 3. Handle Groups
                const { groups: groupsData, members: groupMembersData } = groupsRes;

                if (groupsData) {
                    const mappedGroups: Group[] = (groupsData as GroupRow[])
                        .filter((g: GroupRow) => {
                            const archivedBy: string[] = g.archived_by || [];
                            return !archivedBy.includes(userId);
                        })
                        .map((g: GroupRow) => {
                            const members = groupMembersData
                                ? (groupMembersData as GroupMemberRow[])
                                    .filter((gm: GroupMemberRow) => gm.group_id === g.id)
                                    .map((gm: GroupMemberRow) => mapRealToLocal(gm.user_id))
                                : [];

                            return {
                                id: g.id,
                                name: g.name,
                                members: members,
                                balance: 0
                            };
                        });
                    loadedGroups = mappedGroups;
                }

                // 4. Handle Expenses
                const { data: expensesData, error: expensesError } = expensesRes;
                if (!expensesError && expensesData) {
                    const mappedExpenses: Expense[] = (expensesData as ExpenseRow[]).map((e: ExpenseRow) => {
                        const localPayerId = mapRealToLocal(e.payer_id);
                        let localSplitWith: string[] = [];
                        let localSplitDetails: Record<string, number> = {};

                        if (e.expense_participants && e.expense_participants.length > 0) {
                            (e.expense_participants as any[]).forEach((p: any) => {
                                let localId = 'unknown';
                                if (p.profile_id) {
                                    localId = mapRealToLocal(p.profile_id);
                                } else if (p.friend_id) {
                                    localId = mapRealToLocal(p.friend_id);
                                }

                                localSplitWith.push(localId);

                                localSplitDetails[localId] = Number(p.amount);
                            });
                        } else {
                            // Legacy fallback if relational participants are missing
                            localSplitWith = (e.split_with || [])
                                .map((realId: string) => mapRealToLocal(realId));

                            if (e.split_details) {
                                Object.entries(e.split_details).forEach(([realId, amount]) => {
                                    localSplitDetails[mapRealToLocal(realId)] = Number(amount);
                                });
                            }
                        }

                        return {
                            id: e.id,
                            description: e.description,
                            amount: Number(e.amount),
                            payerId: localPayerId,
                            payerName: e.payer_name || undefined,
                            groupId: e.group_id || undefined,
                            splitWith: localSplitWith,
                            date: e.date,
                            splitType: e.split_type,
                            splitDetails: localSplitDetails,
                            category: e.category,
                            isSettlement: e.is_settlement as boolean,
                            isPersonal: e.is_personal || false,
                            createdBy: e.created_by || undefined,
                            billUrl: e.bill_url || undefined
                        };
                    });
                    loadedExpenses = mappedExpenses;
                }

                // 5. Calculate Balances
                const { friends: balancedFriends, groups: balancedGroups } = calculateBalances(loadedExpenses, loadedFriends, loadedGroups);

                // 5.5. Fetch Names for Unknown Friends
                let newUnknownFriendNames: Record<string, string> = {};
                if (loadedExpenses.length > 0) {
                    const knownFriendIds = new Set([userId, 'self', ...loadedFriends.map(f => f.id)]);
                    const unknownFriendIds = new Set<string>();

                    loadedExpenses.forEach(e => {
                        if (!knownFriendIds.has(e.payerId)) unknownFriendIds.add(e.payerId);
                        e.splitWith.forEach(id => {
                            if (!knownFriendIds.has(id)) unknownFriendIds.add(id);
                        });
                    });

                    if (unknownFriendIds.size > 0) {
                        const { data: missingFriendsData } = await supabase
                            .from('friends')
                            .select('id, name, user_id')
                            .in('id', Array.from(unknownFriendIds))
                            .returns() as { data: Pick<FriendRow, 'id' | 'name' | 'user_id'>[] | null };

                        if (missingFriendsData && missingFriendsData.length > 0) {
                            const creatorIds = new Set(
                                (missingFriendsData as Pick<FriendRow, 'id' | 'name' | 'user_id'>[])
                                    .map((f: any) => f.user_id)
                                    .filter((id: string) => !!id && id !== userId)
                            );

                            const creatorMap = new Map<string, string>();
                            if (creatorIds.size > 0) {
                                const { data: creatorProfiles } = await supabase
                                    .from('profiles')
                                    .select('id, full_name, email')
                                    .in('id', Array.from(creatorIds))
                                    .returns() as { data: Pick<ProfileRow, 'id' | 'full_name' | 'email'>[] | null };

                                if (creatorProfiles) {
                                    (creatorProfiles as any[]).forEach((p: any) => {
                                        creatorMap.set(p.id, p.full_name || p.email?.split('@')[0] || 'Unknown User');
                                    });
                                }
                            }

                            (missingFriendsData as any[]).forEach((f: any) => {
                                const creatorName = creatorMap.get(f.user_id);
                                if (f.name && creatorName) {
                                    newUnknownFriendNames[f.id] = `${f.name} (via ${creatorName})`;
                                } else if (f.name) {
                                    newUnknownFriendNames[f.id] = f.name;
                                } else {
                                    newUnknownFriendNames[f.id] = 'Unknown';
                                }
                            });
                        }
                    }
                }

                // 5.8: Sanitize Categories
                let currentCategories = get().categories;
                let categoriesModified = false;

                const sanitizedCategories = currentCategories.map(cat => {
                    if (typeof cat.icon !== 'string') {
                        categoriesModified = true;
                        return { ...cat, icon: 'MoreHorizontal' };
                    }
                    return cat;
                });

                // 5. Handle Recurring Expenses
                const { data: recurringData, error: recurringError } = recurringRes;
                if (!recurringError && recurringData) {
                    loadedRecurring = (recurringData as RecurringExpenseRow[]).map((r: RecurringExpenseRow) => ({
                        id: r.id,
                        description: r.description,
                        amount: Number(r.amount),
                        payerId: r.payer_id === userId ? 'self' : r.payer_id,
                        groupId: r.group_id || undefined,
                        splitWith: r.split_with || [],
                        splitType: r.split_type,
                        splitDetails: r.split_details || {},
                        category: r.category,
                        frequency: r.frequency as Frequency,
                        nextDueDate: r.next_due_date,
                        active: r.active
                    }));
                }

                // 6. Handle Monthly Budgets
                const { data: budgetsData, error: budgetsError } = budgetsRes;
                if (!budgetsError && budgetsData) {
                    const budgetMap: Record<string, Record<string, number>> = {};
                    (budgetsData as MonthlyBudgetRow[]).forEach((b: MonthlyBudgetRow) => {
                        if (!budgetMap[b.month]) budgetMap[b.month] = {};
                        budgetMap[b.month][b.category_id] = Number(b.amount);
                    });
                    loadedBudgets = Object.entries(budgetMap).map(([month, categories]) => ({
                        month,
                        categories
                    }));
                }

                // 7. Set Final State
                const supabaseFriendIds = new Set(loadedFriends.map(f => f.id));
                const supabaseLinkedUserIds = new Set(loadedFriends.map(f => f.linkedUserId).filter(id => !!id));
                const supabasePhones = new Set(loadedFriends.map(f => normalizePhone(f.phone)).filter(p => !!p));
                const supabaseNames = new Set(loadedFriends.map(f => f.name.toLowerCase().trim()));

                const currentFriends = get().friends;
                const localOnlyFriends = currentFriends.filter(f => {
                    // Prune if ID matches (standard)
                    if (supabaseFriendIds.has(f.id)) return false;
                    
                    // Prune if linkedUserId matches (already synced but maybe with different ID)
                    if (f.linkedUserId && supabaseLinkedUserIds.has(f.linkedUserId)) return false;

                    // Prune if normalized phone matches
                    const normPhone = normalizePhone(f.phone);
                    if (normPhone && supabasePhones.has(normPhone)) return false;

                    // Final safety prune: if name matches exactly and it's local only, it's likely a duplicate
                    const normName = f.name.toLowerCase().trim();
                    if (supabaseNames.has(normName) && !f.linkedUserId && !f.phone) return false;

                    return true;
                });
                const mergedFriends = [...balancedFriends, ...localOnlyFriends.map(f => ({ ...f, balance: 0 }))];
                const { friends: finalFriends, groups: finalGroups } = calculateBalances(loadedExpenses, mergedFriends, balancedGroups);

                const finalStateToSet: Partial<SplittyState> = {
                    userProfile,
                    friends: finalFriends,
                    groups: finalGroups,
                    expenses: loadedExpenses,
                    recurringExpenses: loadedRecurring,
                    budgets: loadedBudgets,
                    activities: (activitiesRes.data as ActivityLog[]) || [],
                    isRolloverEnabled: preferences.is_rollover_enabled,
                    currency: preferences.currency,
                    designPreference: preferences.design_preference as any,
                    categories: loadedCategories,
                    categoryOrder: preferences.category_order || [],
                    hiddenBudgetCategories: preferences.hidden_categories || [],
                    accent: (AccentPalettes[preferences.accent as AccentName] ? preferences.accent : 'classic') as AccentName,
                    notificationsEnabled: preferences.notifications_enabled !== undefined ? preferences.notifications_enabled : true,
                    dashboardViewPreference: preferences.dashboard_view || 'list',
                    unknownFriendNames: { ...newUnknownFriendNames, ...(preferences.unknown_friend_names || {}) }
                };

                if (categoriesModified) {
                    finalStateToSet.categories = sanitizedCategories;
                }
                
                finalStateToSet.isRefreshing = false;
                set(finalStateToSet);

                // Proactively sync new unknown names discovered this session
                if (session.user) {
                    const hasNewNames = Object.keys(newUnknownFriendNames).some(id => !preferences.unknown_friend_names?.[id]);
                    if (hasNewNames) {
                        const mergedNames = { ...preferences.unknown_friend_names, ...newUnknownFriendNames };
                        supabase.from('profiles').update({
                            preferences: { ...preferences, unknown_friend_names: mergedNames }
                        }).eq('id', userId).then();
                    }
                }
                } catch (error) {
                    console.error("Error during fetchData:", error);
                    set({ isRefreshing: false });
                }
            },
            setCategoryOrder: (order) => {
                set({ categoryOrder: order });
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then((profileRes: any) => {
                        const data = profileRes.data;
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, category_order: order }
                        }).eq('id', session.user.id).then((updateRes: any) => {
                            const error = updateRes.error;
                            if (error) console.error("Error updating category order preference:", error.message);
                        });
                    });
                }
            },
            toggleCategoryBudgetVisibility: (categoryId) => set((state) => {
                const isHidden = state.hiddenBudgetCategories.includes(categoryId);
                const nextHidden = isHidden
                    ? state.hiddenBudgetCategories.filter(id => id !== categoryId)
                    : [...state.hiddenBudgetCategories, categoryId];

                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then((profileRes: any) => {
                        const data = profileRes.data;
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, hidden_categories: nextHidden }
                        }).eq('id', session.user.id).then((updateRes: any) => {
                            const error = updateRes.error;
                            if (error) console.error("Error updating visibility preference:", error.message);
                        });
                    });
                }

                return { hiddenBudgetCategories: nextHidden };
            }),
            addCategory: (category, applyToAllMonths) => {
                const newId = Crypto.randomUUID();
                const newCategory: Category = { ...category, id: newId };

                let newBudgets = get().budgets;
                if (applyToAllMonths && category.defaultBudget !== undefined) {
                    newBudgets = get().budgets.map(b => ({
                        ...b,
                        categories: {
                            ...b.categories,
                            [newId]: category.defaultBudget!
                        }
                    }));

                    // Sync to Supabase for all months
                    const { session } = get();
                    if (session?.user) {
                        const budgetInserts = get().budgets.map(b => ({
                            user_id: session.user.id,
                            month: b.month,
                            category_id: newId,
                            amount: category.defaultBudget!
                        }));
                        supabase.from('monthly_budgets').upsert(budgetInserts).then((res: any) => {
                            const error = res.error;
                            if (error) console.error("Error batch upserting category budget:", error.message);
                        });
                    }
                }

                const { session } = get();
                if (session?.user) {
                    supabase.from('categories').insert({
                        id: newId,
                        user_id: session.user.id,
                        label: category.label,
                        icon: category.icon,
                        color: category.color,
                        default_budget: category.defaultBudget || 0
                    }).then((res: any) => {
                        const error = res.error;
                        if (error) console.error("Error adding category:", error);
                    });
                }

                set((state) => ({
                    categories: [...state.categories, newCategory],
                    ...(applyToAllMonths ? { budgets: newBudgets } : {})
                }));
            },
            updateCategory: (id, updates, applyToAllMonths) => {
                const { categories, budgets, session } = get();
                const updatedCategories = categories.map(c =>
                    c.id === id ? { ...c, ...updates } : c
                );

                let nextBudgets = budgets;
                if (applyToAllMonths && updates.defaultBudget !== undefined) {
                    nextBudgets = budgets.map(b => ({
                        ...b,
                        categories: {
                            ...b.categories,
                            [id]: updates.defaultBudget!
                        }
                    }));

                    // Sync to Supabase for all months
                    if (session?.user) {
                        const budgetUpserts = budgets.map(b => ({
                            user_id: session.user.id,
                            month: b.month,
                            category_id: id,
                            amount: updates.defaultBudget!
                        }));
                        supabase.from('monthly_budgets').upsert(budgetUpserts).then((res: any) => {
                            const error = res.error;
                            if (error) console.error("Error batch updating category budgets:", error.message);
                        });
                    }
                }

                if (session?.user) {
                    const categoryToUpdate = updatedCategories.find(c => c.id === id);
                    if (categoryToUpdate) {
                        supabase.from('categories').update({
                            label: categoryToUpdate.label,
                            icon: categoryToUpdate.icon,
                            color: categoryToUpdate.color,
                            default_budget: categoryToUpdate.defaultBudget
                        }).eq('id', id).then((res: any) => {
                            const error = res.error;
                            if (error) console.error("Error updating category:", error.message);
                        });
                    }
                }

                set({
                    categories: updatedCategories,
                    budgets: nextBudgets
                });
            },
            deleteCategory: (categoryId) => set((state) => {
                // Replace category of any expense using the deleted category with 'general'
                const updatedExpenses = state.expenses.map(e =>
                    e.category === categoryId ? { ...e, category: 'general' } : e
                );

                const { session } = get();
                if (session?.user) {
                    supabase.from('categories').delete().eq('id', categoryId).then(({ error }: { error: any }) => {
                        if (error) console.error("Error deleting category:", error);
                    });
                }

                return {
                    categories: state.categories.filter(c => c.id !== categoryId),
                    expenses: updatedExpenses
                };
            }),
            getCategoryById: (categoryId) => {
                const { categories } = get();

                // 1. Try direct ID match
                const directMatch = categories.find(c => c.id === categoryId);
                if (directMatch) return directMatch;

                // 2. Handle legacy IDs (e.g. 'general', 'food') by matching labels in loaded categories
                const legacy = CATEGORIES.find(c => c.id === categoryId);
                if (legacy) {
                    const labelMatch = categories.find(c => c.label.toLowerCase() === legacy.label.toLowerCase());
                    if (labelMatch) return labelMatch;
                }

                // 3. Fallback to "General" or first available
                return categories.find(c => c.label === 'General') || categories.find(c => c.id === 'general') || categories[0] || CATEGORIES[0];
            },
            setCategoryBudget: (month, categoryId, amount) => {
                const { session } = get();
                if (session?.user) {
                    supabase.from('monthly_budgets')
                        .upsert({
                            user_id: session.user.id,
                            month,
                            category_id: categoryId,
                            amount
                        }, { onConflict: 'user_id,month,category_id' })
                        .then(({ error }: any) => {
                            if (error) console.error("Error upserting monthly budget:", error.message);
                        });
                }

                set((state) => {
                    const existingBudgetIndex = state.budgets.findIndex(b => b.month === month);
                    if (existingBudgetIndex >= 0) {
                        const newBudgets = [...state.budgets];
                        newBudgets[existingBudgetIndex] = {
                            ...newBudgets[existingBudgetIndex],
                            categories: {
                               ...newBudgets[existingBudgetIndex].categories,
                                [categoryId]: amount
                            }
                        };
                        return { budgets: newBudgets };
                    } else {
                        return {
                            budgets: [...state.budgets, { month, categories: { [categoryId]: amount } }]
                        };
                    }
                });
            },
            autoFillBudget: (month) => set((state) => {
                const currentMonthDate = new Date(`${month}-01T00:00:00Z`);
                const threeMonthsAgo = new Date(currentMonthDate);
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                const recentExpenses = state.expenses.filter(e => {
                    if (e.isSettlement) return false;
                    const eDate = new Date(e.date);
                    return eDate >= threeMonthsAgo && eDate < currentMonthDate;
                });

                const categoryTotals: Record<string, number> = {};
                recentExpenses.forEach(e => {
                    let myShare = 0;
                    if (e.splitType === 'unequal' && e.splitDetails) {
                        myShare = e.splitDetails['self'] || 0;
                    } else {
                        const totalPeople = (e.splitWith?.length || 0) + 1;
                        myShare = e.amount / totalPeople;
                    }

                    if (myShare > 0) {
                        if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
                        categoryTotals[e.category] += myShare;
                    }
                });

                const newCategories: Record<string, number> = {};
                Object.entries(categoryTotals).forEach(([cat, total]) => {
                    const avg = Math.round(total / 3);
                    if (avg > 0) {
                        newCategories[cat] = avg;
                    }
                });

                const existingBudgetIndex = state.budgets.findIndex(b => b.month === month);
                if (existingBudgetIndex >= 0) {
                    const newBudgets = [...state.budgets];
                    newBudgets[existingBudgetIndex] = {
                        ...newBudgets[existingBudgetIndex],
                        categories: {
                            ...newBudgets[existingBudgetIndex].categories,
                            ...newCategories
                        }
                    };
                    return { budgets: newBudgets };
                } else {
                    return { budgets: [...state.budgets, { month, categories: newCategories }] };
                }
            }),
            updateUserProfile: (profile) => {
                const updatedProfile = { ...get().userProfile, ...profile };
                set({ userProfile: updatedProfile });

                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').update({
                        full_name: updatedProfile.name,
                        avatar_url: updatedProfile.avatar,
                        phone: updatedProfile.phone,
                        email: updatedProfile.email
                    }).eq('id', session.user.id).then(({ error }: { error: any }) => {
                        if (error) console.error("Error updating profile:", error.message);
                    });
                }
            },
            addFriend: async (name: string, linkedUserId?: string, phone?: string) => {
                const normPhone = normalizePhone(phone);
                const { friends, session } = get();

                // Check for existing friend with same phone or linkedUserId
                const existingFriend = friends.find(f => 
                    (normPhone && normalizePhone(f.phone) === normPhone) ||
                    (linkedUserId && f.linkedUserId === linkedUserId)
                );

                if (existingFriend) {
                    console.log(`Matching with existing friend: ${existingFriend.name}`);
                    // If the existing friend is not linked yet but we have a link now, update it
                    if (linkedUserId && !existingFriend.linkedUserId) {
                        set((state) => ({
                            friends: state.friends.map(f => 
                                f.id === existingFriend.id ? { ...f, linkedUserId, name: name || f.name } : f
                            )
                        }));

                        if (session?.user) {
                             supabase.from('friends').update({ linked_user_id: linkedUserId, name }).eq('id', existingFriend.id).then(({ error }: { error: any }) => {
                                 if (error) console.error("Error updating friend link:", error.message);
                             });
                        }
                    }
                    return existingFriend.id;
                }

                const newFriend: Friend = { id: Crypto.randomUUID(), name, balance: 0, linkedUserId, phone: normPhone || undefined };
                set((state) => ({
                    friends: [...state.friends, newFriend]
                }));

                if (session?.user) {
                    const insertPayload = {
                        id: newFriend.id,
                        name: newFriend.name,
                        user_id: session.user.id,
                        linked_user_id: linkedUserId,
                        phone: normPhone || null
                    };
                    const { error } = await supabase.from('friends').insert(insertPayload);
                    if (error) {
                        console.warn('Friend sync failed, retrying...', error.message);
                        setTimeout(async () => {
                            const { error: retryError } = await supabase.from('friends').insert(insertPayload);
                            if (retryError) {
                                console.error('Friend sync retry also failed:', retryError.message);
                            }
                        }, 3000);
                    }
                }
                
                return newFriend.id;
            },
            editFriend: async (id: string, name: string, avatarUrl?: string) => {
                const { session } = get();
                if (!session?.user) throw new Error("Not authenticated");

                // Optmistic UI Update
                set((state) => ({
                    friends: state.friends.map(f =>
                        f.id === id ? { ...f, name, avatarUrl } : f
                    )
                }));

                const { error } = await supabase.from('friends')
                    .update({ name, avatar_url: avatarUrl || null })
                    .eq('id', id)
                    .eq('user_id', session.user.id);

                if (error) {
                    console.error("Edit friend sync error:", error);
                    // Revert on failure
                    get().fetchData();
                    throw new Error(error.message);
                }
            },
            addGroup: (name, members) => {
                const groupId = Crypto.randomUUID();
                set((state) => ({
                    groups: [...state.groups, { id: groupId, name, members, balance: 0 }]
                }));
                const { session } = get();
                if (session?.user) {
                    supabase.from('groups').insert({
                        id: groupId,
                        name,
                        created_by: session.user.id
                    }).then(({ error }: { error: any }) => {
                        if (!error) {
                            const memberInserts = [
                                { group_id: groupId, user_id: session.user.id },
                                ...members
                                    .filter(mId => mId !== 'self')
                                    .map(mId => {
                                        const friend = get().friends.find(f => f.id === mId);
                                        return friend?.linkedUserId ? friend.linkedUserId : null;
                                    })
                                    .filter((realId): realId is string => !!realId && realId !== session.user.id)
                                    .map(realId => ({ group_id: groupId, user_id: realId }))
                            ];

                            if (memberInserts.length > 1) {
                                supabase.from('group_members').insert(memberInserts).then(({ error: memberError }: { error: any }) => {
                                    if (memberError) {
                                        console.error("Error adding members:", memberError);
                                        Alert.alert("Error", "Group created but failed to sync some members. Ensure friends are linked to real users.");
                                    }
                                });
                            } else {
                                // Only the creator is in the group (online), valid for just creating the group container
                                console.log("Group created with only the creator locally linked.");
                            }
                        } else {
                            console.error("Error creating group:", error);
                            // Revert optimistic update
                            set((state) => ({
                                groups: state.groups.filter(g => g.id !== groupId)
                            }));
                        }
                    });
                }
            },
            clearData: () => set(() => ({
                friends: [],
                groups: [],
                expenses: [],
                recurringExpenses: [],
                budgets: [],
                categories: CATEGORIES,
                unknownFriendNames: {},
                session: null,
                userProfile: { name: 'Guest', email: '' }
            })),
            editExpense: (id, updates) => {
                console.log('📝 editExpense called:', updates.description);
                set((state) => {
                    const { session, friends, userProfile } = get();
                    const existingExpense = state.expenses.find(e => e.id === id);
                    if (!existingExpense) return state;

                    const updatedExpense: Expense = {
                        ...existingExpense,
                        ...updates,
                        // Ensure tags is not undefined
                        tags: updates.tags !== undefined ? updates.tags : existingExpense.tags
                    };

                    if (session?.user) {
                        const payer = friends.find(f => f.id === updatedExpense.payerId);
                        const payerName = updatedExpense.payerId === 'self' ? (userProfile.name || 'You') : (payer?.name || 'Someone');

                        // Map IDs to Real UUIDs for Supabase
                        const realPayerId = mapToRealId(updatedExpense.payerId, friends, session.user.id);
                        const realSplitWith = mapIdsToReal(updatedExpense.splitWith, friends, session.user.id);
                        const realSplitDetails = updatedExpense.splitDetails ? mapSplitDetailsToReal(updatedExpense.splitDetails, friends, session.user.id) : {};

                        // 1. Update main expenses table
                        supabase.from('expenses').update({
                            description: updatedExpense.description,
                            amount: updatedExpense.amount,
                            payer_id: realPayerId === session.user.id ? session.user.id : (realPayerId || null),
                            payer_name: payerName,
                            group_id: updatedExpense.groupId,
                            category: updatedExpense.category,
                            split_type: updatedExpense.splitType,
                            split_details: realSplitDetails,
                            split_with: realSplitWith,
                            is_personal: updatedExpense.isPersonal,
                            bill_url: updatedExpense.billUrl
                        })
                            .eq('id', id)
                            .then(async ({ error }: { error: any }) => {
                                if (error) {
                                    console.error("Expense edit sync error:", error);
                                } else {
                                    // 2. Dual Write: Update expense_participants
                                    // First delete existing participants for this expense
                                    const { error: delError } = await supabase
                                        .from('expense_participants')
                                        .delete()
                                        .eq('expense_id', id);

                                    if (!delError) {
                                        const participantsToInsert = [];
                                        const allParticipants = new Set([...realSplitWith, realPayerId]);
                                        if (realPayerId === session.user.id) allParticipants.add(session.user.id);

                                        for (const realId of Array.from(allParticipants)) {
                                            let amount = 0;
                                            if (updatedExpense.splitType === 'unequal') {
                                                amount = realSplitDetails[realId] || 0;
                                            } else {
                                            const count = new Set([...(updatedExpense.splitWith || []), 'self']).size;
                                            amount = Number((updatedExpense.amount / count).toFixed(2));
                                            }

                                            let pId: string | null = null;
                                            let fId: string | null = null;

                                            if (realId === session.user.id) {
                                                pId = realId;
                                            } else {
                                                const friendObj = friends.find(f => f.linkedUserId === realId);
                                                if (friendObj) {
                                                    pId = realId;
                                                } else {
                                                    const localFriend = friends.find(f => f.id === realId);
                                                    if (localFriend) {
                                                        fId = realId;
                                                    } else {
                                                        pId = realId;
                                                    }
                                                }
                                            }

                                            participantsToInsert.push({
                                                expense_id: id,
                                                profile_id: pId,
                                                friend_id: fId,
                                                amount: amount
                                            });
                                        }

                                        if (participantsToInsert.length > 0) {
                                            await supabase.from('expense_participants').insert(participantsToInsert);
                                        }
                                    }
                                }
                            });
                    }

                    const updatedExpenses = state.expenses.map(e => e.id === id ? updatedExpense : e);
                    const { friends: newFriends, groups: newGroups } = calculateBalances(updatedExpenses, state.friends, state.groups);

                    return {
                        expenses: updatedExpenses,
                        friends: newFriends,
                        groups: newGroups
                    };
                });
            },
            setTheme: (theme: ThemeName) => {
                let app: AppearanceMode = 'dark';
                let acc: AccentName = 'classic';
                if (theme === 'light') {
                    app = 'light';
                } else if (theme === 'midnight') {
                    acc = 'midnight';
                } else if (theme === 'sunset') {
                    acc = 'sunset';
                } else if (theme === 'forest') {
                    acc = 'forest';
                }
                set({
                    theme,
                    appearance: app,
                    accent: acc,
                    isDarkMode: app === 'dark',
                    colors: getThemeColors(app, acc)
                });
            },
            setAppearance: (appearance: AppearanceMode) => set((state) => ({
                appearance,
                isDarkMode: appearance === 'dark',
                colors: getThemeColors(appearance, state.accent)
            })),
            setAccent: (accent) => {
                set((state) => ({
                    accent,
                    colors: getThemeColors(state.appearance, accent)
                }));
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, accent }
                        }).eq('id', session.user.id).then();
                    });
                }
            },
            setNotificationsEnabled: (enabled) => {
                set({ notificationsEnabled: enabled });
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, notifications_enabled: enabled }
                        }).eq('id', session.user.id).then();
                    });
                }
            },
            initNotifications: async () => {
                const token = await notificationService.registerForPushNotificationsAsync();
                const { session } = get();
                if (token && session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: { data: any }) => {
                        const prefs = data?.preferences || {};
                        if (prefs.push_token !== token) {
                           supabase.from('profiles').update({
                               preferences: { ...prefs, push_token: token }
                           }).eq('id', session.user.id).then();
                        }
                    });
                    console.log('Push Data: Local Notifications Ready');
                }
            },
            setDashboardViewPreference: (pref) => {
                set({ dashboardViewPreference: pref });
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, dashboard_view: pref }
                        }).eq('id', session.user.id).then();
                    });
                }
            },
            toggleTheme: () => set((state) => {
                const nextMode: AppearanceMode = state.appearance === 'light' ? 'dark' : 'light';
                return {
                    appearance: nextMode,
                    isDarkMode: nextMode === 'dark',
                    colors: getThemeColors(nextMode, state.accent)
                };
            }),
            setRolloverEnabled: (enabled: boolean) => {
                set({ isRolloverEnabled: enabled });
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, is_rollover_enabled: enabled }
                        }).eq('id', session.user.id).then(({ error }: { error: any }) => {
                            if (error) console.error("Error updating rollover preference:", error.message);
                        });
                    });
                }
            },
            setDesignPreference: (pref) => {
                set({ designPreference: pref });
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, design_preference: pref }
                        }).eq('id', session.user.id).then(({ error }: { error: any }) => {
                            if (error) console.error("Error updating design preference:", error.message);
                        });
                    });
                }
            },
            uploadBill: async (uri: string) => {
                try {
                    const { session } = get();
                    if (!session?.user) return null;

                    const fileExt = uri.split('.').pop() || 'jpg';
                    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    // More robust way to handle file upload in React Native
                    const formData = new FormData();
                    formData.append('file', {
                        uri: uri,
                        name: fileName,
                        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                    } as any);

                    const { error } = await supabase.storage
                        .from('bills')
                        .upload(filePath, formData);

                    if (error) throw error;

                    const { data } = supabase.storage
                        .from('bills')
                        .getPublicUrl(filePath);

                    return data.publicUrl;
                } catch (error) {
                    console.error('Error uploading bill:', error);
                    return null;
                }
            },
            signOut: async () => {
                await supabase.auth.signOut();
                if (fetchDataTimeout) {
                    clearTimeout(fetchDataTimeout);
                    fetchDataTimeout = null;
                }
                get().clearData();
            },
            setCurrency: (currency) => {
                set(() => ({ currency }));
                const { session } = get();
                if (session?.user) {
                    supabase.from('profiles').select('preferences').eq('id', session.user.id).single().then(({ data }: any) => {
                        const prefs = data?.preferences || {};
                        supabase.from('profiles').update({
                            preferences: { ...prefs, currency }
                        }).eq('id', session.user.id).then(({ error }: any) => {
                            if (error) console.error("Error updating currency preference:", error.message);
                        });
                    });
                }
            },
            getCurrencySymbol: () => {
                const currency = get().currency;
                const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥' };
                return symbols[currency] || '$';
            },
            formatCurrency: (amount: number) => {
                const currency = get().currency;
                const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥' };
                const symbol = symbols[currency] || '$';
                return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toFixed(2)}`;
            },
            settleUp: (payerId, receiverId, amount) => {
                const { addExpense, friends } = get();
                // Determine description
                // If payerId is self, "Paid [Friend]"
                // If receiverId is self, "[Friend] paid you"
                let description = 'Settlement';
                let splitDetails: Record<string, number> = {};
                let splitWith: string[] = [];

                if (payerId === 'self') {
                    const friend = friends.find(f => f.id === receiverId);
                    description = `Paid ${friend?.name || 'Friend'}`;
                    splitWith = [receiverId];
                    splitDetails = { 'self': 0, [receiverId]: amount };
                } else {
                    const friend = friends.find(f => f.id === payerId);
                    description = `${friend?.name || 'Friend'} paid you`;
                    splitWith = [payerId];
                    splitDetails = { 'self': amount, [payerId]: 0 };
                }

                // Optimistic balance update — reflect immediately, don't wait for fetchData
                set((state) => ({
                    friends: state.friends.map(f => {
                        if (payerId === 'self' && f.id === receiverId) {
                            return { ...f, balance: f.balance - amount };
                        }
                        if (receiverId === 'self' && f.id === payerId) {
                            return { ...f, balance: f.balance + amount };
                        }
                        return f;
                    })
                }));

                addExpense({
                    description,
                    amount,
                    payerId,
                    splitWith,
                    splitType: 'unequal',
                    splitDetails,
                    category: 'general',
                    isSettlement: true
                });
            },
            addExpense: (expense) => {
                console.log('➕ addExpense called', expense.description);
                set((state) => {
                    const newExpense = {
                        ...expense,
                        id: Crypto.randomUUID(),
                        date: new Date().toISOString(),
                        splitType: expense.splitType || 'equal',
                        splitDetails: expense.splitDetails || {},
                        isPersonal: expense.isPersonal,
                        tags: expense.tags || [],
                        payerName: 'Someone' // Placeholder, will update below
                    };

                    const { session, friends, userProfile } = get();
                    const payer = friends.find(f => f.id === expense.payerId);
                    const payerName = expense.payerId === 'self' ? (userProfile.name || 'You') : (payer?.name || 'Someone');
                    newExpense.payerName = payerName;

                    if (session?.user) {
                        // ... existing logic ...

                        // Map IDs to Real UUIDs for Supabase
                        const realPayerId = mapToRealId(expense.payerId, friends, session.user.id);
                        const realSplitWith = mapIdsToReal(newExpense.splitWith, friends, session.user.id);
                        const realSplitDetails = newExpense.splitDetails ? mapSplitDetailsToReal(newExpense.splitDetails, friends, session.user.id) : {};

                        // Determine the correct payer_id for Supabase
                        // Supabase expects a profile UUID, so we must map it. 
                        // If it's the session user, it's their UUID. 
                        // If it's a friend, we need to try getting their linked real user UUID.
                        // If they don't have a linked user id (local only), payer_id must be null 
                        // and we rely on payer_name. 
                        let finalSupabasePayerId = null;
                        if (expense.payerId === 'self') {
                            finalSupabasePayerId = session.user.id;
                        } else if (payer?.linkedUserId) {
                            finalSupabasePayerId = payer.linkedUserId;
                        }

                        supabase.from('expenses').insert({
                            id: newExpense.id,
                            description: newExpense.description,
                            amount: newExpense.amount,
                            payer_id: finalSupabasePayerId,
                            payer_name: payerName,
                            group_id: newExpense.groupId,
                            date: newExpense.date,
                            category: newExpense.category,
                            split_type: newExpense.splitType,
                            split_details: realSplitDetails,
                            split_with: realSplitWith, // Persist real UUIDs
                            is_personal: newExpense.isPersonal,
                            created_by: session.user.id,
                            bill_url: newExpense.billUrl
                        }).then(async ({ error }: { error: any }) => {
                            if (error) {
                                console.error("Expense sync error details:", error);
                            } else {
                                // DUAL WRITE: Insert into expense_participants
                                // We need to convert the realSplitDetails (Map<RealUUID, Amount>) into rows
                                const participantsToInsert = [];

                                // Iterate over all participants in the split
                                const allParticipants = new Set([...realSplitWith, realPayerId]);
                                if (realPayerId === session.user.id) allParticipants.add(session.user.id);

                                for (const realId of Array.from(allParticipants)) {
                                    let amount = 0;

                                    // Calculate amount based on split type logic if needed, 
                                    // BUT realSplitDetails should already be fully populated by logic in AddExpenseScreen?
                                    // Actually AddExpenseScreen populates 'splitDetails' ONLY for 'unequal'.
                                    // For 'equal', we calculate it dynamically usually.
                                    // However, to store ANY value in DB, we need the number.

                                    if (newExpense.splitType === 'unequal') {
                                        amount = realSplitDetails[realId] || 0;
                                    } else {
                                        // Equal split logic: Amount / Count
                                        // participants includes self?
                                        // In AddExpense, 'splitWith' excludes self. 
                                        // 'allParticipants' here tries to include self.
                                        // Let's use the exact amounts if we can, 
                                        // but if splitDetails is empty (equal split), we calculate.
                                        const count = new Set([...(newExpense.splitWith || []), 'self']).size;
                                        amount = Number((newExpense.amount / count).toFixed(2));

                                        // Handle remainder? For MVP, simple division.
                                    }

                                    // Determine if Profile or Friend
                                    // 1. Is it a Profile? (Check profiles table - expensive here)
                                    // Better: We know if it's a UUID.
                                    // But we need to know if it goes into profile_id or friend_id column.
                                    // Strategy: Try looking up in `friends` array to see if it is a friend.
                                    // If strict realId is session.user.id -> Profile

                                    let pId = null;
                                    let fId = null;

                                    if (realId === session.user.id) {
                                        pId = realId;
                                    } else {
                                        // Check if this Real ID belongs to a friend
                                        // We have 'friends' in store, but they have 'id' (local) and 'linkedUserId' (real profile)
                                        // realId matches either friend.id (local-only friend) OR friend.linkedUserId (profile friend)

                                        const friendObj = friends.find(f => f.linkedUserId === realId);
                                        if (friendObj) {
                                            // It's a profile-linked friend
                                            pId = realId;
                                        } else {
                                            // It might be a purely local friend (where realId == localId)
                                            // OR it might be a profile ID that we just don't have locally linked?
                                            // Assume local friend ID if not found as linked
                                            const localFriend = friends.find(f => f.id === realId);
                                            if (localFriend) {
                                                fId = realId;
                                            } else {
                                                // If we can't find it in friends list, it might be a Profile ID from a Group Member we don't have as a friend?
                                                // Fallback to Profile ID if it looks like a valid UUID and not in friends list
                                                pId = realId;
                                            }
                                        }
                                    }

                                    participantsToInsert.push({
                                        expense_id: newExpense.id,
                                        profile_id: pId,
                                        friend_id: fId,
                                        amount: amount
                                    });
                                }

                                if (participantsToInsert.length > 0) {
                                    const { error: partError } = await supabase
                                        .from('expense_participants')
                                        .insert(participantsToInsert);
                                    if (partError) console.error("Participants sync error:", partError);
                                }
                            }
                        });
                    }

                    const updatedExpenses = [{ ...newExpense, createdBy: session?.user?.id }, ...state.expenses];
                    const { friends: newFriends, groups: newGroups } = calculateBalances(updatedExpenses, state.friends, state.groups);

                    // --- PROACTIVE BUDGET ALERTS LOGIC ---
                    const d = new Date();
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const currentBudget = get().budgets.find(b => b.month === monthKey);

                    let newAlertsSent = { ...state.budgetAlertsSent };
                    let alertsUpdated = false;

                    if (currentBudget && currentBudget.categories[newExpense.category]) {
                        // Calculate budget including rollover if enabled
                        let totalCategoryBudget = currentBudget.categories[newExpense.category];
                        if (get().isRolloverEnabled) {
                            // Quick rollover approx: count all past budget - past spend for this category
                            const currentMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
                            let unspent = 0;

                            get().budgets.forEach(b => {
                                const budgetDate = new Date(`${b.month}-01T00:00:00Z`);
                                if (budgetDate < currentMonthStart) {
                                    const pastBudgetAmt = b.categories[newExpense.category] || 0;

                                    const startOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
                                    const endOfThatMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0, 23, 59, 59);

                                    const pastSpend = state.expenses.filter(e => {
                                        if (e.isSettlement || e.category !== newExpense.category) return false;
                                        const eDate = new Date(e.date);
                                        return eDate >= startOfThatMonth && eDate <= endOfThatMonth;
                                    }).reduce((sum, e) => {
                                        let myShare = e.amount;
                                        if (e.splitType === 'unequal' && e.splitDetails) myShare = e.splitDetails['self'] || 0;
                                        else myShare = e.amount / ((e.splitWith?.length || 0) + 1);
                                        return sum + myShare;
                                    }, 0);

                                    unspent += (pastBudgetAmt - pastSpend);
                                }
                            });
                            totalCategoryBudget += unspent;
                        }

                        if (totalCategoryBudget > 0) {
                            // Calculate current spend for this month
                            const currentMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
                            const currentMonthSpend = updatedExpenses.filter(e => {
                                if (e.isSettlement || e.category !== newExpense.category) return false;
                                const eDate = new Date(e.date);
                                return eDate >= currentMonthStart;
                            }).reduce((sum, e) => {
                                let myShare = e.amount;
                                if (e.splitType === 'unequal' && e.splitDetails) myShare = e.splitDetails['self'] || 0;
                                else myShare = e.amount / ((e.splitWith?.length || 0) + 1);
                                return sum + myShare;
                            }, 0);

                            const percentage = (currentMonthSpend / totalCategoryBudget) * 100;
                            const catName = get().getCategoryById(newExpense.category).label;

                            const numDaysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                            const remainingDays = numDaysInMonth - d.getDate();

                            const alertKey100 = `${monthKey}-${newExpense.category}-100`;
                            const alertKey80 = `${monthKey}-${newExpense.category}-80`;

                            if (percentage >= 100 && !state.budgetAlertsSent[alertKey100]) {
                                notificationService.notifyBudgetAlert(catName, Math.round(percentage), remainingDays);
                                newAlertsSent[alertKey100] = true;
                                alertsUpdated = true;
                            } else if (percentage >= 80 && percentage < 100 && !state.budgetAlertsSent[alertKey80] && !state.budgetAlertsSent[alertKey100]) {
                                notificationService.notifyBudgetAlert(catName, Math.round(percentage), remainingDays);
                                newAlertsSent[alertKey80] = true;
                                alertsUpdated = true;
                            }
                        }
                    }

                    return {
                        expenses: updatedExpenses,
                        friends: newFriends,
                        groups: newGroups,
                        ...(alertsUpdated ? { budgetAlertsSent: newAlertsSent } : {})
                    };
                });
            },
            deleteExpense: async (id) => {
                const { session } = get();
                const expense = get().expenses.find(e => e.id === id);
                if (!expense) return;

                // Await the DB delete FIRST so any subsequent fetchData won't re-fetch it
                if (session?.user) {
                    // Check if user is the creator
                    if (expense.createdBy && expense.createdBy !== session.user.id) {
                        console.warn("⛔ Cannot delete expense: user is not the creator.", id);
                        Alert.alert("Permission Denied", "Only the person who added this expense can delete it.");
                        return;
                    }

                    console.log('🗑️ Attempting DB delete for:', id);
                    const { error, count } = await supabase.from('expenses').delete().eq('id', id);

                    if (error) {
                        console.error("❌ Error deleting expense:", error);
                        Alert.alert("Error", "Failed to delete expense from server.");
                        return;
                    }
                    console.log(`✅ DB delete successful. Rows affected: ${count}`);
                }

                // Only update local state after DB confirms deletion
                set((state) => {
                    const remainingExpenses = state.expenses.filter(e => e.id !== id);
                    const { friends: newFriends, groups: newGroups } = calculateBalances(remainingExpenses, state.friends, state.groups);
                    return { expenses: remainingExpenses, friends: newFriends, groups: newGroups };
                });
            },

            recurringExpenses: [],
            addRecurringExpense: (expense) => {
                const newId = Crypto.randomUUID();
                const now = new Date();
                const nextDue = new Date(now);
                if (expense.frequency === 'daily') nextDue.setDate(nextDue.getDate() + 1);
                if (expense.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
                if (expense.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);

                const newRecurring = {
                    ...expense,
                    id: newId,
                    nextDueDate: nextDue.toISOString(),
                    active: true
                };

                const { session } = get();
                if (session?.user) {
                    supabase.from('recurring_expenses').insert({
                        id: newId,
                        user_id: session.user.id,
                        description: expense.description,
                        amount: expense.amount,
                        payer_id: expense.payerId === 'self' ? session.user.id : expense.payerId,
                        group_id: expense.groupId,
                        category: expense.category,
                        frequency: expense.frequency,
                        next_due_date: newRecurring.nextDueDate,
                        active: true,
                        split_with: expense.splitWith,
                        split_details: expense.splitDetails,
                        split_type: expense.splitType
                    }).then(({ error }: any) => {
                        if (error) console.error("Error adding recurring expense:", error.message);
                    });
                }

                set((state) => ({
                    recurringExpenses: [...state.recurringExpenses, newRecurring]
                }));
            },
            deleteRecurringExpense: (id) => {
                const { session } = get();
                if (session?.user) {
                    supabase.from('recurring_expenses').delete().eq('id', id).then(({ error }: any) => {
                        if (error) console.error("Error deleting recurring expense:", error.message);
                    });
                }
                set((state) => ({
                    recurringExpenses: state.recurringExpenses.filter(r => r.id !== id)
                }));
            },
            checkRecurringExpenses: () => {
                const { recurringExpenses, addExpense } = get();
                const now = new Date();
                let count = 0;
                let updated = false;

                const updatedRecurring = recurringExpenses.map(r => {
                    const nextDate = new Date(r.nextDueDate);

                    if (nextDate <= now && r.active) {
                        addExpense({
                            description: r.description,
                            amount: r.amount,
                            payerId: r.payerId,
                            groupId: r.groupId,
                            splitWith: r.splitWith,
                            splitDetails: r.splitDetails,
                            splitType: r.splitType,
                            category: r.category,
                        });
                        count++;
                        updated = true;

                        const newNextDue = new Date(nextDate);
                        if (r.frequency === 'daily') newNextDue.setDate(newNextDue.getDate() + 1);
                        if (r.frequency === 'weekly') newNextDue.setDate(newNextDue.getDate() + 7);
                        if (r.frequency === 'monthly') newNextDue.setMonth(newNextDue.getMonth() + 1);

                        return { ...r, nextDueDate: newNextDue.toISOString() };
                    }
                    return r;
                });

                if (updated) {
                    set({ recurringExpenses: updatedRecurring });
                }
                return count;
            },
            deleteFriend: (id) => {
                set((state) => {
                    // Remove friend AND all expenses that only involve this friend
                    // (keep expenses that involve other friends/groups too)
                    const remainingExpenses = state.expenses.filter(e => {
                        const isSoloPayer = e.payerId === id;
                        const isOnlySplitWith = e.splitWith?.length === 1 && e.splitWith[0] === id && !e.groupId;
                        // Remove expense only if it's exclusively between self and this friend
                        return !(isSoloPayer && isOnlySplitWith) && !(isOnlySplitWith && e.payerId === 'self');
                    });
                    const remainingFriends = state.friends.filter(f => f.id !== id);
                    const { friends: newFriends, groups: newGroups } = calculateBalances(remainingExpenses, remainingFriends, state.groups);
                    return { friends: newFriends, groups: newGroups, expenses: remainingExpenses };
                });
                const { session } = get();
                if (session?.user) {
                    supabase.from('friends').delete().eq('id', id).then(({ error }: any) => {
                        if (error) console.error("Error deleting friend:", error);
                    });
                }
            },
            deleteGroup: (id) => {
                // Soft delete: hide the group for the current user by appending their ID to archived_by.
                // Other members continue to see the group normally.
                set((state) => ({
                    groups: state.groups.filter(g => g.id !== id)
                }));
                const { session } = get();
                if (session?.user) {
                    // Fetch current archived_by, append current user, then update
                    supabase
                        .from('groups')
                        .select('archived_by')
                        .eq('id', id)
                        .single()
                        .then(({ data }: any) => {
                            const current: string[] = data?.archived_by || [];
                            if (!current.includes(session.user.id)) {
                                supabase
                                    .from('groups')
                                    .update({ archived_by: [...current, session.user.id] })
                                    .eq('id', id)
                                    .then(({ error }: any) => {
                                        if (error) console.error('Error archiving group:', error);
                                    });
                            }
                        });
                }
            },
            editGroup: (id, name, members) => {
                set((state) => ({
                    groups: state.groups.map(g =>
                        g.id === id ? { ...g, name, members } : g
                    )
                }));
                const { session } = get();
                if (session?.user) {
                    // Update name
                    supabase.from('groups').update({ name }).eq('id', id).then(({ error }: any) => {
                        if (error) console.error("Error updating group:", error);
                    });

                    // Update members (Clear and re-add for simplicity in MVP)
                    supabase.from('group_members').delete().eq('group_id', id).then(() => {
                        const memberInserts = [
                            { group_id: id, user_id: session.user.id }, // Always include self
                            ...members
                                .filter(mId => mId !== 'self')
                                .map(mId => {
                                    const friend = get().friends.find(f => f.id === mId);
                                    return friend?.linkedUserId ? { group_id: id, user_id: friend.linkedUserId } : null;
                                })
                                .filter((m): m is { group_id: string, user_id: string } => m !== null)
                        ];
                        // Filtering out 'self' and mapping to actual UUIDs. 
                        // Note: If friend is local, we might need a separate way to track group members 
                        // but the current schema uses profiles(id). For now, syncing what we can.
                        supabase.from('group_members').insert(memberInserts).then();
                    });
                }
            },
            subscribeToChanges: () => {
                const { session, notificationsEnabled, fetchData, formatCurrency } = get();
                if (!session?.user) return () => { };

                const channel = supabase
                    .channel('realtime-updates')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'expenses',
                        },
                        (payload: any) => {
                            const eventData = payload.new as any || payload.old as any;
                            console.log('🔔 Real-time Expense Event:', payload.eventType, eventData?.id);

                            if (payload.eventType === 'INSERT') {
                                const newExp = payload.new as any;
                                const currentSession = get().session;
                                if (currentSession?.user && newExp.created_by !== currentSession.user.id && notificationsEnabled) {
                                    const payer = get().friends.find(f => f.id === newExp.payer_id);
                                    const payerName = newExp.payer_name || (newExp.payer_id === currentSession.user.id ? 'You' : (payer?.name || 'Someone'));
                                    notificationService.notifyNewExpense(payerName, newExp.description, newExp.amount.toString(), 'calculating...');
                                }
                            }

                            if (payload.eventType === 'DELETE') {
                                const deletedId = (payload.old as any)?.id;
                                if (deletedId) {
                                    console.log('🗑️ Local removal of deleted expense:', deletedId);
                                    set((state) => {
                                        const remaining = state.expenses.filter(e => e.id !== deletedId);
                                        const { friends: newFriends, groups: newGroups } = calculateBalances(remaining, state.friends, state.groups);
                                        return { expenses: remaining, friends: newFriends, groups: newGroups };
                                    });
                                }
                            }


                            // Only refresh from server for events that we can't fully handle locally
                            const currentSession = get().session;
                            const isMyChange = currentSession?.user && (
                                (payload.new as any)?.created_by === currentSession.user.id || 
                                (payload.old as any)?.created_by === currentSession.user.id
                            );

                            // OPTIMISTIC LOCAL UPDATE for instant sync
                            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                                const newRow = payload.new as any;
                                if (currentSession?.user) {
                                    set((state) => {
                                        const mappedExpense = mapRowToExpense(newRow, state.friends, currentSession.user.id);
                                    let updatedExpenses = [...state.expenses];
                                    
                                    const index = updatedExpenses.findIndex(e => e.id === mappedExpense.id);
                                    if (index >= 0) {
                                        updatedExpenses[index] = mappedExpense;
                                    } else {
                                        updatedExpenses = [mappedExpense, ...updatedExpenses];
                                    }

                                    const { friends: newFriends, groups: newGroups } = calculateBalances(updatedExpenses, state.friends, state.groups);
                                    return { 
                                        expenses: updatedExpenses, 
                                        friends: newFriends, 
                                        groups: newGroups 
                                    };
                                });
                                }
                            }

                            // Refresh for:
                            // 1. Any UPDATE (to get latest metadata/calculations from server)
                            // 2. INSERTs from other users
                            if (payload.eventType === 'UPDATE' || (payload.eventType === 'INSERT' && !isMyChange)) {
                                console.log('🔄 Debouncing fetchData due to expense event...');
                                if (fetchDataTimeout) clearTimeout(fetchDataTimeout);
                                fetchDataTimeout = setTimeout(() => {
                                    fetchData();
                                }, 1500); // 1.5s debounce to catch bulk updates
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'friends',
                        },
                        (payload: any) => {
                            const eventData = payload.new as any || payload.old as any;
                            console.log('🔔 Real-time Friend change:', payload.eventType, eventData?.id);

                            if (payload.eventType === 'DELETE') {
                                const deletedId = (payload.old as any)?.id;
                                if (deletedId) {
                                    console.log('🗑️ Local removal of deleted friend:', deletedId);
                                    set((state) => ({
                                        friends: state.friends.filter(f => f.id !== deletedId)
                                    }));
                                }
                            }
                            const currentSession = get().session;
                            const isMyFriend = currentSession?.user && (eventData)?.user_id === currentSession.user.id;

                            if (isMyFriend) {
                                if (payload.eventType === 'UPDATE') {
                                    const updatedData = payload.new as any;
                                    set((state) => ({
                                        friends: state.friends.map(f =>
                                            f.id === updatedData.id ? {
                                                ...f,
                                                name: updatedData.name,
                                                avatarUrl: updatedData.linked_user_id ? f.avatarUrl : updatedData.avatar_url
                                            } : f
                                        )
                                    }));
                                    // Skip fetchData for simple updates to avoid race conditions with UI
                                } else if (payload.eventType === 'INSERT') {
                                    fetchData();
                                }
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'groups',
                        },
                        (payload: any) => {
                            // Re-fetch when archived_by changes so the group disappears
                            // for the archiving user and stays for others
                            console.log('🔔 Real-time Group update:', (payload.new as any)?.id);
                            fetchData();
                        }
                    )
                    .subscribe((status: string) => {
                        console.log('📡 Real-time Subscription Status:', status);
                        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            console.warn('⚠️ Real-time channel dropped, reconnecting in 3s...');
                            supabase.removeChannel(channel);
                            setTimeout(() => {
                                get().fetchData();
                                get().subscribeToChanges();
                            }, 3000);
                        }
                    });

                const activityChannel = supabase
                    .channel('activity-logs')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'activity_logs',
                            filter: `user_id=eq.${get().session?.user?.id}`
                        },
                        (payload: any) => {
                            console.log('🔔 Real-time Activity Log:', payload.new);
                            set((state) => ({
                                activities: [payload.new as ActivityLog, ...state.activities]
                            }));
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                    supabase.removeChannel(activityChannel);
                };
            },
        }),
        {
            name: 'splitty-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => {
                const { session, ...rest } = state;
                return rest;
            },
        }
    )
);
