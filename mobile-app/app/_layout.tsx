import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function RootLayoutNav() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'login';

        if (!user && !inAuthGroup) {
            // Redirect to the login page if the user is not authenticated
            router.replace('/login');
        } else if (user && inAuthGroup) {
            // Redirect away from the login page if the user is authenticated
            router.replace('/');
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="login" options={{ title: 'Login' }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </ErrorBoundary>
    );
}
