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
            const { data, error: fetchError } = await supabase
                .from('areas')
                .select('*')
                .order('name');

            if (fetchError) throw fetchError;

            // Merge with pending areas
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
                await pushAction('ADD_AREA', payload);
                await fetchAreas();
                return { id: 'pending', ...payload, isPending: true } as Area;
            }

            const { data, error: insertError } = await (supabase as any)
                .from('areas')
                .insert(payload)
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    setError('This area already exists.');
                    return null;
                }
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
                await pushAction('ADD_LEAD', payload);
                return { id: 'pending', ...payload, isPending: true } as Lead;
            }

            const { data, error: insertError } = await (supabase as any)
                .from('leads')
                .insert(payload)
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    return { error: 'duplicate' };
                }
                await pushAction('ADD_LEAD', payload);
                return { id: 'pending', ...payload, isPending: true } as Lead;
            }

            return data?.[0] as Lead;
        } catch (err: any) {
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
            const { data } = await (supabase as any)
                .from('leads')
                .select('*, areas(*)')
                .eq('area_id', areaId)
                .order('name');
            return data || [];
        } catch {
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
    }, [queue.length]);

    // NEVER return undefined
    return {
        areas: areas || [],
        loading: !!loading,
        error: error || null,
        fetchAreas,
        addArea,
        addLead,
        fetchLeadsInArea,
        pendingCount: queue.length || 0
    };
};
