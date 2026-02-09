import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lead } from './useLeads';

export interface Meeting {
    id: string;
    work_plan_id: string;
    lead_id: string;
    sequence: number;
    objective: string;
    priority: 'low' | 'med' | 'high';
    expected_value: number;
    status: 'pending' | 'visited' | 'missed';
    lead?: Lead;
}

export interface DailyWorkPlan {
    id: string;
    staff_id: string;
    date: string;
    expected_start_time: string;
    expected_end_time: string;
    status: 'draft' | 'active' | 'completed';
    created_at: string;
    activated_at: string | null;
    completed_at: string | null;
    meetings: Meeting[];
}

/**
 * Hook for managing the Daily Work Plan.
 * Migrated to a relational structure using work_plan_meetings table.
 */
export const useDailyWorkPlan = () => {
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState<DailyWorkPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchTodayPlan();
        }
    }, [user?.id]);

    const fetchTodayPlan = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Fetch the work plan safely (avoiding .single() as per guardrails)
            const { data: plans, error: planError } = await (supabase as any)
                .from('daily_work_plans')
                .select('*')
                .eq('staff_id', user.id)
                .eq('date', today)
                .limit(1);

            if (planError) throw planError;

            if (!plans || plans.length === 0) {
                setCurrentPlan(null);
                return;
            }

            const planData = plans[0];

            // 2. Fetch associated meetings with lead details
            // Null-safe join: lead may be null if data is missing or leads table is empty
            const { data: meetingData, error: meetingError } = await (supabase as any)
                .from('work_plan_meetings')
                .select('*, lead:leads(*)')
                .eq('work_plan_id', planData.id)
                .order('sequence');

            if (meetingError) throw meetingError;

            // Safe meetings aggregation
            setCurrentPlan({
                ...planData,
                meetings: (meetingData || []).map((m: any) => ({
                    ...m,
                    lead: m.lead || null // Explicit null for missing leads
                }))
            });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch today\'s plan');
        } finally {
            setLoading(false);
        }
    };

    const createWorkPlan = async (
        plannedLeads: { lead_id: string; sequence: number; objective?: string; priority?: string; expected_value?: number }[],
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
            // 1. Insert the main work plan record
            const { data: plan, error: planError } = await (supabase as any)
                .from('daily_work_plans')
                .insert({
                    staff_id: user.id,
                    date: today,
                    expected_start_time: expectedStartTime,
                    expected_end_time: expectedEndTime,
                    status: 'draft',
                })
                .select()
                .single();

            if (planError) throw planError;

            // 2. Insert relational meetings
            if (plannedLeads.length > 0) {
                const meetingsToInsert = plannedLeads.map(item => ({
                    work_plan_id: plan.id,
                    lead_id: item.lead_id,
                    sequence: item.sequence,
                    objective: item.objective || 'Intro',
                    priority: item.priority || 'med',
                    expected_value: item.expected_value || 0,
                    status: 'pending'
                }));

                const { error: mError } = await (supabase as any)
                    .from('work_plan_meetings')
                    .insert(meetingsToInsert);

                if (mError) throw mError;
            }

            await fetchTodayPlan(); // Refresh full relational data
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create work plan');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const activateWorkPlan = async (planId: string) => {
        if (!user) return false;
        try {
            const { error: err } = await (supabase as any)
                .from('daily_work_plans')
                .update({ status: 'active', activated_at: new Date().toISOString() })
                .eq('id', planId);
            if (err) throw err;
            await fetchTodayPlan();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const completeWorkPlan = async (planId: string) => {
        if (!user) return false;
        try {
            const { error: err } = await (supabase as any)
                .from('daily_work_plans')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', planId);
            if (err) throw err;
            await fetchTodayPlan();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const addMeeting = async (meeting: {
        lead_id: string;
        sequence: number;
        objective?: string;
        expected_value?: number;
        priority?: 'low' | 'med' | 'high';
    }) => {
        if (!user || !currentPlan) return false;

        try {
            const { error: mError } = await (supabase as any)
                .from('work_plan_meetings')
                .insert({
                    work_plan_id: currentPlan.id,
                    lead_id: meeting.lead_id,
                    sequence: meeting.sequence,
                    objective: meeting.objective || 'Intro',
                    priority: meeting.priority || 'med',
                    expected_value: meeting.expected_value || 0,
                    status: 'pending'
                });

            if (mError) throw mError;
            await fetchTodayPlan();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const hasActiveWorkPlan = () => currentPlan?.status === 'active';
    const hasTodayWorkPlan = () => currentPlan !== null;

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
