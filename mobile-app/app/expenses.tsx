import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Camera, MapPin, IndianRupee, FileText, Send } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

// Casting icons to 'any' to bypass strict linting issues
const CameraIcon = Camera as any;
const MapPinIcon = MapPin as any;
const IndianRupeeIcon = IndianRupee as any;
const FileTextIcon = FileText as any;
const SendIcon = Send as any;

export default function ExpensesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const categories = ['Travel', 'Food', 'Stay', 'Fuel', 'Other'];

    async function submitExpense() {
        if (!user || !amount) {
            Alert.alert('Error', 'Please enter an amount.');
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
                    category: category || 'General',
                    description,
                    location_tagged: point,
                    status: 'pending',
                });

            if (error) throw error;

            Alert.alert('Success', 'Expense submitted successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message);
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
                        <IndianRupeeIcon size={24} color="#3b82f6" />
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
                    <Text style={styles.label}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setCategory(cat)}
                                style={[styles.categoryTag, category === cat && styles.categoryTagActive]}
                            >
                                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <View style={styles.textAreaContainer}>
                        <FileTextIcon size={20} color="#52525b" style={styles.textAreaIcon} />
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
                    <CameraIcon size={24} color="#3b82f6" />
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
                        <SendIcon size={20} color="white" />
                        <Text style={styles.submitBtnText}>Submit Expense</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <MapPinIcon size={14} color="#71717a" />
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
    categoryText: { color: '#a1a1aa', fontWeight: '600' },
    categoryTextActive: { color: '#3b82f6' },
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
