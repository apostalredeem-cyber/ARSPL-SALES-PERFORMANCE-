import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVisitReports } from '../src/hooks/useVisitReports';
import { Feather, FontAwesome } from '@expo/vector-icons';


export default function VisitReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { submitReport, loading, error: submitError } = useVisitReports();

    const { leadName, sequence, workPlanId, meetingId } = params;

    const [status, setStatus] = useState<'Completed' | 'Not Completed'>('Completed');
    const [summary, setSummary] = useState('');
    const [outcome, setOutcome] = useState<'Interested' | 'Quotation Given' | 'Order Confirmed' | 'No Interest' | null>(null);
    const [orderValue, setOrderValue] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!summary.trim()) {
            Alert.alert('Incomplete Report', 'Please provide a brief discussion summary.');
            return;
        }

        if (status === 'Completed' && !outcome) {
            Alert.alert('Incomplete Report', 'Please select a meeting outcome.');
            return;
        }

        setSubmitting(true);

        try {
            const reportData = {
                meeting_id: meetingId as string,
                status,
                discussion_summary: summary,
                outcome: outcome || undefined,
                order_value: parseFloat(orderValue) || 0,
                expected_order_date: expectedDate || undefined,
            };

            const result = await submitReport(reportData);

            if (result && (result as any).error === 'duplicate') {
                Alert.alert('Already Submitted', (result as any).message);
                setSubmitting(false);
                return;
            }

            if (result) {
                Alert.alert(
                    'Report Submitted',
                    'Visit report has been saved and pipeline updated.',
                    [{ text: 'OK', onPress: () => router.replace('/') }]
                );
            } else if (submitError) {
                Alert.alert('Submission Failed', submitError);
            }
        } catch (err: any) {
            Alert.alert('Submission Failed', err.message || 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Visit Report</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.leadCard}>
                <View style={styles.leadBadge}>
                    <Text style={styles.leadSeq}>#{sequence}</Text>
                </View>
                <View>
                    <Text style={styles.leadTitle}>{leadName}</Text>
                    <Text style={styles.leadSubtitle}>Daily Work Plan Meeting</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>MEETING STATUS</Text>
                <View style={styles.statusRow}>
                    <TouchableOpacity
                        style={[styles.statusOption, status === 'Completed' && styles.statusActive_ok]}
                        onPress={() => setStatus('Completed')}
                    >
                        <Feather name="check-circle" size={20} color={status === 'Completed' ? '#10b981' : '#52525b'} />
                        <Text style={[styles.statusText, status === 'Completed' && styles.statusTextActive]}>Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.statusOption, status === 'Not Completed' && styles.statusActive_err]}
                        onPress={() => setStatus('Not Completed')}
                    >
                        <Feather name="x-circle" size={20} color={status === 'Not Completed' ? '#ef4444' : '#52525b'} />
                        <Text style={[styles.statusText, status === 'Not Completed' && styles.statusTextActive]}>Not Completed</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>DISCUSSION SUMMARY</Text>
                <View style={styles.inputCard}>
                    <Feather name="file-text" size={20} color="#3b82f6" style={styles.inputIcon} />
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder="What was discussed? Next steps?"
                        placeholderTextColor="#52525b"
                        value={summary}
                        onChangeText={setSummary}
                    />
                </View>
            </View>

            {status === 'Completed' && (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>OUTCOME & PIPELINE STAGE</Text>
                        <View style={styles.outcomeGrid}>
                            {[
                                { id: 'Interested', label: 'Follow-up', color: '#3b82f6' },
                                { id: 'Quotation Given', label: 'Quotation', color: '#8b5cf6' },
                                { id: 'Order Confirmed', label: 'Order Won', color: '#10b981' },
                                { id: 'No Interest', label: 'Order Lost', color: '#ef4444' }
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.outcomeOption,
                                        outcome === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '10' }
                                    ]}
                                    onPress={() => setOutcome(opt.id as any)}
                                >
                                    <View style={[styles.dot, { backgroundColor: opt.color }]} />
                                    <Text style={[styles.outcomeText, outcome === opt.id && { color: opt.color }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {outcome === 'Order Confirmed' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>ORDER DETAILS</Text>
                            <View style={styles.inputCard}>
                                <FontAwesome name="rupee" size={20} color="#10b981" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirmed Order Value (₹)"
                                    placeholderTextColor="#52525b"
                                    keyboardType="numeric"
                                    value={orderValue}
                                    onChangeText={setOrderValue}
                                />
                            </View>
                        </View>
                    )}

                    {(outcome === 'Interested' || outcome === 'Quotation Given') && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>EXPECTED ORDER DATE</Text>
                            <View style={styles.inputCard}>
                                <Feather name="trending-up" size={20} color="#3b82f6" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#52525b"
                                    value={expectedDate}
                                    onChangeText={setExpectedDate}
                                />
                            </View>
                        </View>
                    )}
                </>
            )}

            <View style={styles.mediaSection}>
                <TouchableOpacity style={styles.mediaBtn}>
                    <Feather name="camera" size={20} color="#a1a1aa" />
                    <Text style={styles.mediaBtnText}>Attach Photo / Visiting Card</Text>
                </TouchableOpacity>
                <View style={styles.gpsLock}>
                    <Feather name="map-pin" size={14} color="#10b981" />
                    <Text style={styles.gpsLockText}>Location will be captured on submit</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, (loading || submitting) && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading || submitting}
            >
                {loading || submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Text style={styles.submitBtnText}>Submit Visit Report</Text>
                        <Feather name="chevron-right" size={20} color="#fff" />
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.footerInfo}>
                <Text style={styles.footerText}>
                    Reports are read-only after submission. GPS & Timestamp are auto-logged.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
    backBtn: { padding: 8, marginLeft: -8 },
    backText: { color: '#a1a1aa', fontSize: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    leadCard: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginBottom: 32 },
    leadBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f620', justifyContent: 'center', alignItems: 'center' },
    leadSeq: { color: '#3b82f6', fontWeight: 'bold', fontSize: 18 },
    leadTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    leadSubtitle: { color: '#71717a', fontSize: 13, marginTop: 2 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#52525b', letterSpacing: 1, marginBottom: 12 },
    statusRow: { flexDirection: 'row', gap: 12 },
    statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#18181b', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
    statusActive_ok: { backgroundColor: '#10b98110', borderColor: '#10b98150' },
    statusActive_err: { backgroundColor: '#ef444410', borderColor: '#ef444450' },
    statusText: { color: '#52525b', fontWeight: '600' },
    statusTextActive: { color: '#fff' },
    inputCard: { backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start' },
    inputIcon: { marginTop: 4, marginRight: 12 },
    input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 4 },
    textArea: { flex: 1, color: '#fff', fontSize: 16, height: 100, textAlignVertical: 'top' },
    outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    outcomeOption: { width: '48%', backgroundColor: '#18181b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272a', flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    outcomeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    mediaSection: { marginTop: 8, marginBottom: 32, gap: 12 },
    mediaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#27272a', backgroundColor: '#18181b05' },
    mediaBtnText: { color: '#71717a', fontWeight: '500' },
    gpsLock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    gpsLockText: { color: '#10b981', fontSize: 12, fontWeight: '500' },
    submitBtn: { backgroundColor: '#2563eb', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledBtn: { opacity: 0.6 },
    footerInfo: { marginTop: 24, alignItems: 'center' },
    footerText: { color: '#52525b', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
