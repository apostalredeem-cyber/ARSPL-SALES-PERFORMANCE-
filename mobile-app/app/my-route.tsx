import React, { useEffect, useState, Component, ReactNode } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { useDailyWorkPlan } from '../src/hooks/useDailyWorkPlan';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLeads } from '../src/hooks/useLeads';


/**
 * GLOBAL ERROR BOUNDARY
 * Prevents any runtime error in the Route screen from crashing the entire app.
 */
class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("CRITICAL ROUTE ERROR:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.centered}>
                    <Feather name="alert-circle" size={48} color="#ef4444" />
                    <Text style={styles.errorTitle}>Stability Mode Active</Text>
                    <Text style={styles.errorSubtitle}>The route screen encountered a runtime issue. Fallback mode engaged.</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => this.setState({ hasError: false })}
                    >
                        <Text style={styles.retryBtnText}>Reset Screen</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

function MyRouteContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentPlan, hasActiveWorkPlan, updateWorkPlan, loading: planLoading } = useDailyWorkPlan();

    // SAFE STATE ENFORCEMENT
    const [locations, setLocations] = useState<{ latitude: number; longitude: number }[]>([]);
    const [fetchingLogs, setFetchingLogs] = useState(true);
    const [newMeetingName, setNewMeetingName] = useState('');
    const [addingMeeting, setAddingMeeting] = useState(false);

    // SINGLE SOURCE OF TRUTH: Derive route directly from currentPlan
    const route = currentPlan?.planned_leads ?? [];

    // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
    useEffect(() => {
        // Initial state reset to ensure no carry-over
        setLocations([]);

        if (user && hasActiveWorkPlan()) {
            fetchTodayLogs();
        } else {
            setFetchingLogs(false);
        }
    }, [user, currentPlan?.status]);

    console.log('[ROUTE] Rendering route:', route);
    console.log('[ROUTE] Current plan status:', currentPlan?.status);

    async function fetchTodayLogs() {
        if (!user) return;
        setFetchingLogs(true);
        const today = new Date().toISOString().split('T')[0];

        try {
            // SAFE SUPABASE QUERY: Using .limit() and gte for range
            const { data, error } = await (supabase as any)
                .from('gps_logs')
                .select('*')
                .eq('user_id', user.id)
                .gte('timestamp', today)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            // SAFE DATA PARSING
            if (Array.isArray(data) && data.length > 0) {
                const parsedCoords = data.map((log: any) => {
                    if (!log || !log.location) return null;
                    try {
                        const parts = log.location.replace('POINT(', '').replace(')', '').split(' ');
                        const lat = parseFloat(parts[1]);
                        const lng = parseFloat(parts[0]);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        return { latitude: lat, longitude: lng };
                    } catch (e) {
                        return null;
                    }
                }).filter((c): c is { latitude: number; longitude: number } => c !== null);
                setLocations(parsedCoords);
            } else {
                setLocations([]);
            }
        } catch (err) {
            console.error("GPS Fetch Error:", err);
            setLocations([]);
        } finally {
            setFetchingLogs(false);
        }
    }

    const handleAddMeeting = async () => {
        const name = newMeetingName.trim();
        if (!name) {
            Alert.alert('Validation Error', 'Please enter a client/location name.');
            return;
        }

        setAddingMeeting(true);
        try {
            // Get current planned_leads
            const currentLeads = currentPlan?.planned_leads ?? [];
            const newSeq = currentLeads.length + 1;

            // Create new lead entry
            const newLead = {
                lead_id: `manual-${Date.now()}`,
                name: name,
                sequence: newSeq,
                objective: 'Manual Entry',
                expected_value: 0,
                priority: 'med'
            };

            console.log('[ROUTE] Adding new lead:', newLead);

            // Update work plan with new lead
            const success = await updateWorkPlan([...currentLeads, newLead]);

            if (success) {
                setNewMeetingName('');
                Alert.alert('Success', 'Client added to route successfully.');
            } else {
                Alert.alert('Error', 'Unable to add client. Check connection.');
            }
        } catch (err) {
            console.error('[ROUTE] Add meeting error:', err);
            Alert.alert('Error', 'An unexpected error occurred during client addition.');
        } finally {
            setAddingMeeting(false);
        }
    };

    if (planLoading || fetchingLogs) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Syncing route data...</Text>
            </View>
        );
    }

    if (!hasActiveWorkPlan()) {
        return (
            <View style={styles.centered}>
                <Feather name="alert-circle" size={48} color="#f59e0b" />
                <Text style={styles.noDataTitle}>No Active Work Plan</Text>
                <Text style={styles.noDataText}>Activate your work plan from the dashboard to enable route viewing.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Feather name="map" size={24} color="#3b82f6" />
                <Text style={styles.title}>My Today's Route</Text>
                <View style={styles.versionBadge}>
                    <Text style={styles.versionText}>v1.1.0 RELATIONAL</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll}>
                {/* Map Section */}
                <View style={styles.mapContainer}>
                    {locations.length > 0 ? (
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{
                                latitude: locations[0]?.latitude ?? 0,
                                longitude: locations[0]?.longitude ?? 0,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            customMapStyle={darkMapStyle}
                        >
                            <Polyline
                                coordinates={locations}
                                strokeColor="#3b82f6"
                                strokeWidth={4}
                            />
                            <Marker coordinate={locations[0]} title="Start Point">
                                <View style={styles.startMarker} />
                            </Marker>
                            <Marker coordinate={locations[locations.length - 1]} title="Current Position">
                                <Feather name="navigation" size={24} color="#3b82f6" />
                            </Marker>
                        </MapView>
                    ) : (
                        <View style={styles.noMapData}>
                            <Feather name="alert-circle" size={32} color="#27272a" />
                            <Text style={styles.noDataText}>No GPS movements recorded yet.</Text>
                        </View>
                    )}
                </View>

                {/* Meetings Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="map-pin" size={20} color="#3b82f6" />
                        <Text style={styles.sectionTitle}>Planned Meetings</Text>
                    </View>

                    {route.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>Route is empty. Add your first meeting below.</Text>
                        </View>
                    ) : (
                        route
                            .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
                            .map((lead: any, idx: number) => (
                                <View key={`lead-${lead.lead_id || idx}`} style={styles.meetingItem}>
                                    <View style={styles.meetingBadge}>
                                        <Text style={styles.meetingSeq}>{lead.sequence ?? (idx + 1)}</Text>
                                    </View>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.meetingName} numberOfLines={1}>
                                                {lead.name || 'Unknown Client'}
                                            </Text>
                                            {lead.priority && (
                                                <View style={[styles.priorityBadge, (styles as any)[`priorityBadge_${lead.priority}`]]}>
                                                    <Text style={styles.priorityText}>{lead.priority.toUpperCase()}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                            <Text style={styles.objectiveText}>{lead.objective || 'Intro'}</Text>
                                            <Text style={styles.objectiveText}>•</Text>
                                            <Text style={styles.objectiveText}>₹{lead.expected_value || 0}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                    )}

                    {/* Add Meeting Form */}
                    <View style={styles.addForm}>
                        <TextInput
                            style={styles.input}
                            value={newMeetingName}
                            onChangeText={setNewMeetingName}
                            placeholder="Client/Location Name"
                            placeholderTextColor="#52525b"
                            editable={!addingMeeting}
                        />
                        <TouchableOpacity
                            style={[styles.addBtn, addingMeeting && styles.disabledBtn]}
                            onPress={handleAddMeeting}
                            disabled={addingMeeting}
                        >
                            {addingMeeting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="plus" size={20} color="#fff" />
                                    <Text style={styles.addBtnText}>Add to Route</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

export default function MyRouteScreen() {
    return (
        <RouteErrorBoundary>
            <MyRouteContent />
        </RouteErrorBoundary>
    );
}

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b', padding: 24 },
    scroll: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    versionBadge: { backgroundColor: '#3b82f620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 'auto' },
    versionText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' },
    mapContainer: { height: 280, backgroundColor: '#18181b', marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
    map: { flex: 1 },
    noMapData: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
    section: { padding: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    meetingItem: { backgroundColor: '#18181b', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    meetingBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f620', justifyContent: 'center', alignItems: 'center' },
    meetingSeq: { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 },
    meetingName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    priorityBadge_low: { backgroundColor: '#10b98120' },
    priorityBadge_med: { backgroundColor: '#f59e0b20' },
    priorityBadge_high: { backgroundColor: '#ef444420' },
    priorityText: { fontSize: 10, fontWeight: 'bold', color: '#a1a1aa' }, // Fallback
    objectiveText: { color: '#a1a1aa', fontSize: 12 },
    reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f615', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#3b82f630' },
    reportBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
    emptyState: { padding: 20, alignItems: 'center' },
    emptyStateText: { color: '#71717a', textAlign: 'center' },
    addForm: { marginTop: 20, gap: 12 },
    input: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15 },
    addBtn: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    disabledBtn: { opacity: 0.6 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    startMarker: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
    loadingText: { color: '#a1a1aa', marginTop: 12 },
    noDataTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    noDataText: { color: '#a1a1aa', textAlign: 'center', marginTop: 8 },
    errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    errorSubtitle: { color: '#a1a1aa', textAlign: 'center', marginTop: 8, marginBottom: 24 },
    retryBtn: { backgroundColor: '#27272a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#fff', fontWeight: 'bold' },
    metaText: { color: '#a1a1aa', fontSize: 13, fontWeight: '500' },
    metaSeparator: { color: '#3f3f46', fontSize: 13 },
});
