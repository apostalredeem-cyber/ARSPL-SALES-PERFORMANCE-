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
    // Removed start_time and end_time columns as they do not exist
    status: 'draft' | 'active' | 'completed';
    created_at: string;
    activated_at: string | null;
    completed_at: string | null;
    meetings: Meeting[];
    planned_route?: any; // To hold start_time, end_time, etc.
}

/**
 * Hook for managing the Daily Work Plan.
 * FIX: Removed start_time/end_time columns from insert.
 * FIX: Resolves business_id to UUID properly.
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
            // 1. Fetch the work plan safely
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
                    lead: m.lead || null
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
            // 1. Resolve business_ids to UUIDs
            const businessIds = plannedLeads.map(p => p.lead_id);
            const { data: leadsData, error: leadsError } = await (supabase as any)
                .from('leads')
                .select('id, business_id')
                .in('business_id', businessIds);

            if (leadsError) {
                console.error('Error resolving business IDs:', leadsError);
                throw leadsError;
            }

            // Map business_id to UUID
            const leadMap = new Map();
            leadsData?.forEach((l: any) => leadMap.set(l.business_id, l.id));

            const meetingsToInsert = [];
            const resolvedPointsForJson = [];

            for (const p of plannedLeads) {
                const uuid = leadMap.get(p.lead_id);
                if (!uuid) {
                    console.warn(`Lead not found for business_id: ${p.lead_id}`);
                    continue; // Skip invalid leads
                }

                // Prepare meeting record
                meetingsToInsert.push({
                    // work_plan_id will be added later
                    lead_id: uuid,
                    sequence: p.sequence,
                    objective: p.objective || 'Intro',
                    priority: p.priority || 'med',
                    expected_value: p.expected_value || 0,
                    status: 'pending'
                });

                // Prepare JSON record (keep original business_id or use UUID? keeping original input is usually better for reference, but UUID is safer)
                // User said: "Use UUID id in planned_leads"
                resolvedPointsForJson.push({
                    ...p,
                    lead_id: uuid // Replace business_id with UUID in the JSON storage as requested
                });
            }

            if (meetingsToInsert.length === 0) {
                throw new Error('No valid leads found to create plan.');
            }

            // 2. Prepare JSON structure for planned_route
            const plannedRouteJson = {
                start_time: expectedStartTime,
                end_time: expectedEndTime,
                points: resolvedPointsForJson
            };

            // 3. Insert the main work plan record
            // NOTE: removing expected_start_time and expected_end_time columns
            const { data: plan, error: planError } = await (supabase as any)
                .from('daily_work_plans')
                .insert({
                    staff_id: user.id,
                    date: today,
                    status: 'draft',
                    planned_route: plannedRouteJson
                })
                .select()
                .single();

            if (planError) {
                console.error('Error creating daily_work_plans:', planError);
                throw planError;
            }

            // 4. Insert relational meetings
            const finalMeetings = meetingsToInsert.map(m => ({
                work_plan_id: plan.id,
                ...m
            }));

            const { error: mError } = await (supabase as any)
                .from('work_plan_meetings')
                .insert(finalMeetings);

            if (mError) {
                console.error('Error creating work_plan_meetings:', mError);
                throw mError;
            }

            await fetchTodayPlan(); // Refresh full relational data
            return true;
        } catch (err: any) {
            console.error('createWorkPlan Exception:', err);
            setError(err.message || 'Failed to create work plan');
            return false;
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
        lead_id: string; // business_id expected from UI
        sequence: number;
        objective?: string;
        expected_value?: number;
        priority?: 'low' | 'med' | 'high';
    }) => {
        if (!user || !currentPlan) return false;

        try {
            // Resolve business_id
            const { data: leadData, error: leadError } = await (supabase as any)
                .from('leads')
                .select('id')
                .eq('business_id', meeting.lead_id)
                .single();

            if (leadError || !leadData) {
                throw new Error('Lead not found for business ID: ' + meeting.lead_id);
            }

            const { error: mError } = await (supabase as any)
                .from('work_plan_meetings')
                .insert({
                    work_plan_id: currentPlan.id,
                    lead_id: leadData.id,
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
