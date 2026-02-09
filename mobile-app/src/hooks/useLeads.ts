import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Lead {
    id: string;
    name: string;
    client_type: string;
    status: string;
    expected_value: number;
    last_visit_date: string | null;
    address?: string;
    contact_number?: string;
}

/**
 * Hook for managing assigned leads.
 * Handles fetching leads from Supabase with null-safe defaults.
 */
export const useLeads = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignedLeads = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('leads')
                .select('*')
                .eq('assigned_staff_id', user.id)
                .order('name');

            if (fetchError) throw fetchError;

            // Apply null-safe defaults
            const sanitizedLeads = ((data as any[]) || []).map(lead => ({
                ...lead,
                expected_value: lead.expected_value || 0,
                client_type: lead.client_type || 'Other',
                status: lead.status || 'New Lead'
            }));

            setLeads(sanitizedLeads);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAssignedLeads();
        }
    }, [user?.id]);

    return {
        leads,
        loading,
        error,
        fetchAssignedLeads
    };
};
