import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as Location from 'expo-location';

export interface VisitReportData {
    meeting_id: string; // Relational link to work_plan_meetings
    status: 'Completed' | 'Not Completed';
    discussion_summary: string;
    outcome?: 'Interested' | 'Quotation Given' | 'Order Confirmed' | 'No Interest';
    order_value?: number;
    expected_order_date?: string;
    next_action_date?: string;  // Follow-up date — triggers auto work plan scheduling
    photo_url?: string;
}

/**
 * Hook for submitting visit reports.
 * Enforces one report per meeting and captures GPS ONLY on submission.
 */
export const useVisitReports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitReport = async (reportData: VisitReportData) => {
        if (!user) {
            setError('User not authenticated');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            // Rule: Capture GPS location ONLY on visit report submission
            let locationString = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    locationString = `POINT(${location.coords.longitude} ${location.coords.latitude})`;
                }
            } catch (e) {
                console.warn('GPS capture failed for visit report submission:', e);
            }

            // Insert report - null-safe defaults for optional fields
            // Insert report - null-safe defaults for optional fields
            const { data, error: submitError } = await (supabase as any)
                .from('visit_reports')
                .insert({
                    meeting_id: reportData.meeting_id,
                    staff_id: user.id,
                    status: reportData.status,
                    discussion_summary: reportData.discussion_summary,
                    outcome: reportData.outcome || null,
                    order_value: reportData.order_value || 0,
                    expected_order_date: reportData.expected_order_date || null,
                    next_action_date: reportData.next_action_date || null,
                    photo_url: reportData.photo_url || null,
                    location: locationString
                })
                .select()
                .limit(1);

            if (submitError) {
                // Mandatory Guardrail: Detect unique constraint violation
                if (submitError.code === '23505' || submitError.message?.includes('unique constraint')) {
                    const duplicateError = 'Already Submitted: A visit report already exists for this meeting.';
                    setError(duplicateError);
                    return { error: 'duplicate', message: duplicateError };
                }
                throw submitError;
            }

            return data && data.length > 0 ? data[0] : null;
        } catch (err: any) {
            setError(err.message || 'Failed to submit report');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        submitReport
    };
};
