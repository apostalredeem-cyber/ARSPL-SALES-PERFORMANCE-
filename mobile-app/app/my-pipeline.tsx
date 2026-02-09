import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLeads } from '../src/hooks/useLeads';
import { TrendingUp, Target, Package, CheckCircle, ChevronRight, Filter } from 'lucide-react-native';

const TrendingIcon = TrendingUp as any;
const TargetIcon = Target as any;
const PackageIcon = Package as any;
const CheckIcon = CheckCircle as any;

const STAGES = [
    { name: 'New Lead', color: '#94a3b8' },
    { name: 'Follow-up', color: '#3b82f6' },
    { name: 'Quotation', color: '#8b5cf6' },
    { name: 'Order Won', color: '#10b981' },
    { name: 'Order Lost', color: '#ef4444' }
];

export default function MyPipelineScreen() {
    const { leads, loading, error } = useLeads();

    const groupedLeads = useMemo(() => {
        const groups: Record<string, typeof leads> = {};
        STAGES.forEach(s => groups[s.name] = []);
        leads.forEach(l => {
            if (groups[l.status]) groups[l.status].push(l);
            else groups['New Lead'].push(l); // Fallback
        });
        return groups;
    }, [leads]);

    const totalPipelineValue = useMemo(() => {
        return leads.reduce((sum, l) => sum + (l.expected_value || 0), 0);
    }, [leads]);

    const wonValue = useMemo(() => {
        return leads.filter(l => l.status === 'Order Won').reduce((sum, l) => sum + (l.expected_value || 0), 0);
    }, [leads]);

    if (loading && !leads.length) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading Pipeline...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Sales Pipeline</Text>
                <TouchableOpacity style={styles.filterBtn}>
                    <Filter size={20} color="#a1a1aa" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <TrendingIcon size={20} color="#3b82f6" />
                    <Text style={styles.statLabel}>TOTAL PIPELINE</Text>
                    <Text style={styles.statValue}>₹{(totalPipelineValue / 100000).toFixed(2)}L</Text>
                </View>
                <View style={styles.statCard}>
                    <CheckIcon size={20} color="#10b981" />
                    <Text style={statLabel_won}>ACHIEVED</Text>
                    <Text style={styles.statValue}>₹{(wonValue / 100000).toFixed(2)}L</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {STAGES.map((stage) => {
                    const stageLeads = groupedLeads[stage.name] || [];
                    const stageValue = stageLeads.reduce((sum, l) => sum + (l.expected_value || 0), 0);

                    return (
                        <View key={stage.name} style={styles.stageSection}>
                            <View style={styles.stageHeader}>
                                <View style={[styles.stageIndicator, { backgroundColor: stage.color }]} />
                                <Text style={styles.stageTitle}>{stage.name}</Text>
                                <View style={styles.stageCount}>
                                    <Text style={styles.stageCountText}>{stageLeads.length}</Text>
                                </View>
                                <Text style={styles.stageValue}>₹{(stageValue / 1000).toFixed(0)}K</Text>
                            </View>

                            {stageLeads.length > 0 ? (
                                stageLeads.map((lead) => (
                                    <TouchableOpacity key={lead.id} style={styles.leadCard}>
                                        <View style={styles.leadInfo}>
                                            <Text style={styles.leadName}>{lead.name}</Text>
                                            <Text style={styles.leadType}>{lead.client_type || 'Retailer'}</Text>
                                        </View>
                                        <View style={styles.leadMeta}>
                                            <Text style={styles.leadValue}>₹{lead.expected_value.toLocaleString()}</Text>
                                            <ChevronRight size={16} color="#27272a" />
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyStage}>
                                    <Text style={styles.emptyText}>No leads in this stage</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const statLabel_won = {
    fontSize: 10,
    fontWeight: 'bold' as const,
    color: '#10b981',
    letterSpacing: 1,
    marginTop: 8
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
    loadingText: { color: '#a1a1aa', marginTop: 12 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    filterBtn: { backgroundColor: '#18181b', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
    statsContainer: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: '#18181b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#27272a' },
    statLabel: { fontSize: 10, fontWeight: 'bold', color: '#3b82f6', letterSpacing: 1, marginTop: 8 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    stageSection: { marginBottom: 32 },
    stageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    stageIndicator: { width: 4, height: 16, borderRadius: 2 },
    stageTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
    stageCount: { backgroundColor: '#18181b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    stageCountText: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold' },
    stageValue: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
    leadCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
    leadInfo: { flex: 1 },
    leadName: { color: '#fff', fontSize: 15, fontWeight: '600' },
    leadType: { color: '#71717a', fontSize: 12, marginTop: 2 },
    leadMeta: { alignItems: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 12 },
    leadValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    emptyStage: { padding: 16, alignItems: 'center', backgroundColor: '#09090b', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#18181b' },
    emptyText: { color: '#3f3f46', fontSize: 12 }
});
