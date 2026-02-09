import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailyWorkPlan } from '../src/hooks/useDailyWorkPlan';
import { useTracking } from '../src/hooks/useTracking';
import { Plus, Trash2, MapPin, Clock, Play } from 'lucide-react-native';

const PlusIcon = Plus as any;
const TrashIcon = Trash2 as any;
const MapPinIcon = MapPin as any;
const ClockIcon = Clock as any;
const PlayIcon = Play as any;

interface RoutePoint {
    id: string;
    name: string;
    sequence: number;
}

export default function DailyWorkPlanScreen() {
    const router = useRouter();
    const { createWorkPlan, activateWorkPlan, loading, error: planError } = useDailyWorkPlan();
    const { startTracking } = useTracking();

    const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
        { id: '1', name: '', sequence: 1 }
    ]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [submitting, setSubmitting] = useState(false);

    const addRoutePoint = () => {
        const currentPoints = Array.isArray(routePoints) ? routePoints : [];
        const newId = (currentPoints.length + 1).toString();
        setRoutePoints([
            ...currentPoints,
            {
                id: newId,
                name: '',
                sequence: currentPoints.length + 1
            }
        ]);
    };

    const removeRoutePoint = (id: string) => {
        if (!Array.isArray(routePoints) || routePoints.length <= 1) {
            Alert.alert('Error', 'You must have at least one route point.');
            return;
        }
        const filtered = routePoints.filter(p => p && p.id !== id);
        // Resequence
        const resequenced = filtered.map((p, idx) => ({ ...p, sequence: idx + 1 }));
        setRoutePoints(resequenced);
    };

    const updateRoutePoint = (id: string, field: keyof RoutePoint, value: any) => {
        setRoutePoints(routePoints.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleActivatePlan = async () => {
        // Validate
        const validPoints = routePoints.filter(p => p.name.trim() !== '');
        if (validPoints.length === 0) {
            Alert.alert('Validation Error', 'Please add at least one route point or lead.');
            return;
        }

        if (!startTime || !endTime) {
            Alert.alert('Validation Error', 'Please set expected start and end times.');
            return;
        }

        setSubmitting(true);

        try {
            // Create work plan
            const plannedLeads = validPoints.map(p => ({
                name: p.name,
                sequence: p.sequence,
            }));

            const plan = await createWorkPlan(plannedLeads, startTime, endTime);

            if (!plan) {
                Alert.alert('Create Plan Failed', planError || 'Could not save work plan to database.');
                setSubmitting(false);
                return;
            }

            // Activate the plan
            const activated = await activateWorkPlan(plan.id);

            if (!activated) {
                Alert.alert('Activation Failed', planError || 'Could not activate work plan.');
                setSubmitting(false);
                return;
            }

            // Start GPS tracking
            await startTracking();

            Alert.alert(
                'Work Plan Activated!',
                'Your daily work plan is now active. GPS tracking has started automatically.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/'),
                    }
                ]
            );
        } catch (err: any) {
            // Show the actual error message from the hook/Supabase
            Alert.alert('Activation Failed', err.message || 'An unexpected error occurred while saving your plan.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Create Daily Work Plan</Text>
                <Text style={styles.subtitle}>Plan your route and leads for today</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <MapPinIcon size={20} color="#3b82f6" />
                    <Text style={styles.sectionTitle}>Route Points / Leads</Text>
                </View>

                {routePoints.map((point, index) => (
                    <View key={point.id} style={styles.routePointCard}>
                        <View style={styles.routePointHeader}>
                            <View style={styles.sequenceBadge}>
                                <Text style={styles.sequenceText}>{point.sequence}</Text>
                            </View>
                            <TextInput
                                style={styles.leadInput}
                                value={point.name}
                                onChangeText={(text) => updateRoutePoint(point.id, 'name', text)}
                                placeholder="Lead/Client Name"
                                placeholderTextColor="#52525b"
                            />
                            {routePoints.length > 1 && (
                                <TouchableOpacity onPress={() => removeRoutePoint(point.id)} style={styles.removeBtn}>
                                    <TrashIcon size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>

                    </View>
                ))}

                <TouchableOpacity onPress={addRoutePoint} style={styles.addBtn}>
                    <PlusIcon size={20} color="#3b82f6" />
                    <Text style={styles.addBtnText}>Add Another Point</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <ClockIcon size={20} color="#3b82f6" />
                    <Text style={styles.sectionTitle}>Expected Timing</Text>
                </View>

                <View style={styles.timeRow}>
                    <View style={styles.timeInputGroup}>
                        <Text style={styles.label}>START TIME</Text>
                        <TextInput
                            style={styles.timeInput}
                            value={startTime}
                            onChangeText={setStartTime}
                            placeholder="09:00"
                            placeholderTextColor="#52525b"
                        />
                    </View>

                    <View style={styles.timeInputGroup}>
                        <Text style={styles.label}>END TIME</Text>
                        <TextInput
                            style={styles.timeInput}
                            value={endTime}
                            onChangeText={setEndTime}
                            placeholder="18:00"
                            placeholderTextColor="#52525b"
                        />
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.activateBtn, (submitting || loading) && styles.disabledBtn]}
                onPress={handleActivatePlan}
                disabled={submitting || loading}
            >
                {submitting || loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <PlayIcon size={20} color="white" />
                        <Text style={styles.activateBtnText}>Activate Work Plan & Start Tracking</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    ℹ️ Once activated, GPS tracking will start automatically and your route will be recorded throughout the day.
                </Text>
            </View>
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
    card: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 20,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    routePointCard: {
        backgroundColor: '#09090b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    routePointHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sequenceBadge: {
        width: 28,
        height: 28,
        backgroundColor: '#3b82f620',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sequenceText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
    leadInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    removeBtn: { padding: 4 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8 },
    addBtnText: { color: '#3b82f6', fontWeight: '600' },
    timeRow: { flexDirection: 'row', gap: 16 },
    timeInputGroup: { flex: 1 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#52525b', letterSpacing: 1, marginBottom: 8 },
    timeInput: {
        backgroundColor: '#09090b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 15,
        textAlign: 'center',
    },
    activateBtn: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 12,
    },
    disabledBtn: { backgroundColor: '#27272a', opacity: 0.7 },
    activateBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    infoBox: {
        backgroundColor: '#3b82f610',
        borderWidth: 1,
        borderColor: '#3b82f630',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    infoText: { color: '#a1a1aa', fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
