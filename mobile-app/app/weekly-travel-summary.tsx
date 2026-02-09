import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTravelSummary } from '../src/hooks/useTravelSummary';
import { Calendar, TrendingUp, CheckCircle, Clock, IndianRupee } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const CalendarIcon = Calendar as any;
const TrendingUpIcon = TrendingUp as any;
const CheckCircleIcon = CheckCircle as any;
const ClockIcon = Clock as any;
const IndianRupeeIcon = IndianRupee as any;

export default function WeeklyTravelSummaryScreen() {
    const router = useRouter();
    const { weeklySummary, weeklyDetails, loading, fetchWeeklySummary } = useTravelSummary();

    useEffect(() => {
        fetchWeeklySummary();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return '#10b981';
            case 'rejected':
                return '#ef4444';
            default:
                return '#f59e0b';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'approved':
                return '#10b98110';
            case 'rejected':
                return '#ef444410';
            default:
                return '#f59e0b10';
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading travel summary...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Weekly Travel Summary</Text>
                {weeklySummary && (
                    <Text style={styles.subtitle}>
                        {formatDate(weeklySummary.week_start)} - {formatDate(weeklySummary.week_end)}
                    </Text>
                )}
            </View>

            {/* Weekly Totals Card */}
            {weeklySummary && (
                <View style={styles.totalCard}>
                    <View style={styles.totalRow}>
                        <View style={styles.totalItem}>
                            <TrendingUpIcon size={24} color="#3b82f6" />
                            <Text style={styles.totalLabel}>Total Distance</Text>
                            <Text style={styles.totalValue}>{weeklySummary.total_km.toFixed(2)} km</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.totalItem}>
                            <IndianRupeeIcon size={24} color="#10b981" />
                            <Text style={styles.totalLabel}>Total Allowance</Text>
                            <Text style={styles.totalValue}>₹{weeklySummary.total_amount.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <CheckCircleIcon size={16} color="#10b981" />
                            <Text style={styles.statusText}>{weeklySummary.approved_count} Approved</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <ClockIcon size={16} color="#f59e0b" />
                            <Text style={styles.statusText}>{weeklySummary.pending_count} Pending</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Daily Breakdown */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Breakdown</Text>

                {weeklyDetails.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CalendarIcon size={48} color="#52525b" />
                        <Text style={styles.emptyText}>No travel data for this week yet.</Text>
                        <Text style={styles.emptySubtext}>Start your daily work plan to begin tracking.</Text>
                    </View>
                ) : (
                    weeklyDetails.map((day) => (
                        <View key={day.id} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <View>
                                    <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                                    <Text style={styles.daySubtext}>{day.gps_log_count} GPS logs</Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusBg(day.status), borderColor: getStatusColor(day.status) }
                                    ]}
                                >
                                    <Text style={[styles.statusBadgeText, { color: getStatusColor(day.status) }]}>
                                        {day.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.dayStats}>
                                <View style={styles.dayStat}>
                                    <TrendingUpIcon size={16} color="#a1a1aa" />
                                    <Text style={styles.dayStatValue}>{day.total_km.toFixed(2)} km</Text>
                                </View>
                                <View style={styles.dayStat}>
                                    <IndianRupeeIcon size={16} color="#a1a1aa" />
                                    <Text style={styles.dayStatValue}>₹{day.travel_amount.toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
    loadingText: { color: '#a1a1aa', marginTop: 12, fontSize: 14 },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
    totalCard: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 32,
    },
    totalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    totalItem: { flex: 1, alignItems: 'center', gap: 8 },
    totalLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: '600' },
    totalValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    divider: { width: 1, height: 60, backgroundColor: '#27272a' },
    statusRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
    statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
    emptyCard: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 48,
        borderWidth: 1,
        borderColor: '#27272a',
        alignItems: 'center',
        gap: 12,
    },
    emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    emptySubtext: { color: '#71717a', fontSize: 14, textAlign: 'center' },
    dayCard: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 12,
    },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    dayDate: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    daySubtext: { color: '#71717a', fontSize: 12, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    dayStats: { flexDirection: 'row', gap: 24 },
    dayStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dayStatValue: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
    backBtn: {
        backgroundColor: '#27272a',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
    },
    backBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
