import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Plus, Trash2, ClipboardList, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const PlusIcon = Plus as any;
const TrashIcon = Trash2 as any;
const ClipboardIcon = ClipboardList as any;
const CheckIcon = CheckCircle as any;

export default function WorkPlansScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [tasks, setTasks] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [existingPlan, setExistingPlan] = useState<any>(null);

    useEffect(() => {
        fetchTodayPlan();
    }, []);

    async function fetchTodayPlan() {
        if (!user) return;
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const { data } = await (supabase as any)
            .from('work_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

        if (data) {
            setExistingPlan(data);
            setTasks(data.tasks || []);
        }
        setLoading(false);
    }

    const addTask = () => setTasks([...tasks, '']);
    const removeTask = (index: number) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks.length ? newTasks : ['']);
    };
    const updateTask = (text: string, index: number) => {
        const newTasks = [...tasks];
        newTasks[index] = text;
        setTasks(newTasks);
    };

    async function submitPlan() {
        if (!user) return;
        const filteredTasks = tasks.filter(t => t.trim() !== '');
        if (filteredTasks.length === 0) {
            Alert.alert('Error', 'Please add at least one task.');
            return;
        }

        setSubmitting(true);
        const today = new Date().toISOString().split('T')[0];

        const { error } = await (supabase as any)
            .from('work_plans')
            .upsert({
                user_id: user.id,
                date: today,
                tasks: filteredTasks,
                status: 'pending',
                submitted_at: new Date().toISOString(),
            });

        setSubmitting(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Success', 'Work plan submitted for approval!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Daily Work Plan</Text>
                <Text style={styles.subtitle}>{new Date().toDateString()}</Text>
            </View>

            {existingPlan && (
                <View style={[styles.statusBanner, existingPlan.status === 'approved' ? styles.approvedBg : styles.pendingBg]}>
                    <CheckIcon size={18} color={existingPlan.status === 'approved' ? '#10b981' : '#f59e0b'} />
                    <Text style={[styles.statusText, existingPlan.status === 'approved' ? styles.approvedText : styles.pendingText]}>
                        Status: {existingPlan.status.toUpperCase()}
                    </Text>
                </View>
            )}

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <ClipboardIcon size={20} color="#3b82f6" />
                    <Text style={styles.cardTitle}>What are your plans for today?</Text>
                </View>

                {tasks.map((task, index) => (
                    <View key={index} style={styles.taskInputRow}>
                        <TextInput
                            style={styles.input}
                            value={task}
                            onChangeText={(text) => updateTask(text, index)}
                            placeholder={`Destination or Task ${index + 1}`}
                            placeholderTextColor="#52525b"
                            editable={existingPlan?.status !== 'approved'}
                        />
                        {existingPlan?.status !== 'approved' && (
                            <TouchableOpacity onPress={() => removeTask(index)} style={styles.removeBtn}>
                                <TrashIcon size={20} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {existingPlan?.status !== 'approved' && (
                    <TouchableOpacity onPress={addTask} style={styles.addBtn}>
                        <PlusIcon size={20} color="#3b82f6" />
                        <Text style={styles.addBtnText}>Add Another Task</Text>
                    </TouchableOpacity>
                )}
            </View>

            {existingPlan?.status !== 'approved' && (
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.disabledBtn]}
                    onPress={submitPlan}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Plan for Approval</Text>
                    )}
                </TouchableOpacity>
            )}

            <Text style={styles.footerNote}>
                Note: Once approved, you cannot change your daily work plan.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 24, gap: 8, borderWidth: 1 },
    pendingBg: { backgroundColor: '#f59e0b10', borderColor: '#f59e0b30' },
    approvedBg: { backgroundColor: '#10b98110', borderColor: '#10b98130' },
    statusText: { fontSize: 14, fontWeight: 'bold' },
    pendingText: { color: '#f59e0b' },
    approvedText: { color: '#10b981' },
    card: { backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#27272a' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    taskInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    input: { flex: 1, backgroundColor: '#09090b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15 },
    removeBtn: { padding: 8 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8 },
    addBtnText: { color: '#3b82f6', fontWeight: '600' },
    submitBtn: { backgroundColor: '#2563eb', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 32 },
    disabledBtn: { backgroundColor: '#27272a', opacity: 0.7 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footerNote: { textAlign: 'center', color: '#52525b', fontSize: 12, marginTop: 24, lineHeight: 18 }
});
