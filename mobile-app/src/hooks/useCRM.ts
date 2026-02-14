import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineQueue } from './useOfflineQueue';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const AREAS_STORAGE_KEY = 'arspl_cached_areas';

export interface Area {
  id: string;
  name: string;
  city?: string;
  isPending?: boolean;
}

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  phone_number: string;
  area_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  areas?: Area;
  isPending?: boolean;
  expected_value?: number;
  client_type?: string;
}

export const useCRM = () => {
  const { user } = useAuth();
  const { pushAction, queue } = useOfflineQueue();

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track mounting status to avoid state updates on unmounted components
  const isMounted = useRef(true);

  const isOnline = async () => {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable);
  };

  const fetchAreas = useCallback(async () => {
    if (!isMounted.current) return;
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

      // Deduplicate: exact name match
      const existingNames = new Set((data || []).map((d: any) => d.name.toLowerCase()));
      const uniquePending = pendingAreas.filter((p: { name: string }) => !existingNames.has(p.name.toLowerCase()));

      const finalData = [...(data || []), ...uniquePending];

      if (isMounted.current) {
        setAreas(finalData);
        await AsyncStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(finalData));
      }

    } catch (err: any) {
      const cached = await AsyncStorage.getItem(AREAS_STORAGE_KEY);
      if (cached && isMounted.current) {
        setAreas(JSON.parse(cached));
      }
      if (isMounted.current) setError(err.message || 'Failed to fetch areas');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [queue]);

  const addArea = async (name: string, city?: string) => {
    if (!name.trim()) return null;

    setLoading(true);
    setError(null);

    try {
      const payload = { name: name.trim(), city: city?.trim() };
      const online = await isOnline();

      if (!online) {
        await pushAction('ADD_AREA', payload);
        await fetchAreas(); // Refresh to show pending
        return { id: 'pending', ...payload, isPending: true };
      }

      const { data, error: insertError } = await (supabase as any)
        .from('areas')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This area already exists.');
          return null;
        }
        // Fallback to offline on other errors if appropriate, or just error out
        throw insertError;
      }

      await fetchAreas();
      return data;

    } catch (err: any) {
      setError(err.message || 'Failed to add area');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addLead = async (leadData: Omit<Lead, 'id' | 'business_id'>) => {
    if (!user) {
      setError('You must be logged in.');
      return null;
    }

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
        assigned_staff_id: user.id,
        created_by: user.id, // Explicitly set for RLS `check (auth.uid() = created_by)`
        client_type: leadData.client_type || 'Retailer',
      };

      const online = await isOnline();

      if (!online) {
        await pushAction('ADD_LEAD', payload);
        return { id: `temp_${Date.now()}`, ...payload, isPending: true, business_id: 'PENDING' };
      }

      // Insert and return single row
      const { data, error: insertError } = await (supabase as any)
        .from('leads')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return { error: 'duplicate' };
        }
        throw insertError;
      }

      return data; // Returns the full row with business_id

    } catch (err: any) {
      console.error('Add Lead Error:', err);
      // Fallback: queue it if it was a network error, otherwise return null
      // For now, simple error return
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsInArea = async (areaId: string) => {
    if (!areaId) return [];

    // Don't set global loading here to avoid flickering logic in components that call this in effect
    // local loading state in component is better

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, areas(*)')
        .eq('area_id', areaId)
        .order('name');

      if (error) throw error;

      // Merge pending leads from offline queue
      const pendingLeads = queue
        .filter((a: any) => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
        .map((a: any) => ({
          ...a.payload,
          id: `pending_${Math.random().toString(36).substr(2, 9)}`,
          business_id: 'PENDING',
          isPending: true,
          areas: areas.find(area => area.id === areaId) // Mock the relation
        }));

      // Convert data to ensure consistent shape if needed
      const serverLeads = data || [];

      // Combine: Pending first so user sees them
      return [...pendingLeads, ...serverLeads];

    } catch (err) {
      console.error('Error fetching leads:', err);
      // If offline, still return pending leads
      const pendingLeads = queue
        .filter((a: any) => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
        .map((a: any) => ({
          ...a.payload,
          id: `pending_${Math.random().toString(36).substr(2, 9)}`,
          business_id: 'PENDING',
          isPending: true,
          areas: areas.find(area => area.id === areaId)
        }));
      return pendingLeads;
    }
  };

  // Initial load
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      const init = async () => {
        const cached = await AsyncStorage.getItem(AREAS_STORAGE_KEY);
        if (cached && isMounted.current) {
          setAreas(JSON.parse(cached));
        }
        fetchAreas();
      };
      init();
      return () => { isMounted.current = false; };
    }, [fetchAreas])
  );

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