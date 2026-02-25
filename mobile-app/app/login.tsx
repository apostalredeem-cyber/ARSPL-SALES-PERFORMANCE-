import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { Feather } from '@expo/vector-icons';


export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function signInWithEmail() {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
                    setError('Network error: Please check your internet connection and try again.');
                } else if (error.message.toLowerCase().includes('email not confirmed')) {
                    setError('Email not confirmed. Please ask admin to confirm your account in Supabase.');
                } else if (error.message.toLowerCase().includes('invalid login credentials')) {
                    setError('Incorrect email or password. Please try again.');
                } else {
                    setError(error.message);
                }
                setLoading(false);
            }
        } catch (e: any) {
            setError('Connection failed: ' + (e?.message ?? 'Unknown error. Check your internet.'));
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../assets/arspl_logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to start tracking your day</Text>
                </View>

                <View style={styles.form}>
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => setEmail(text)}
                            value={email}
                            placeholder="employee@arspl.com"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => setPassword(text)}
                            value={password}
                            placeholder="••••••••"
                            placeholderTextColor="#666"
                            secureTextEntry={true}
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={() => signInWithEmail()}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footerText}>
                    Apostolic Redeem Pvt. Ltd. &copy; 2026
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#a1a1aa',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#a1a1aa',
        letterSpacing: 1,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonDisabled: {
        backgroundColor: '#27272a',
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorContainer: {
        backgroundColor: 'rgba(127, 29, 29, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(185, 28, 28, 0.5)',
        padding: 12,
        borderRadius: 12,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
    },
    footerText: {
        textAlign: 'center',
        color: '#52525b',
        fontSize: 12,
        marginTop: 40,
    },
});
