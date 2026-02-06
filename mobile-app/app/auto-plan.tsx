import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const SparklesIcon = Sparkles as any;
const MapPinIcon = MapPin as any;
const ArrowRightIcon = ArrowRight as any;

export default function AutoPlanScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<any>(null);

    useEffect(() => {
        fetchAutoPlan();
    }, []);

    async function fetchAutoPlan() {
        setLoading(true);
        setTimeout(() => {
            setPlan({
                date: new Date().toLocaleDateString(),
                suggested_plan: [
                    { lead_name: 'Aggarwal Constructions', suggested_action: 'Cold Visit', priority: 3 },
                    { lead_name: 'Metro Rail Site B', suggested_action: 'Follow-up', priority: 2 },
                    { lead_name: 'Sharma Traders', suggested_action: 'Follow-up', priority: 1 }
                ]
            });
            setLoading(false);
        }, 1500);
    }

    async function acceptPlan() {
        Alert.alert('Success', 'Plan accepted! Good luck for the day.', [
            { text: 'Let\'s Start', onPress: () => router.push('/') }
        ]);
    }

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Generating your optimized plan...</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <SparklesIcon size={32} color="#3b82f6" />
                </View>
                <Text style={styles.title}>Daily AI Plan</Text>
                <Text style={styles.subtitle}>Optimized for today, {plan.date}</Text>
            </View>

            <View style={styles.planBox}>
                {plan.suggested_plan.map((item: any, idx: number) => (
                    <View key={idx} style={styles.planItem}>
                        <View style={styles.orderCircle}><Text style={styles.orderText}>{idx + 1}</Text></View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.lead_name}</Text>
                            <Text style={styles.itemAction}>{item.suggested_action}</Text>
                        </View>
                        <View style={styles.priorityBox}>
                            <MapPinIcon size={12} color="#3b82f6" />
                            <Text style={styles.priorityText}>P{item.priority}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={acceptPlan}>
                    <Text style={styles.acceptText}>Accept Suggested Plan</Text>
                    <ArrowRightIcon size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.modifyBtn} onPress={() => Alert.alert('Modify', 'Please provide reason for modification.')}>
                    <Text style={styles.modifyText}>Request Modification</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { padding: 24, paddingTop: 80 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    loadingText: { color: '#71717a', marginTop: 16, fontSize: 14 },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#3b82f615', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 14, color: '#71717a', marginTop: 4 },
    planBox: { backgroundColor: '#09090b', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#18181b' },
    planItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
    orderCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
    orderText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
    itemInfo: { flex: 1 },
    itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    itemAction: { color: '#71717a', fontSize: 12, marginTop: 2 },
    priorityBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f610', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    priorityText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' },
    actions: { marginTop: 40, gap: 12 },
    acceptBtn: { backgroundColor: '#3b82f6', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    acceptText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modifyBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    modifyText: { color: '#71717a', fontSize: 14, fontWeight: 'bold' }
});
