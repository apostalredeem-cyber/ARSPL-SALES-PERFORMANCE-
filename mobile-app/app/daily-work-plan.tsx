import React, { useState } from 'react';  
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailyWorkPlan } from '../src/hooks/useDailyWorkPlan';
import { useLeads } from '../src/hooks/useLeads';
import { useCRM, Area } from '../src/hooks/useCRM';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


interface RoutePoint {
    id: string;
    lead_id: string;
    name: string;
    sequence: number;
    client_type: string;
    objective: string;
    expected_value: string;
    priority: 'low' | 'med' | 'high';
}

export default function DailyWorkPlanScreen() {
    const router = useRouter();
    const { createWorkPlan, loading, error: planError } = useDailyWorkPlan();
    const { leads: assignedLeads } = useLeads();
    const { areas, fetchLeadsInArea, loading: crmLoading } = useCRM();

    const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
        { id: '1', lead_id: '', name: '', sequence: 1, client_type: 'Retailer', objective: 'Intro', expected_value: '', priority: 'med' }
    ]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [submitting, setSubmitting] = useState(false);

    // UI State for Pickers
    const [activeAreaPicker, setActiveAreaPicker] = useState<string | null>(null);
    const [activeLeadPicker, setActiveLeadPicker] = useState<string | null>(null);
    const [tempLeads, setTempLeads] = useState<Record<string, any[]>>({}); // PointID -> LeadList
    const [selectedAreaForPoint, setSelectedAreaForPoint] = useState<Record<string, string>>({}); // PointID -> AreaID

    // Auto-calculate total expected business value
    const totalValue = routePoints.reduce((sum, p) => sum + (parseFloat(p.expected_value) || 0), 0);

    const addRoutePoint = () => {
        const currentPoints = Array.isArray(routePoints) ? routePoints : [];
        const newId = (currentPoints.length + 1).toString();
        setRoutePoints([
            ...currentPoints,
            {
                id: newId,
                lead_id: '',
                name: '',
                sequence: currentPoints.length + 1,
                client_type: 'Retailer',
                objective: 'Intro',
                expected_value: '',
                priority: 'med'
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

    const handleAreaSelect = async (pointId: string, area: Area) => {
        setSelectedAreaForPoint(prev => ({ ...prev, [pointId]: area.id }));
        setActiveAreaPicker(null);

        // Reset lead for this point
        updateRoutePoint(pointId, 'lead_id', '');
        updateRoutePoint(pointId, 'name', '');

        // Fetch leads for this area
        const areaLeads = await fetchLeadsInArea(area.id);
        setTempLeads(prev => ({ ...prev, [pointId]: areaLeads }));

        // Open lead picker automatically for better UX
        setActiveLeadPicker(pointId);
    };

    const selectLead = (pointId: string, lead: any) => {
        setRoutePoints(routePoints.map(p => p.id === pointId ? {
            ...p,
            lead_id: lead.id,
            name: lead.name,
            client_type: lead.client_type || p.client_type,
            expected_value: lead.expected_value?.toString() || p.expected_value
        } : p));
        setActiveLeadPicker(null);
    };

    const handleActivatePlan = async () => {
        // Validate
        const validPoints = routePoints.filter(p => p.lead_id !== '');
        if (validPoints.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one lead for your plan.');
            return;
        }

        if (!startTime || !endTime) {
            Alert.alert('Validation Error', 'Please set expected start and end times.');
            return;
        }

        setSubmitting(true);

        try {
            // Create work plan using relational leads (Block 2 hook signature)
            const plannedLeads = validPoints.map(p => ({
                lead_id: p.lead_id,
                sequence: p.sequence,
                objective: p.objective,
                expected_value: parseFloat(p.expected_value) || 0,
                priority: p.priority,
            }));

            const success = await createWorkPlan(plannedLeads, startTime, endTime);

            if (!success) {
                Alert.alert('Create Plan Failed', planError || 'Could not save work plan to database.');
                setSubmitting(false);
                return;
            }

            Alert.alert('Success', 'Work plan created and activated!', [
                { text: 'OK', onPress: () => router.replace('/') }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'An unexpected error occurred.');
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
                    <Feather name="map-pin" size={20} color="#3b82f6" />
                    <Text style={styles.sectionTitle}>Route Points / Leads</Text>
                    <Text style={[styles.sectionTitle, { marginLeft: 'auto', color: '#10b981' }]}>
                        ₹{totalValue.toLocaleString()}
                    </Text>
                </View>

                {routePoints.map((point, index) => (
                    <View key={point.id} style={styles.routePointCard}>

                        {/* AREA PICKER OVERLAY */}
                        {activeAreaPicker === point.id && (
                            <View style={styles.pickerOverlay}>
                                <Text style={styles.pickerTitle}>Select Area</Text>
                                <ScrollView style={styles.leadsList} nestedScrollEnabled>
                                    {areas.length === 0 ? (
                                        <Text style={styles.emptyLeads}>No areas found.</Text>
                                    ) : (
                                        areas.map((area: Area) => (
                                            <TouchableOpacity
                                                key={area.id}
                                                style={styles.leadOption}
                                                onPress={() => handleAreaSelect(point.id, area)}
                                            >
                                                <Text style={styles.leadOptionName}>{area.name}</Text>
                                                {area.city && <Text style={styles.leadOptionType}>{area.city}</Text>}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                                <TouchableOpacity onPress={() => router.push('/add-lead')} style={styles.addPartyInPicker}>
                                    <Feather name="plus" size={16} color="#3b82f6" />
                                    <Text style={styles.addPartyText}>Add New Area / Party</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setActiveAreaPicker(null)} style={styles.closePicker}>
                                    <Text style={styles.closePickerText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* LEAD PICKER OVERLAY */}
                        {activeLeadPicker === point.id && (
                            <View style={styles.pickerOverlay}>
                                <Text style={styles.pickerTitle}>Select Party</Text>
                                <ScrollView style={styles.leadsList} nestedScrollEnabled>
                                    {!selectedAreaForPoint[point.id] ? (
                                        <Text style={styles.emptyLeads}>Please select an area first.</Text>
                                    ) : (tempLeads[point.id] || []).length === 0 ? (
                                        <Text style={styles.emptyLeads}>No parties found in this area.</Text>
                                    ) : (
                                        (tempLeads[point.id] || []).map(lead => (
                                            <TouchableOpacity
                                                key={lead.id}
                                                style={styles.leadOption}
                                                onPress={() => selectLead(point.id, lead)}
                                            >
                                                <Text style={styles.leadOptionName}>{lead.name}</Text>
                                                <Text style={styles.leadOptionType}>{lead.client_type} • {lead.phone_number}</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                                <TouchableOpacity onPress={() => router.push('/add-lead')} style={styles.addPartyInPicker}>
                                    <Feather name="plus" size={16} color="#3b82f6" />
                                    <Text style={styles.addPartyText}>Add New Party</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setActiveLeadPicker(null)} style={styles.closePicker}>
                                    <Text style={styles.closePickerText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.routePointHeader}>
                            <View style={styles.sequenceBadge}>
                                <Text style={styles.sequenceText}>{point.sequence}</Text>
                            </View>

                            <View style={{ flex: 1, gap: 8 }}>
                                {/* Area Selector */}
                                <TouchableOpacity
                                    style={styles.leadSelector}
                                    onPress={() => setActiveAreaPicker(point.id)}
                                >
                                    <Text style={[styles.leadSelectorText, !selectedAreaForPoint[point.id] && styles.placeholderText]}>
                                        {areas.find(a => a.id === selectedAreaForPoint[point.id])?.name || 'Select Area'}
                                    </Text>
                                    <Feather name="chevron-down" size={16} color="#71717a" />
                                </TouchableOpacity>

                                {/* Lead Selector */}
                                <TouchableOpacity
                                    style={[styles.leadSelector, !selectedAreaForPoint[point.id] && styles.disabledSelector]}
                                    onPress={() => selectedAreaForPoint[point.id] && setActiveLeadPicker(point.id)}
                                    disabled={!selectedAreaForPoint[point.id]}
                                >
                                    <Text style={[styles.leadSelectorText, !point.name && styles.placeholderText]}>
                                        {point.name || 'Select Party'}
                                    </Text>
                                    <Feather name="chevron-down" size={16} color="#71717a" />
                                </TouchableOpacity>
                            </View>

                            {routePoints.length > 1 && (
                                <TouchableOpacity onPress={() => removeRoutePoint(point.id)} style={styles.removeBtn}>
                                    <Feather name="trash-2" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* CRM Details Row */}
                        <View style={styles.leadDetailsRow}>
                            <View style={[styles.detailInputGroup, { flex: 1 }]}>
                                <Text style={styles.miniLabel}>EXPECTED VALUE (₹)</Text>
                                <TextInput
                                    style={styles.miniInput}
                                    value={point.expected_value}
                                    onChangeText={(text) => updateRoutePoint(point.id, 'expected_value', text)}
                                    placeholder="0"
                                    placeholderTextColor="#52525b"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.detailInputGroup, { flex: 1 }]}>
                                <Text style={styles.miniLabel}>PRIORITY</Text>
                                <View style={styles.priorityToggle}>
                                    {(['low', 'med', 'high'] as const).map((p) => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => updateRoutePoint(point.id, 'priority', p)}
                                            style={[
                                                styles.priorityOption,
                                                point.priority === p && styles[`priorityActive_${p}`]
                                            ]}
                                        >
                                            <Text style={[
                                                styles.priorityOptionText,
                                                point.priority === p && styles.priorityActiveText
                                            ]}>
                                                {p.charAt(0).toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.objectiveRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.miniLabel}>CLIENT TYPE</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                                    {['Dealer', 'Architect', 'Builder', 'Retailer', 'Other'].map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => updateRoutePoint(point.id, 'client_type', t)}
                                            style={[styles.typeOption, point.client_type === t && styles.typeActive]}
                                        >
                                            <Text style={[styles.typeText, point.client_type === t && styles.typeActiveText]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={[styles.objectiveRow, { marginTop: 12 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.miniLabel}>OBJECTIVE</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                                    {['Intro', 'Follow-up', 'Negotiation', 'Collection', 'Service'].map((o) => (
                                        <TouchableOpacity
                                            key={o}
                                            onPress={() => updateRoutePoint(point.id, 'objective', o)}
                                            style={[styles.typeOption, point.objective === o && styles.typeActive]}
                                        >
                                            <Text style={[styles.typeText, point.objective === o && styles.typeActiveText]}>{o}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                ))}

                <TouchableOpacity onPress={addRoutePoint} style={styles.addBtn}>
                    <Feather name="plus" size={20} color="#3b82f6" />
                    <Text style={styles.addBtnText}>Add Another Point</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Feather name="clock" size={20} color="#3b82f6" />
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
                        <Feather name="play" size={20} color="white" />
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
    leadDetailsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    detailInputGroup: { gap: 6 },
    miniLabel: { fontSize: 10, fontWeight: 'bold', color: '#52525b', letterSpacing: 0.5 },
    miniInput: {
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 10,
        padding: 10,
        color: '#fff',
        fontSize: 14,
    },
    priorityToggle: {
        flexDirection: 'row',
        backgroundColor: '#18181b',
        borderRadius: 10,
        padding: 4,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    priorityOption: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    priorityOptionText: { fontSize: 12, fontWeight: 'bold', color: '#52525b' },
    priorityActiveText: { color: '#fff' },
    priorityActive_low: { backgroundColor: '#10b981' },
    priorityActive_med: { backgroundColor: '#f59e0b' },
    priorityActive_high: { backgroundColor: '#ef4444' },
    objectiveRow: { gap: 6 },
    typeScroll: { marginTop: 8 },
    typeOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#18181b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272a',
        marginRight: 8,
    },
    typeActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
    typeText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
    typeActiveText: { color: '#3b82f6' },
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
    leadSelector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 12,
        padding: 12,
    },
    leadSelectorText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    placeholderText: { color: '#52525b' },
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#09090b',
        borderRadius: 20,
        zIndex: 50,
        padding: 16,
    },
    pickerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    leadsList: { flex: 1 },
    leadOption: {
        padding: 16,
        backgroundColor: '#18181b',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    leadOptionName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    leadOptionType: { color: '#71717a', fontSize: 12, marginTop: 4 },
    emptyLeads: { color: '#71717a', textAlign: 'center', marginTop: 20 },
    closePicker: {
        marginTop: 12,
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#27272a',
        borderRadius: 12,
    },
    closePickerText: { color: '#fff', fontWeight: 'bold' },
    disabledSelector: { opacity: 0.5, backgroundColor: '#09090b' },
    addPartyInPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: '#18181b',
        borderTopWidth: 1,
        borderTopColor: '#27272a',
        marginTop: 8,
    },
    addPartyText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14 },
});
