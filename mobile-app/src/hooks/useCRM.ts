import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineQueue } from './useOfflineQueue';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AREAS_STORAGE_KEY = 'arspl_cached_areas';

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

      const pendingAreas = queue
        .filter((a: any) => a.type === 'ADD_AREA')
        .map((a: any) => ({
          ...a.payload,
          id: a.id,
          isPending: true,
        }));

      const finalData = [...(data || []), ...pendingAreas];

      setAreas(finalData);

      await AsyncStorage.setItem(
        AREAS_STORAGE_KEY,
        JSON.stringify(finalData)
      );

    } catch (err: any) {
      const cached = await AsyncStorage.getItem(AREAS_STORAGE_KEY);
      if (cached) {
        setAreas(JSON.parse(cached));
      }
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
        return { id: 'pending', ...payload, isPending: true };
      }

      const { data, error: insertError } = await supabase
        .from('areas')
        .insert(payload)
        .select();

      if (insertError) {
        if ((insertError as any).code === '23505') {
          setError('This area already exists.');
          return null;
        }

        await pushAction('ADD_AREA', payload);
        return { id: 'pending', ...payload, isPending: true };
      }

      await fetchAreas();
      return data?.[0] || null;

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
        return { id: 'pending', ...payload, isPending: true };
      }

      const { data, error: insertError } = await supabase
        .from('leads')
        .insert(payload)
        .select();

      if (insertError) {
        if ((insertError as any).code === '23505') {
          return { error: 'duplicate' };
        }

        await pushAction('ADD_LEAD', payload);
        return { id: 'pending', ...payload, isPending: true };
      }

      return data?.[0] || null;

    } catch {
      const payload = { ...leadData, assigned_staff_id: user?.id };
      await pushAction('ADD_LEAD', payload);
      return { id: 'pending', ...payload, isPending: true };
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsInArea = async (areaId: string) => {
    if (!areaId) return [];

    setLoading(true);

    try {
      const { data } = await supabase
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
    const init = async () => {
      const cached = await AsyncStorage.getItem(AREAS_STORAGE_KEY);
      if (cached) {
        setAreas(JSON.parse(cached));
      }

      await fetchAreas();
    };

    init();
  }, [queue.length]);

  return {
    areas,
    loading,
    error,
    fetchAreas,
    addArea,
    addLead,
    fetchLeadsInArea,
    pendingCount: queue.length,
  };
};