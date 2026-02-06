import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Search, MapPin, ChevronRight, Briefcase } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Casting icons to 'any' to bypass strict linting issues
const SearchIcon = Search as any;
const MapPinIcon = MapPin as any;
const ChevronRightIcon = ChevronRight as any;
const BriefcaseIcon = Briefcase as any;

export default function LeadsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        if (!user) return;
        setLoading(true);
        const { data } = await (supabase as any)
            .from('leads')
            .select(`
                *,
                areas (name)
            `)
            .eq('assigned_staff_id', user.id)
            .order('priority_score', { ascending: false });

        if (data) setLeads(data);
        setLoading(false);
    }

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.areas?.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Clients</Text>
                <View style={styles.searchBar}>
                    <SearchIcon size={18} color="#71717a" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search leads or areas..."
                        placeholderTextColor="#71717a"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {filteredLeads.map((lead) => (
                    <TouchableOpacity
                        key={lead.id}
                        style={styles.leadCard}
                        onPress={() => router.push({
                            pathname: '/visit-report',
                            params: { leadId: lead.id, leadName: lead.name }
                        })}
                    >
                        <View style={styles.leadIcon}>
                            <BriefcaseIcon size={20} color="#3b82f6" />
                        </View>
                        <View style={styles.leadInfo}>
                            <Text style={styles.leadName}>{lead.name}</Text>
                            <View style={styles.leadMeta}>
                                <MapPinIcon size={12} color="#71717a" />
                                <Text style={styles.leadArea}>{lead.areas?.name || 'No Area'}</Text>
                            </View>
                        </View>
                        <View style={styles.leadBadge}>
                            <Text style={styles.badgeText}>P{lead.priority_score}</Text>
                        </View>
                        <ChevronRightIcon size={18} color="#27272a" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    header: { padding: 24, paddingTop: 60, gap: 16 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, paddingHorizontal: 16, height: 48, gap: 12 },
    searchInput: { flex: 1, color: '#fff', fontSize: 14 },
    list: { padding: 24, paddingTop: 0, gap: 12 },
    leadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#18181b', gap: 16 },
    leadIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f610', justifyContent: 'center', alignItems: 'center' },
    leadInfo: { flex: 1 },
    leadName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    leadArea: { color: '#71717a', fontSize: 12 },
    leadBadge: { backgroundColor: '#3b82f620', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' }
});
