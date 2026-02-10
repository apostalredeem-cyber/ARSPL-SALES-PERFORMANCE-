import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineQueue } from './useOfflineQueue';
import * as Network from 'expo-network';

export interface Area {
    id: string;
    name: string;
    city?: string;
    isPending?: boolean;
}

export interface Lead {
    id: string;
    name: string;
    phone_number: string;
    area_id: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    areas?: Area;
    isPending?: boolean;
}

/**
 * Hook for Phase 3 Lite CRM functionality.
 * Manages manual Area and Lead (Party) creation with offline support.
 */
export const useCRM = () => {
    const { user } = useAuth();
    const { pushAction, queue } = useOfflineQueue();
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOnline = async () => {
        const state = await Network.getNetworkStateAsync();
        return !!(state.isConnected && state.isInternetReachable);
    };

    const fetchAreas = async () => {
        setLoading(true);
        setError(null);
        try {
            const online = await isOnline();
            if (!online) {
                // Return offline areas + any pending ones
                // For simplicity in Lite, we assume local state is enough or we fetch cached
                // But we must at least show pending ones
            }

            const { data, error: fetchError } = await supabase
                .from('areas')
                .select('*')
                .order('name');

            if (fetchError) throw fetchError;

            // Merge with pending areas from queue
            const pendingAreas = queue
                .filter(a => a.type === 'ADD_AREA')
                .map(a => ({ ...a.payload, id: a.id, isPending: true }));

            setAreas([...(data || []), ...pendingAreas]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch areas');
        } finally {
            setLoading(false);
        }
    };

    const addArea = async (name: string, city?: string) => {
        if (!name.trim()) return null;
        setLoading(true);
        setError(null);
        try {
            const payload = { name: name.trim(), city: city?.trim() };
            const online = await isOnline();

            if (!online) {
                console.log('useCRM: Offline, queueing ADD_AREA');
                await pushAction('ADD_AREA', payload);
                await fetchAreas(); // Refresh to show pending
                return { id: 'pending', ...payload, isPending: true } as Area;
            }

            const { data, error: insertError } = await (supabase as any)
                .from('areas')
                .insert(payload)
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    setError('This area already exists in this city.');
                    return null;
                }
                // Fallback to queue on unexpected network error
                console.log('useCRM: Network error, queueing ADD_AREA');
                await pushAction('ADD_AREA', payload);
                return { id: 'pending', ...payload, isPending: true } as Area;
            }

            await fetchAreas();
            return data?.[0] as Area;
        } catch (err: any) {
            setError(err.message || 'Failed to add area');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addLead = async (leadData: Omit<Lead, 'id'>) => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: leadData.name.trim(),
                phone_number: leadData.phone_number.trim(),
                area_id: leadData.area_id,
                latitude: leadData.latitude,
                longitude: leadData.longitude,
                address: leadData.address?.trim(),
                assigned_staff_id: user?.id,
            };

            const online = await isOnline();

            if (!online) {
                console.log('useCRM: Offline, queueing ADD_LEAD');
                await pushAction('ADD_LEAD', payload);
                return { id: 'pending', ...payload, isPending: true } as Lead;
            }

            const { data, error: insertError } = await (supabase as any)
                .from('leads')
                .insert(payload)
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    setError('This phone number already exists.');
                    return { error: 'duplicate', message: 'This phone number already exists' };
                }
                console.log('useCRM: Network error, queueing ADD_LEAD');
                await pushAction('ADD_LEAD', payload);
                return { id: 'pending', ...payload, isPending: true } as Lead;
            }

            return data?.[0] as Lead;
        } catch (err: any) {
            console.log('useCRM: Catch error, queueing ADD_LEAD', err.message);
            // On catastrophic failure, try to save offline anyway
            const payload = { ...leadData, assigned_staff_id: user?.id };
            await pushAction('ADD_LEAD', payload);
            return { id: 'pending', ...payload, isPending: true } as any;
        } finally {
            setLoading(false);
        }
    };

    const fetchLeadsInArea = async (areaId: string) => {
        if (!areaId) return [];
        setLoading(true);
        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('leads')
                .select('*, areas(*)')
                .eq('area_id', areaId)
                .order('name');

            if (fetchError) throw fetchError;

            // Merge with pending leads in this area
            const pendingLeads = queue
                .filter(a => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
                .map(a => ({ ...a.payload, id: a.id, isPending: true }));

            return [...(data || []), ...pendingLeads] as Lead[];
        } catch (err: any) {
            setError(err.message || 'Failed to fetch leads in area');
            // If offline, return only pending ones for this area to allow planning
            const pendingLeads = queue
                .filter(a => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
                .map(a => ({ ...a.payload, id: a.id, isPending: true }));
            return pendingLeads as Lead[];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
    }, [queue.length]); // Re-fetch/merge when queue changes

    return {
        areas: Array.isArray(areas) ? areas : [],
        loading: !!loading,
        error: error ?? null,
        fetchAreas,
        addArea: typeof addArea === 'function' ? addArea : async () => null,
        addLead: typeof addLead === 'function' ? addLead : async () => null,
        fetchLeadsInArea: typeof fetchLeadsInArea === 'function' ? fetchLeadsInArea : async () => [],
        pendingCount: queue.length || 0
    };
};
