import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PlannedLead {
    lead_id: string;
    sequence: number;
    objective: string;
    expected_value: number;
    priority: string;
}

interface WorkPlan {
    id: string;
    date: string;
    status: string;
    planned_leads: PlannedLead[];
    planned_route?: any;
    expected_start_time?: string;
    expected_end_time?: string;
}

export const useDailyWorkPlan = () => {
    const [loading, setLoading] = useState(true); // Start as loading
    const [error, setError] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<WorkPlan | null>(null);

    /**
     * Fetches the current user's work plan for today.
     */
    const fetchTodayPlan = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const today = new Date().toISOString().split('T')[0];

            console.log('[WORKPLAN] Fetching for date:', today);

            // CRITICAL: Use exact schema - no nested relational selects
            const { data, error: queryError } = await (supabase as any)
                .from('daily_work_plans')
                .select('*')
                .eq('staff_id', user.id)
                .eq('date', today)
                .maybeSingle();

            if (queryError) {
                console.error('[WORKPLAN] Error fetching work plan:', queryError);
                return null;
            }

            console.log('[WORKPLAN] Response:', data);
            return data;

        } catch (err) {
            console.error('[WORKPLAN] fetchTodayPlan error:', err);
            return null;
        }
    };

    /**
     * Fetch on mount with guard to prevent double fetch and flicker.
     */
    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            const plan = await fetchTodayPlan();
            if (!isMounted) return;
            setCurrentPlan(plan || null);
            setLoading(false);
        };

        load();

        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array - mount once only

    /**
     * Checks if the current user has an ACTIVE work plan for today.
     * Draft plans are not considered as "having a plan" to allow creation.
     * 
     * @returns boolean - true if ACTIVE work plan exists for today, false otherwise
     */
    const hasTodayWorkPlan = (): boolean => {
        return currentPlan !== null && currentPlan.status === 'active';
    };

    /**
     * Checks if the current user has an active work plan for today.
     * 
     * @returns boolean - true if active work plan exists, false otherwise
     */
    const hasActiveWorkPlan = (): boolean => {
        return currentPlan !== null && currentPlan.status === 'active';
    };

    /**
     * Creates a new daily work plan with planned leads.
     * 
     * @param plannedLeads - Array of leads with sequence and metadata
     * @param startTime - Expected start time (NOT STORED - columns don't exist)
     * @param endTime - Expected end time (NOT STORED - columns don't exist)
     * @returns boolean - true if successful, false otherwise
     */
    const createWorkPlan = async (
        plannedLeads: PlannedLead[],
        startTime: string,
        endTime: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Validate input
            if (!plannedLeads || plannedLeads.length === 0) {
                throw new Error('No leads provided for work plan');
            }

            // Create the work plan using EXACT schema
            const today = new Date().toISOString().split('T')[0];

            const { data: workPlan, error: planError } = await (supabase as any)
                .from('daily_work_plans')
                .insert({
                    date: today,
                    planned_leads: plannedLeads,
                    status: 'active'
                    // staff_id set by DB trigger
                    // Note: expected_start_time and expected_end_time columns do not exist
                })
                .select()
                .single();

            if (planError) {
                console.error('Work plan creation error:', planError);
                throw new Error(planError.message || 'Failed to create work plan');
            }

            if (!workPlan) {
                throw new Error('Work plan created but no data returned');
            }

            // Refresh current plan
            const refreshedPlan = await fetchTodayPlan();
            if (refreshedPlan) {
                setCurrentPlan(refreshedPlan);
            }

            return true;

        } catch (err: any) {
            console.error('Create work plan error:', err);
            setError(err.message || 'An unexpected error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Updates an existing work plan with new planned leads.
     * Used for manual route addition.
     */
    const updateWorkPlan = async (plannedLeads: PlannedLead[]): Promise<boolean> => {
        if (!currentPlan) return false;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error: updateError } = await (supabase as any)
                .from('daily_work_plans')
                .update({ planned_leads: plannedLeads })
                .eq('id', currentPlan.id);

            if (updateError) {
                console.error('[WORKPLAN] Update error:', updateError);
                return false;
            }

            // Refresh local state
            const refreshedPlan = await fetchTodayPlan();
            if (refreshedPlan) {
                setCurrentPlan(refreshedPlan);
            }

            return true;
        } catch (err) {
            console.error('[WORKPLAN] Update failed:', err);
            return false;
        }
    };

    return {
        currentPlan,
        hasTodayWorkPlan,
        hasActiveWorkPlan,
        createWorkPlan,
        updateWorkPlan,
        loading,
        error,
        fetchTodayPlan, // Expose for manual refresh
    };
};
