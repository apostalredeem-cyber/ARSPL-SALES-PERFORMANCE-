import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { MapPin, Navigation, Clock } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface EmployeeLocation {
    user_id: string;
    full_name: string;
    location: [number, number]; // [lat, lng]
    timestamp: string;
    speed: number | null;
    heading: number | null;
}

export const LiveMap: React.FC = () => {
    const [locations, setLocations] = useState<Record<string, EmployeeLocation>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialLocations();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:gps_logs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gps_logs' },
                async (payload) => {
                    const newLog = payload.new;
                    // Fetch user details if not already in state
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', newLog.user_id)
                        .single() as any;

                    // Parse PostGIS POINT(lng lat)
                    const coords = parseWKTPoint(newLog.location);

                    if (coords) {
                        setLocations(prev => ({
                            ...prev,
                            [newLog.user_id]: {
                                user_id: newLog.user_id,
                                full_name: profile?.full_name || 'Unknown',
                                location: coords,
                                timestamp: newLog.timestamp,
                                speed: newLog.speed,
                                heading: newLog.heading
                            }
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchInitialLocations = async () => {
        try {
            // Get profiles join with latest gps_log
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    gps_logs (
                        location,
                        timestamp,
                        speed,
                        heading
                    )
                `)
                .eq('role', 'employee');

            if (error) throw error;

            const initialMap: Record<string, EmployeeLocation> = {};
            (data as any[])?.forEach(profile => {
                const logs = profile.gps_logs as any[];
                if (logs && logs.length > 0) {
                    // Sort to get latest
                    const latest = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                    const coords = parseWKTPoint(latest.location);
                    if (coords) {
                        initialMap[profile.id] = {
                            user_id: profile.id,
                            full_name: profile.full_name || 'Unknown',
                            location: coords,
                            timestamp: latest.timestamp,
                            speed: latest.speed,
                            heading: latest.heading
                        };
                    }
                }
            });
            setLocations(initialMap);
        } catch (err) {
            console.error('Error fetching initial locations:', err);
        } finally {
            setLoading(false);
        }
    };

    const parseWKTPoint = (wkt: string): [number, number] | null => {
        const match = wkt.match(/POINT\((.+) (.+)\)/);
        if (match) {
            return [parseFloat(match[2]), parseFloat(match[1])]; // [lat, lng]
        }
        return null;
    };

    if (loading) {
        return (
            <div className="w-full h-[calc(100vh-160px)] flex items-center justify-center bg-zinc-900 rounded-3xl border border-zinc-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-400 font-medium">Initializing Tracker Map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-160px)] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative">
            <MapContainer
                center={[20.5937, 78.9629]} // Default center (India)
                zoom={5}
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {Object.values(locations).map(emp => (
                    <Marker
                        key={emp.user_id}
                        position={emp.location}
                    >
                        <Popup className="custom-popup">
                            <div className="bg-zinc-900 text-zinc-100 p-1 min-w-[180px]">
                                <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
                                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight">{emp.full_name}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[11px]">Last seen: {new Date(emp.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span className="text-[11px]">Speed: {emp.speed ? `${Math.round(emp.speed * 3.6)} km/h` : 'Stopped'}</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay Status Bar */}
            <div className="absolute top-6 left-6 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shadow-xl min-w-[200px]">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-sm font-bold tracking-tight">System Status: Live</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                    Tracking {Object.keys(locations).length} Active Employees
                </span>
            </div>
        </div>
    );
};
