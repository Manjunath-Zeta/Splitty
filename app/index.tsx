import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0F172A" />
        </View>
    );
}
