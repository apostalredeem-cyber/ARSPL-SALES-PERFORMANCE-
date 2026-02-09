import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DailyWorkPlan {
    id: string;
    staff_id: string;
    date: string;
    planned_leads: any[];
    planned_route: any;
    expected_start_time: string;
    expected_end_time: string;
    status: 'draft' | 'active' | 'completed';
    created_at: string;
    activated_at: string | null;
    completed_at: string | null;
}

export const useDailyWorkPlan = () => {
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState<DailyWorkPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchTodayPlan();
        }
    }, [user]);

    const fetchTodayPlan = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];

        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('daily_work_plans')
                .select('*')
                .eq('staff_id', user.id)
                .eq('date', today)
                .limit(1);

            if (fetchError) {
                throw fetchError;
            }

            setCurrentPlan(data && data.length > 0 ? data[0] : null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createWorkPlan = async (
        plannedLeads: any[],
        expectedStartTime: string,
        expectedEndTime: string
    ) => {
        if (!user) {
            setError('User not authenticated');
            return null;
        }

        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];

        try {
            // Re-verify user existence for safety
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const targetId = authUser?.id || user?.id;

            if (!targetId) {
                throw new Error('User identification failed. Please try logging in again.');
            }

            const { data, error: createError } = await (supabase as any)
                .from('daily_work_plans')
                .insert({
                    staff_id: targetId, // Explicitly ensure ID is sent
                    date: today,
                    planned_leads: plannedLeads,
                    expected_start_time: expectedStartTime,
                    expected_end_time: expectedEndTime,
                    status: 'draft',
                })
                .select()
                .limit(1);

            if (createError) {
                console.error('Supabase Insert Error:', createError);
                throw createError;
            }

            const insertedData = data && data.length > 0 ? data[0] : null;
            setCurrentPlan(insertedData);
            return insertedData;
        } catch (err: any) {
            const errorMsg = err.message || err.details || 'Unknown database error';
            setError(errorMsg);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const activateWorkPlan = async (planId: string) => {
        if (!user) {
            setError('User not authenticated');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: updateError } = await (supabase as any)
                .from('daily_work_plans')
                .update({
                    status: 'active',
                    activated_at: new Date().toISOString(),
                })
                .eq('id', planId)
                .eq('staff_id', user.id)
                .select()
                .limit(1);

            if (updateError) throw updateError;

            const updatedData = data && data.length > 0 ? data[0] : null;
            setCurrentPlan(updatedData);
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const completeWorkPlan = async (planId: string) => {
        if (!user) {
            setError('User not authenticated');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: updateError } = await (supabase as any)
                .from('daily_work_plans')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', planId)
                .eq('staff_id', user.id)
                .select()
                .limit(1);

            if (updateError) throw updateError;

            const completedData = data && data.length > 0 ? data[0] : null;
            setCurrentPlan(completedData);
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const addMeeting = async (meeting: {
        name: string;
        sequence: number;
    }) => {
        if (!user || !currentPlan) {
            setError('User not authenticated or no active plan');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const updatedLeads = [...(currentPlan.planned_leads ?? []), meeting];

            const { data, error: updateError } = await (supabase as any)
                .from('daily_work_plans')
                .update({
                    planned_leads: updatedLeads,
                })
                .eq('id', currentPlan.id)
                .select()
                .limit(1);

            if (updateError) throw updateError;

            const updatedData = data && data.length > 0 ? data[0] : null;
            setCurrentPlan(updatedData);
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const hasActiveWorkPlan = () => {
        return currentPlan?.status === 'active';
    };

    const hasTodayWorkPlan = () => {
        return currentPlan !== null;
    };

    return {
        currentPlan,
        loading,
        error,
        fetchTodayPlan,
        createWorkPlan,
        activateWorkPlan,
        completeWorkPlan,
        addMeeting,
        hasActiveWorkPlan,
        hasTodayWorkPlan,
    };
};
