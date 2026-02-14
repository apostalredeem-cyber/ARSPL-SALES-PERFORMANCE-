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
        try {
            const { data } = await (supabase as any)
                .from('attendance')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1);

            if (data && data.length > 0) setActiveAttendance(data[0]);
            else setActiveAttendance(null);
        } catch (err) {
            console.error('Error fetching attendance:', err);
            setActiveAttendance(null);
        } finally {
            setLoading(false);
        }
    }

    async function clockIn(selfieUri?: string) {
        if (!user) return;

        let selfieUrl = null;
        if (selfieUri) {
            try {
                const fileName = `selfie_${user.id}_${Date.now()}.jpg`;
                const bucketName = 'attendance-proofs';

                console.log('[SELFIE] Uploading to bucket:', bucketName);
                console.log('[SELFIE] File name:', fileName);
                console.log('[SELFIE] URI:', selfieUri);

                // Fetch the file as blob for React Native
                const response = await fetch(selfieUri);
                const blob = await response.blob();

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(fileName, blob, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('[SELFIE] Upload error:', uploadError);
                    console.error('[SELFIE] Error code:', uploadError.statusCode);
                    console.error('[SELFIE] Error message:', uploadError.message);
                    throw uploadError;
                }

                console.log('[SELFIE] Upload successful:', uploadData);

                const { data: { publicUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(fileName);

                selfieUrl = publicUrl;
                console.log('[SELFIE] Public URL:', publicUrl);

            } catch (err: any) {
                console.error('[SELFIE] Upload failed:', err);
                console.error('[SELFIE] Error details:', JSON.stringify(err, null, 2));
                console.warn('[SELFIE] Continuing clock-in without selfie');
                // Continue with clock-in even if selfie upload fails
                selfieUrl = null;
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
