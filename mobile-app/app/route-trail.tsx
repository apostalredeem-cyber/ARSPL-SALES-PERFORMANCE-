import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Map as MapIcon, Navigation } from 'lucide-react-native';

const MapIconComp = MapIcon as any;
const NavigationIcon = Navigation as any;

export default function RouteTrailScreen() {
    const { user } = useAuth();
    const [locations, setLocations] = useState<{ latitude: number; longitude: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodayLogs();
    }, []);

    async function fetchTodayLogs() {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        const { data } = await (supabase as any)
            .from('gps_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('timestamp', today)
            .order('timestamp', { ascending: true });

        if (data) {
            const parsedCoords = data.map((log: any) => {
                const parts = log.location.replace('POINT(', '').replace(')', '').split(' ');
                return {
                    latitude: parseFloat(parts[1]),
                    longitude: parseFloat(parts[0]),
                };
            });
            setLocations(parsedCoords);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MapIconComp size={24} color="#3b82f6" />
                <Text style={styles.title}>Your Route Trail</Text>
            </View>

            {locations.length > 0 ? (
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        ...locations[0],
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
                    <Marker coordinate={locations[0]} title="Started Here">
                        <View style={styles.startMarker} />
                    </Marker>
                    <Marker coordinate={locations[locations.length - 1]} title="Last Seen">
                        <NavigationIcon size={24} color="#3b82f6" fill="#3b82f6" />
                    </Marker>
                </MapView>
            ) : (
                <View style={styles.noData}>
                    <Text style={styles.noDataText}>No tracking data for today yet.</Text>
                </View>
            )}
        </View>
    );
}

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    map: { flex: 1 },
    startMarker: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
    noData: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noDataText: { color: '#71717a', fontSize: 16 }
});
