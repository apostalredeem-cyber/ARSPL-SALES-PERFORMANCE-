import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from 'react-native';

export function useAttendance() {
    const { user } = useAuth();
    const [activeAttendance, setActiveAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchActiveAttendance();
    }, [user]);

    async function fetchActiveAttendance() {
        if (!user) return;
        setLoading(true);
        const { data } = await (supabase as any)
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (data) setActiveAttendance(data);
        else setActiveAttendance(null);
        setLoading(false);
    }

    async function clockIn(selfieUri?: string) {
        if (!user) return;

        let selfieUrl = null;
        if (selfieUri) {
            try {
                const fileName = `selfie_${user.id}_${Date.now()}.jpg`;
                const formData = new FormData();
                formData.append('file', {
                    uri: selfieUri,
                    name: fileName,
                    type: 'image/jpeg',
                } as any);

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('attendance-proofs')
                    .upload(fileName, formData);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attendance-proofs')
                    .getPublicUrl(fileName);

                selfieUrl = publicUrl;
            } catch (err: any) {
                console.error('Selfie upload failed:', err);
                // Continue with clock-in even if selfie upload fails, or block it? 
                // For now, let's just log and continue or block based on requirements.
            }
        }

        const { data, error } = await (supabase as any)
            .from('attendance')
            .insert({
                user_id: user.id,
                check_in: new Date().toISOString(),
                status: 'active',
                selfie_url: selfieUrl
            })
            .select()
            .single();

        if (error) {
            Alert.alert('Error', 'Failed to clock in: ' + error.message);
        } else {
            setActiveAttendance(data);
        }
    }

    async function clockOut() {
        if (!user || !activeAttendance) return;

        const { error } = await (supabase as any)
            .from('attendance')
            .update({
                check_out: new Date().toISOString(),
                status: 'completed'
            })
            .eq('id', activeAttendance.id);

        if (error) {
            Alert.alert('Error', 'Failed to clock out: ' + error.message);
        } else {
            setActiveAttendance(null);
            Alert.alert('Success', 'Clock out successful!');
        }
    }

    return { activeAttendance, loading, clockIn, clockOut, refresh: fetchActiveAttendance };
}
