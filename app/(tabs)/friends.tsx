import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, RefreshControl, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Themes, ThemeName, Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { StyledInput } from '../../components/StyledInput';
import { VibrantButton } from '../../components/VibrantButton';
import { useSplittyStore } from '../../store/useSplittyStore';
import { UserPlus, Banknote, Users } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { InitialsAvatar } from '../../components/InitialsAvatar';
import * as Haptics from 'expo-haptics';
import { Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/EmptyState';
// Removed static import to prevent fatal crash if native module is missing
// import * as Contacts from 'expo-contacts';
import parsePhoneNumber from 'libphonenumber-js';

console.log('EVAL: friends.tsx loaded');
export default function FriendsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const friends = useSplittyStore(s => s.friends);
    const addFriend = useSplittyStore(s => s.addFriend);
    const appearance = useSplittyStore(s => s.appearance);
    const colors = useSplittyStore(s => s.colors);
    const formatCurrency = useSplittyStore(s => s.formatCurrency);
    const settleUp = useSplittyStore(s => s.settleUp);
    const fetchData = useSplittyStore(s => s.fetchData);
    const designPreference = useSplittyStore(s => s.designPreference);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
    const [contactPermission, setContactPermission] = useState<boolean | null>(null);

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                // Dynamic require to prevent evaluation error
                const Contacts = require('expo-contacts');
                if (!Contacts?.requestPermissionsAsync) {
                    console.warn('ExpoContacts native module is missing.');
                    setContactPermission(false);
                    return;
                }
                const { status } = await Contacts.requestPermissionsAsync();
                setContactPermission(status === 'granted');
                if (status === 'granted') {
                    const { data } = await Contacts.getContactsAsync({
                        fields: [Contacts.Fields.PhoneNumbers],
                    });
                    if (data && data.length > 0) {
                        setDeviceContacts(data);
                    }
                }
            } catch (e) {
                console.warn('Failed to load ExpoContacts dynamically:', e);
                setContactPermission(false);
            }
        };
        fetchContacts();
    }, []);

    const filteredContacts = useMemo(() => {
        if (!inputValue.trim() || inputValue.length < 1) return [];
        const lowerInput = inputValue.toLowerCase();
        
        return deviceContacts.filter(c => {
            const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '';
            if (name.toLowerCase().includes(lowerInput)) return true;
            
            const phoneStr = (c.phoneNumbers as any[])?.map((p: any) => p.number?.replace(/\D/g, '')).join(' ') || '';
            const searchDigits = inputValue.replace(/\D/g, '');
            if (searchDigits && phoneStr.includes(searchDigits)) return true;

            return false;
        }).slice(0, 5);
    }, [inputValue, deviceContacts]);

    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const isDark = appearance === 'dark';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleAddFriend = async () => {
        if (!inputValue.trim()) return;
        setLoading(true);

        const input = inputValue.trim();
        let foundUser: any = null;

        try {
            // Check if input looks like phone (digits > 9)
            const digitsOnly = input.replace(/\D/g, '');
            if (digitsOnly.length >= 10) {
                const { data, error } = await supabase.rpc('lookup_user_by_phone', { search_phone: digitsOnly });
                if (data) foundUser = data;
            }

            if (foundUser) {
                Alert.alert(
                    "User Found!",
                    `Add ${foundUser.full_name || 'User'} (${input}) as a friend?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Add Friend",
                            onPress: () => {
                                addFriend(foundUser.full_name || input, foundUser.id);
                                setInputValue('');
                            }
                        }
                    ]
                );
            } else {
                // Not found - Ask to add as local-only
                Alert.alert(
                    "User Not Found",
                    `We couldn't find a registered user with ${input}. Add as a local-only friend?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Add Local Friend",
                            onPress: () => {
                                addFriend(input);
                                setInputValue('');
                            }
                        }
                    ]
                );
            }
        } catch (err) {
            console.log(err);
            Alert.alert("Error", "Something went wrong searching for user.");
        } finally {
            setLoading(false);
        }
    };

    const processContactData = async (contact: any) => {
        try {
            setIsImporting(true);
            const phoneNumberRaw = contact.phoneNumbers?.[0]?.number;

            if (!phoneNumberRaw) {
                Alert.alert("No Phone Number", "This contact doesn't have a phone number.");
                setIsImporting(false);
                return;
            }

            // Parse and format to E.164 (like '+14155552671')
            // Using a default country if parsing fails locally (assume US or let library detect if country code included)
            let normalizedNumber = phoneNumberRaw.replace(/\s+/g, '');
            try {
                const phoneNumber = parsePhoneNumber(phoneNumberRaw, 'US'); // Fallback country 'US'
                if (phoneNumber) {
                    normalizedNumber = phoneNumber.number as string; // E.164 format
                }
            } catch (e) {
                console.warn("Phone number parsing failed, falling back to stripped number", e);
            }

            const resolvedName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
            const contactName = contact.name || resolvedName || contact.company || 'Unknown Contact';

            // Check if phone number is registered in Supabase
            const { data: matchedUser, error } = await supabase.rpc('lookup_user_by_phone', { search_phone: normalizedNumber });

            if (matchedUser && matchedUser.id) {
                // Prevent duplicate linked friends
                const existingLinkedFriend = friends.find(f => f.linkedUserId === matchedUser.id);
                if (existingLinkedFriend) {
                    Alert.alert(
                        "Already Friends!",
                        `${contactName} is already in your friends list as ${existingLinkedFriend.name}.`
                    );
                    return;
                }

                // Link them!
                addFriend(contactName, matchedUser.id);
                setInputValue('');
                Alert.alert("User Found!", `${contactName} was found as a registered Splitty user and added!`);
            } else {
                // Not found -> Local friend
                // Prevent duplicate local friends
                const existingLocalFriend = friends.find(f => f.name.toLowerCase() === contactName.toLowerCase());
                if (existingLocalFriend) {
                     Alert.alert(
                        "Already Friends!",
                        `You already have a friend named ${existingLocalFriend.name}.`
                    );
                    setInputValue('');
                    return;
                }

                addFriend(contactName);
                setInputValue('');
                Alert.alert("Added Local Friend", `${contactName} doesn't seem to be verified on Splitty. Added as a local friend.`);
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not import contact.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportFromPicker = async () => {
        try {
            const Contacts = require('expo-contacts');
            if (!Contacts?.requestPermissionsAsync) {
                Alert.alert("Module Missing", "The contacts module is not available on this build.");
                return;
            }
            if (contactPermission !== true) {
                const { status } = await Contacts.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Denied", "We need access to your contacts to import friends.");
                    return;
                }
                setContactPermission(true);
            }
            const contact = await Contacts.presentContactPickerAsync();
            if (contact) {
                await processContactData(contact);
            }
        } catch (e) {
            console.warn("Failed to open contact picker dynamically:", e);
        }
    };




    const handleSettleUp = (friend: { id: string, name: string, balance: number }) => {
        const amount = Math.abs(friend.balance);
        const isUserOwed = friend.balance > 0;

        Alert.alert(
            "Settle Up",
            isUserOwed
                ? `Did ${friend.name} pay you ${formatCurrency(amount)}?`
                : `Did you pay ${friend.name} ${formatCurrency(amount)}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Settle Up",
                    style: "default",
                    onPress: () => {
                        if (isUserOwed) {
                            settleUp(friend.id, 'self', amount);
                        } else {
                            settleUp('self', friend.id, amount);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: isSkeuomorphic ? skeuo.background : colors.background, paddingTop: insets.top }]}>
            <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
                <View style={isSkeuomorphic ? [styles.skeuoAddWrapper, skeuo.outset.light] : null}>
                    <View style={isSkeuomorphic ? [styles.skeuoAddInner, skeuo.outset.dark] : null}>
                        <LinearGradient
                            colors={isSkeuomorphic ? skeuo.surfaceGradient : ['transparent', 'transparent']}
                            style={[styles.addCard, !isSkeuomorphic && { backgroundColor: colors.surface }]}
                        >
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Friend</Text>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13 }}>
                                Search by phone to link real users. If not found, they'll be added locally.
                            </Text>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <StyledInput
                                        placeholder="Name or Phone"
                                        value={inputValue}
                                        onChangeText={setInputValue}
                                        containerStyle={{ marginBottom: 0 }}
                                        style={{ backgroundColor: isSkeuomorphic ? 'transparent' : colors.inputBackground, color: colors.text }}
                                        placeholderTextColor={colors.textSecondary}
                                        autoCapitalize="none"
                                        rightAccessory={
                                            <Pressable onPress={handleImportFromPicker} disabled={isImporting || loading} hitSlop={10}>
                                                <Users color={colors.primary} size={20} style={{ opacity: (isImporting || loading) ? 0.5 : 1 }} />
                                            </Pressable>
                                        }
                                    />
                                </View>
                                <VibrantButton
                                    onPress={handleAddFriend}
                                    style={styles.smallAddButton}
                                    variant="primary"
                                    disabled={loading || isImporting}
                                    leftIcon={<UserPlus color="white" size={20} />}
                                />
                            </View>
                            {filteredContacts.length > 0 && (
                                <View style={[styles.inlineContactsDropdown, { backgroundColor: isSkeuomorphic ? skeuo.surface : colors.inputBackground }]}>
                                    {filteredContacts.map((contact, index) => {
                                        const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown Contact';
                                        const phone = contact.phoneNumbers?.[0]?.number || '';
                                        return (
                                            <Pressable 
                                                key={(contact as any).id || index.toString()} 
                                                style={[styles.inlineContactRow, index < filteredContacts.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                                                onPress={() => processContactData(contact)}
                                                disabled={isImporting}
                                            >
                                                <View style={[styles.inlineContactAvatar, { backgroundColor: colors.primary }]}>
                                                    <Text style={{color: 'white', fontWeight: 'bold'}}>{name.charAt(0).toUpperCase()}</Text>
                                                </View>
                                                <View style={{flex: 1}}>
                                                    <Text style={[styles.inlineContactName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{phone}</Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}
                        </LinearGradient>
                    </View>
                </View>

                <View style={[styles.listContainer, { flex: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Friends</Text>
                    {isSkeuomorphic ? (
                        <View style={[styles.skeuoListWrapper, skeuo.outset.light]}>
                            <View style={[styles.skeuoListInner, skeuo.outset.dark]}>
                                <View style={[styles.skeuoListContent, { backgroundColor: skeuo.background }]}>
                                    <FlatList
                                        data={friends}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item, index }) => (
                                            <React.Fragment key={item.id}>
                                                <Pressable
                                                    style={({ pressed }) => [styles.friendCard, { opacity: pressed ? 0.8 : 1 }]}
                                                    onPress={() => router.push({ pathname: '/friend-details/[id]', params: { id: item.id } })}
                                                >
                                                    <View style={{ marginRight: 16 }}>
                                                        <InitialsAvatar
                                                            name={item.name}
                                                            avatarUrl={item.avatarUrl}
                                                            size={44}
                                                            isLocal={!item.linkedUserId}
                                                        />
                                                    </View>
                                                    <View style={styles.friendInfo}>
                                                        <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
                                                        <Text style={[
                                                            styles.friendBalance,
                                                            { color: item.balance >= 0 ? colors.success : colors.accent }
                                                        ]}>
                                                            {item.balance >= 0 ? `Owes you ${formatCurrency(item.balance)}` : `You owe ${formatCurrency(Math.abs(item.balance))}`}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        {Math.abs(item.balance) > 0.01 && (
                                                            <VibrantButton
                                                                onPress={() => {
                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    handleSettleUp(item);
                                                                }}
                                                                variant="outline"
                                                                style={styles.settleUpButton}
                                                                leftIcon={<Banknote size={20} color={colors.success} />}
                                                            />
                                                        )}
                                                    </View>
                                                </Pressable>
                                                {index < friends.length - 1 && (
                                                    <View style={[styles.separator, { backgroundColor: colors.border + '20' }]} />
                                                )}
                                            </React.Fragment>
                                        )}
                                        ListEmptyComponent={
                                            <EmptyState
                                                icon={UserPlus}
                                                title="No Friends Yet"
                                                message="Search for friends by email or phone to start splitting bills."
                                            />
                                        }
                                        contentContainerStyle={{ paddingBottom: 20 }}
                                        refreshControl={
                                            <RefreshControl
                                                refreshing={refreshing}
                                                onRefresh={handleRefresh}
                                                tintColor={colors.primary}
                                            />
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <FlatList
                            data={friends}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={({ pressed }) => [[styles.cardWrapper, { backgroundColor: colors.surface }], { opacity: pressed ? 0.8 : 1 }]}
                                    onPress={() => router.push({ pathname: '/friend-details/[id]', params: { id: item.id } })}
                                >
                                    <View style={styles.friendCard}>
                                        <View style={{ marginRight: 16 }}>
                                            <InitialsAvatar
                                                name={item.name}
                                                avatarUrl={item.avatarUrl}
                                                size={44}
                                                isLocal={!item.linkedUserId}
                                            />
                                        </View>
                                        <View style={styles.friendInfo}>
                                            <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
                                            <Text style={[
                                                styles.friendBalance,
                                                { color: item.balance >= 0 ? colors.success : colors.accent }
                                            ]}>
                                                {item.balance >= 0 ? `Owes you ${formatCurrency(item.balance)}` : `You owe ${formatCurrency(Math.abs(item.balance))}`}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {Math.abs(item.balance) > 0.01 && (
                                                <VibrantButton
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        handleSettleUp(item);
                                                    }}
                                                    variant="outline"
                                                    style={styles.settleUpButton}
                                                    leftIcon={<Banknote size={20} color={colors.success} />}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <EmptyState
                                    icon={UserPlus}
                                    title="No Friends Yet"
                                    message="Search for friends by email or phone to start splitting bills."
                                />
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    tintColor={colors.primary}
                                />
                            }
                        />
                    )}
                </View>
            </View >
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },
    addCard: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    smallAddButton: {
        width: 50,
        height: 50,
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderRadius: 16, // Matched to StyledInput for perfect alignment
    },
    listContainer: {
        flex: 1,
    },
    cardWrapper: {
        marginBottom: 12,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    inlineContactsDropdown: {
        marginTop: 8,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inlineContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    inlineContactAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineContactName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    listHeader: {
        paddingVertical: 12,
        marginTop: 4,
    },
    friendBalance: {
        fontSize: 14,
        marginTop: 4,
    },
    settleUpButton: {
        width: 44,
        height: 44,
        borderRadius: 18,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    skeuoAddWrapper: {
        marginBottom: 24,
        borderRadius: 24,
    },
    skeuoAddInner: {
        borderRadius: 24,
    },
    skeuoCardWrapper: {
        marginBottom: 12,
    },
    skeuoCardOuter: {
        borderRadius: 24,
    },
    skeuoCardInner: {
        borderRadius: 24,
    },
    skeuoListWrapper: {
        borderRadius: 24,
        flex: 1,
        marginBottom: 20,
    },
    skeuoListInner: {
        borderRadius: 24,
        flex: 1,
    },
    skeuoListContent: {
        borderRadius: 24,
        flex: 1,
        overflow: 'hidden',
    },
    separator: {
        height: 1,
        marginHorizontal: 16,
    },
});
