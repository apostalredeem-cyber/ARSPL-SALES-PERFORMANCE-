import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import * as Location from 'expo-location';

export default function VisitReportScreen() {
    const { leadId, leadName } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState({
        lead_type: 'follow-up',
        discussion: '',
        outcome: 'follow-up',
        next_action_date: '',
    });

    async function handleSubmit() {
        if (!report.discussion) {
            Alert.alert('Required', 'Please enter discussion summary.');
            return;
        }

        setLoading(true);
        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const point = `POINT(${location.coords.longitude} ${location.coords.latitude})`;

            const { error } = await (supabase as any)
                .from('visit_reports')
                .insert({
                    lead_id: leadId,
                    staff_id: user?.id,
                    lead_type: report.lead_type,
                    discussion: report.discussion,
                    outcome: report.outcome,
                    next_action_date: report.next_action_date || null,
                    location: point,
                });

            if (error) throw error;

            Alert.alert('Success', 'Visit report submitted successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.subtitle}>REPORTING FOR</Text>
                <Text style={styles.title}>{leadName}</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Lead Type</Text>
                <View style={styles.pickerRow}>
                    {['new', 'follow-up', 'conversion', 'support'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.pickerItem, report.lead_type === type && styles.pickerActive]}
                            onPress={() => setReport({ ...report, lead_type: type })}
                        >
                            <Text style={[styles.pickerText, report.lead_type === type && styles.pickerTextActive]}>
                                {type.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Discussion Summary</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="What did you discuss with the client?"
                    placeholderTextColor="#52525b"
                    value={report.discussion}
                    onChangeText={(txt) => setReport({ ...report, discussion: txt })}
                />

                <Text style={styles.label}>Outcome</Text>
                <View style={[styles.pickerRow, { flexWrap: 'wrap' }]}>
                    {['interested', 'not-interested', 'follow-up', 'closed'].map((out) => (
                        <TouchableOpacity
                            key={out}
                            style={[styles.pickerItem, report.outcome === out && styles.pickerActive]}
                            onPress={() => setReport({ ...report, outcome: out })}
                        >
                            <Text style={[styles.pickerText, report.outcome === out && styles.pickerTextActive]}>
                                {out.replace('-', ' ').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Report</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    subtitle: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
    title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    form: { gap: 20 },
    label: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    pickerRow: { flexDirection: 'row', gap: 8 },
    pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' },
    pickerActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    pickerText: { color: '#71717a', fontSize: 10, fontWeight: 'bold' },
    pickerTextActive: { color: '#fff' },
    textArea: { backgroundColor: '#18181b', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, minHeight: 120, textAlignVertical: 'top' },
    submitButton: { backgroundColor: '#3b82f6', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
