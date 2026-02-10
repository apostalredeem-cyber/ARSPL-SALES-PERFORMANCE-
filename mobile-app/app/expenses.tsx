import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';


export default function ExpensesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [expenseType, setExpenseType] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const expenseTypes = [
        { value: 'travel', label: 'Travel', disabled: true, tooltip: 'Auto-generated from GPS' },
        { value: 'food', label: 'Food', disabled: false },
        { value: 'hotel', label: 'Hotel', disabled: false },
        { value: 'fuel', label: 'Fuel', disabled: false },
        { value: 'other', label: 'Other', disabled: false },
    ];

    async function submitExpense() {
        // Validation
        if (!user) {
            Alert.alert('Error', 'You must be logged in to submit expenses.');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid amount.');
            return;
        }

        if (!expenseType) {
            Alert.alert('Validation Error', 'Please select an expense type.');
            return;
        }

        if (expenseType === 'travel') {
            Alert.alert('Not Allowed', 'Travel expenses are auto-generated from GPS tracking. Please select another expense type.');
            return;
        }

        if (!expenseDate) {
            Alert.alert('Validation Error', 'Please select an expense date.');
            return;
        }

        // Prevent backdating more than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const selectedDate = new Date(expenseDate);

        if (selectedDate < sevenDaysAgo) {
            Alert.alert('Validation Error', 'Cannot create expenses older than 7 days.');
            return;
        }

        setSubmitting(true);
        try {
            const location = await Location.getCurrentPositionAsync({});
            const point = `POINT(${location.coords.longitude} ${location.coords.latitude})`;

            const { error } = await (supabase as any)
                .from('expenses')
                .insert({
                    user_id: user.id,
                    amount: parseFloat(amount),
                    expense_type: expenseType,
                    expense_date: expenseDate,
                    category: category || null,
                    description,
                    location_tagged: point,
                    status: 'pending',
                    is_auto_generated: false,
                });

            if (error) {
                // User-friendly error messages
                if (error.message.includes('Travel expenses are auto-generated')) {
                    throw new Error('Travel expenses are calculated automatically from GPS tracking.');
                } else if (error.message.includes('older than 7 days')) {
                    throw new Error('Cannot create expenses older than 7 days.');
                } else {
                    throw error;
                }
            }

            Alert.alert('Success', 'Expense submitted successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to submit expense. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Log Expense</Text>
                <Text style={styles.subtitle}>Submit bills for reimbursement</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>AMOUNT (INR)</Text>
                    <View style={styles.amountInputContainer}>
                        <FontAwesome name="rupee" size={24} color="#3b82f6" />
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor="#52525b"
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>EXPENSE TYPE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {expenseTypes.map(type => (
                            <TouchableOpacity
                                key={type.value}
                                onPress={() => !type.disabled && setExpenseType(type.value)}
                                style={[
                                    styles.categoryTag,
                                    expenseType === type.value && styles.categoryTagActive,
                                    type.disabled && styles.categoryTagDisabled
                                ]}
                                disabled={type.disabled}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    expenseType === type.value && styles.categoryTextActive,
                                    type.disabled && styles.categoryTextDisabled
                                ]}>
                                    {type.label}
                                </Text>
                                {type.disabled && (
                                    <Text style={styles.disabledTooltip}>🔒 {type.tooltip}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>EXPENSE DATE</Text>
                    <TextInput
                        style={styles.dateInput}
                        value={expenseDate}
                        onChangeText={setExpenseDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#52525b"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <View style={styles.textAreaContainer}>
                        <Feather name="file-text" size={20} color="#52525b" style={styles.textAreaIcon} />
                        <TextInput
                            style={styles.textArea}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What was this expense for?"
                            placeholderTextColor="#52525b"
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.photoBtn}>
                    <Feather name="camera" size={24} color="#3b82f6" />
                    <Text style={styles.photoBtnText}>Upload Bill / Receipt</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.disabledBtn]}
                onPress={submitExpense}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Feather name="send" size={20} color="white" />
                        <Text style={styles.submitBtnText}>Submit Expense</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Feather name="map-pin" size={14} color="#71717a" />
                <Text style={styles.infoText}>Your current location will be tagged automatically.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
    card: { backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#27272a', gap: 24 },
    inputGroup: { gap: 12 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#52525b', letterSpacing: 1 },
    amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 20, height: 70 },
    amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', color: '#fff', marginLeft: 12 },
    categoryScroll: { flexDirection: 'row' },
    categoryTag: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#27272a', borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
    categoryTagActive: { backgroundColor: '#2563eb20', borderColor: '#2563eb' },
    categoryTagDisabled: { backgroundColor: '#18181b', borderColor: '#27272a', opacity: 0.5 },
    categoryText: { color: '#a1a1aa', fontWeight: '600' },
    categoryTextActive: { color: '#3b82f6' },
    categoryTextDisabled: { color: '#52525b' },
    disabledTooltip: { color: '#71717a', fontSize: 9, marginTop: 2 },
    dateInput: { backgroundColor: '#09090b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 20, height: 56, color: '#fff', fontSize: 16 },
    textAreaContainer: { flexDirection: 'row', backgroundColor: '#09090b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 16, minHeight: 100 },
    textAreaIcon: { marginTop: 2 },
    textArea: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 12, textAlignVertical: 'top' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#3b82f610', borderWidth: 1, borderStyle: 'dashed', borderColor: '#3b82f6', borderRadius: 16, padding: 20 },
    photoBtnText: { color: '#3b82f6', fontWeight: 'bold' },
    submitBtn: { flexDirection: 'row', backgroundColor: '#2563eb', borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 12 },
    disabledBtn: { backgroundColor: '#27272a', opacity: 0.7 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
    infoText: { color: '#71717a', fontSize: 11 }
});
