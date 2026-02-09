import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DailyTravelSummary {
    id: string;
    staff_id: string;
    date: string;
    total_km: number;
    travel_amount: number;
    gps_log_count: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    approved_at: string | null;
    approved_by: string | null;
}

interface WeeklySummary {
    week_start: string;
    week_end: string;
    total_km: number;
    total_amount: number;
    days_count: number;
    approved_count: number;
    pending_count: number;
}

export const useTravelSummary = () => {
    const { user } = useAuth();
    const [dailySummary, setDailySummary] = useState<DailyTravelSummary | null>(null);
    const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
    const [weeklyDetails, setWeeklyDetails] = useState<DailyTravelSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDailySummary = async (date?: string) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        const targetDate = date || new Date().toISOString().split('T')[0];

        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('daily_travel_summary')
                .select('*')
                .eq('staff_id', user.id)
                .eq('date', targetDate)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            setDailySummary(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeklySummary = async (weekStart?: string) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        // Get Monday of current week if not provided
        const getMonday = (date: Date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        };

        const monday = weekStart ? new Date(weekStart) : getMonday(new Date());
        const mondayStr = monday.toISOString().split('T')[0];

        try {
            // Call the database function
            const { data, error: fetchError } = await (supabase as any)
                .rpc('get_weekly_travel_summary', {
                    p_staff_id: user.id,
                    p_week_start: mondayStr,
                });

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                setWeeklySummary(data[0]);
            }

            // Also fetch detailed daily records for the week
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            const sundayStr = sunday.toISOString().split('T')[0];

            const { data: detailsData, error: detailsError } = await (supabase as any)
                .from('daily_travel_summary')
                .select('*')
                .eq('staff_id', user.id)
                .gte('date', mondayStr)
                .lte('date', sundayStr)
                .order('date', { ascending: true });

            if (detailsError) throw detailsError;

            setWeeklyDetails(detailsData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshTodaySummary = async () => {
        await fetchDailySummary();
    };

    return {
        dailySummary,
        weeklySummary,
        weeklyDetails,
        loading,
        error,
        fetchDailySummary,
        fetchWeeklySummary,
        refreshTodaySummary,
    };
};
