import { Tabs } from 'expo-router';
import { Home, Users, LayoutGrid, Settings, Wallet } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import { useSplittyStore } from '../../store/useSplittyStore';
import { Skeuomorphic } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabsLayout() {
    const appearance = useSplittyStore(s => s.appearance);
    const colors = useSplittyStore(s => s.colors);
    const designPreference = useSplittyStore(s => s.designPreference);
    const isDark = appearance === 'dark';
    const isSkeuomorphic = designPreference === 'skeuomorphic';
    const skeuo = isDark ? Skeuomorphic.dark : Skeuomorphic.light;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: isSkeuomorphic ? {
                    position: 'absolute',
                    bottom: Platform.OS === 'ios' ? 30 : 20,
                    left: 16,
                    right: 16,
                    height: 74, // Increased height for labels
                    borderRadius: 37, // Half of height
                    backgroundColor: skeuo.background,
                    borderTopWidth: 0,
                    ...skeuo.outset.dark,
                    shadowOffset: { width: 0, height: 10 },
                    shadowRadius: 20,
                    elevation: 10,
                } : {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                },
                tabBarBackground: isSkeuomorphic ? () => (
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 37, overflow: 'hidden' }]}>
                        <View style={[StyleSheet.absoluteFill, skeuo.outset.light, { borderRadius: 37 }]} />
                        <LinearGradient
                            colors={skeuo.surfaceGradient}
                            style={[StyleSheet.absoluteFill, { borderRadius: 37 }]}
                        />
                    </View>
                ) : undefined,
                headerStyle: {
                    backgroundColor: isSkeuomorphic ? skeuo.background : colors.background,
                },
                headerTitleStyle: {
                    color: colors.text,
                    fontWeight: 'bold',
                },
                headerShadowVisible: false,
                tabBarShowLabel: true, // Labels should be visible
                tabBarLabelStyle: isSkeuomorphic ? {
                    marginBottom: 8,
                    fontSize: 10,
                    fontWeight: '600',
                } : undefined,
                tabBarItemStyle: isSkeuomorphic ? {
                    paddingTop: 8,
                } : undefined,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={isSkeuomorphic && focused ? [styles.activeTabIconSkeuo, skeuo.inset.dark] : null}>
                            <View style={isSkeuomorphic && focused ? [styles.activeTabIconInner, skeuo.inset.light] : null}>
                                <LayoutGrid color={color} size={isSkeuomorphic ? size - 2 : size} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="friends"
                options={{
                    title: 'Friends',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={isSkeuomorphic && focused ? [styles.activeTabIconSkeuo, skeuo.inset.dark] : null}>
                            <View style={isSkeuomorphic && focused ? [styles.activeTabIconInner, skeuo.inset.light] : null}>
                                <Users color={color} size={isSkeuomorphic ? size - 2 : size} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="groups"
                options={{
                    title: 'Groups',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={isSkeuomorphic && focused ? [styles.activeTabIconSkeuo, skeuo.inset.dark] : null}>
                            <View style={isSkeuomorphic && focused ? [styles.activeTabIconInner, skeuo.inset.light] : null}>
                                <Home color={color} size={isSkeuomorphic ? size - 2 : size} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="budgets"
                options={{
                    title: 'Budgets',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={isSkeuomorphic && focused ? [styles.activeTabIconSkeuo, skeuo.inset.dark] : null}>
                            <View style={isSkeuomorphic && focused ? [styles.activeTabIconInner, skeuo.inset.light] : null}>
                                <Wallet color={color} size={isSkeuomorphic ? size - 2 : size} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={isSkeuomorphic && focused ? [styles.activeTabIconSkeuo, skeuo.inset.dark] : null}>
                            <View style={isSkeuomorphic && focused ? [styles.activeTabIconInner, skeuo.inset.light] : null}>
                                <Settings color={color} size={isSkeuomorphic ? size - 2 : size} />
                            </View>
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeTabIconSkeuo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'transparent',
    },
    activeTabIconInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
