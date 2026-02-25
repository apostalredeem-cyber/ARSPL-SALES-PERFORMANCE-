import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineQueue } from './useOfflineQueue';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const AREAS_STORAGE_KEY = 'arspl_cached_areas';

// UUID Utilities
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

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
  const { pushAction, queue, popAction } = useOfflineQueue();

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Use a ref to track mounting status to avoid state updates on unmounted components
  const isMounted = useRef(true);

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
          id: a.id || generateUUID(), // Ensure UUID format
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

      if (!isOnline) {
        const tempId = generateUUID();
        await pushAction('ADD_AREA', { ...payload, id: tempId });
        await fetchAreas(); // Refresh to show pending
        return { id: tempId, ...payload, isPending: true };
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Authentication required.');
        return null;
      }

      // Only columns that exist in the leads table schema
      const payload = {
        name: leadData.name.trim(),
        phone_number: leadData.phone_number.trim(),
        area_id: leadData.area_id,
        status: 'New Lead',
        expected_value: leadData.expected_value || 0,
        assigned_staff_id: authUser.id,
        created_by: authUser.id,
      };

      console.log('Insert payload:', payload);

      if (!isOnline) {
        const tempId = generateUUID();
        await pushAction('ADD_LEAD', payload);
        return { id: tempId, ...payload, isPending: true, business_id: 'PENDING' };
      }

      // Insert and return single row
      const { data, error: insertError } = await (supabase as any)
        .from('leads')
        .insert(payload)
        .select()
        .single();

      console.log('Insert payload:', payload);
      if (insertError) {
        console.error('Supabase error:', insertError);
        if (insertError.code === '23505') {
          return { error: 'duplicate' };
        }
        throw insertError;
      }

      return data; // Returns the full row with business_id

    } catch (err: any) {
      console.error('Supabase error:', err);
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
      // UUID Guard: Block non-UUID values from reaching Supabase
      if (!isValidUUID(areaId)) {
        console.warn(`[useCRM] Blocked non-UUID area_id from Supabase query: ${areaId}`);
        // Return only pending leads for this non-UUID area
        const pendingLeads = queue
          .filter((a: any) => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
          .map((a: any) => ({
            ...a.payload,
            id: a.id || generateUUID(),
            business_id: 'PENDING',
            isPending: true,
            areas: areas.find(area => area.id === areaId)
          }));
        return pendingLeads;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('Supabase error: No authenticated user for fetchLeadsInArea');
        return [];
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*, areas(*)')
        .eq('area_id', areaId)
        .eq('assigned_staff_id', authUser.id)
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Merge pending leads from offline queue
      const pendingLeads = queue
        .filter((a: any) => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
        .map((a: any) => ({
          ...a.payload,
          id: a.id || generateUUID(),
          business_id: 'PENDING',
          isPending: true,
          areas: areas.find(area => area.id === areaId) // Mock the relation
        }));

      // Convert data to ensure consistent shape if needed
      const serverLeads = data || [];
      const serverPhones = new Set(serverLeads.map((l: any) => l.phone_number));

      // Deduplicate: Filter pending leads that are already in server response (by phone)
      const uniquePending = pendingLeads.filter((p: any) => !serverPhones.has(p.phone_number));

      // Combine: Pending first so user sees them
      return [...uniquePending, ...serverLeads];

    } catch (err) {
      console.error('Error fetching leads:', err);
      // If offline, still return pending leads
      const pendingLeads = queue
        .filter((a: any) => a.type === 'ADD_LEAD' && a.payload.area_id === areaId)
        .map((a: any) => ({
          ...a.payload,
          id: a.id || generateUUID(),
          business_id: 'PENDING',
          isPending: true,
          areas: areas.find(area => area.id === areaId)
        }));
      return pendingLeads;
    }
  };

  // SYNC ENGINE: Process offline queue with idempotent behavior
  const processQueue = useCallback(async () => {
    if (isSyncing) {
      console.log('[SYNC] Already syncing, skipping...');
      return;
    }

    if (queue.length === 0) {
      console.log('[SYNC] Queue is empty, nothing to sync');
      return;
    }

    if (!isOnline) {
      console.log('[SYNC] Offline, cannot sync');
      return;
    }

    console.log(`[SYNC] Starting queue processing. Queue length: ${queue.length}`);
    setIsSyncing(true);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        console.log(`[SYNC] Processing action ${i + 1}/${queue.length}:`, action.type);

        try {
          if (action.type === 'ADD_AREA') {
            console.log('[SYNC] Inserting area:', action.payload.name);

            // No UUID validation needed for areas (no foreign keys)

            const { data, error } = await (supabase as any)
              .from('areas')
              .insert({
                name: action.payload.name,
                city: action.payload.city,
                created_by: user?.id,
              })
              .select()
              .single();

            if (error) {
              // Check if duplicate (unique constraint violation)
              if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                console.log('[SYNC] Area already exists (duplicate), treating as success');
                await popAction(action.id);
                skipCount++;
                continue;
              }
              throw error;
            }

            console.log('[SYNC] Area inserted successfully:', data.id);
            await popAction(action.id);
            successCount++;

          } else if (action.type === 'ADD_LEAD') {
            console.log('[SYNC] Inserting lead:', action.payload.name);

            // UUID VALIDATION: Verify area_id is valid UUID
            if (!isValidUUID(action.payload.area_id)) {
              console.error('[SYNC] Invalid UUID for area_id:', action.payload.area_id);
              console.error('[SYNC] Skipping lead sync - invalid foreign key');
              await popAction(action.id);
              errorCount++;
              continue;
            }

            // Only columns that exist in the leads table schema
            const leadPayload = {
              name: action.payload.name,
              phone_number: action.payload.phone_number,
              area_id: action.payload.area_id,
              status: action.payload.status || 'New Lead',
              expected_value: action.payload.expected_value || 0,
              assigned_staff_id: user?.id,
              created_by: user?.id,
            };

            console.log('Insert payload:', leadPayload);

            const { data, error } = await (supabase as any)
              .from('leads')
              .insert(leadPayload)
              .select()
              .single();

            if (error) {
              console.error('Supabase error:', error);
            }

            if (error) {
              // Check if duplicate (unique constraint violation on phone_number)
              if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                console.log('[SYNC] Lead already exists (duplicate phone), treating as success');
                await popAction(action.id);
                skipCount++;
                continue;
              }
              throw error;
            }

            console.log('[SYNC] Lead inserted successfully:', data.id);
            await popAction(action.id);
            successCount++;
          }

        } catch (actionError: any) {
          console.error(`[SYNC] Failed to sync action ${i + 1}:`, actionError.message);

          // Only stop for critical errors
          const isCriticalError =
            actionError.message?.includes('JWT') ||
            actionError.message?.includes('auth') ||
            actionError.message?.includes('network') ||
            actionError.message?.includes('fetch') ||
            actionError.code === 'PGRST301' || // JWT expired
            actionError.code === 'PGRST204'; // No connection

          if (isCriticalError) {
            console.error('[SYNC] Critical error detected, stopping queue processing');
            errorCount++;
            break;
          } else {
            // Non-critical error: log and continue
            console.warn('[SYNC] Non-critical error, removing action and continuing');
            await popAction(action.id);
            errorCount++;
          }
        }
      }

      console.log(`[SYNC] Queue processing complete. Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

      // Refresh areas after sync
      if (successCount > 0 || skipCount > 0) {
        await fetchAreas();
      }

    } catch (err: any) {
      console.error('[SYNC] Queue processing fatal error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [queue, isOnline, isSyncing, user, popAction, fetchAreas]);

  // Network detection and auto-sync (mounts only once)
  useEffect(() => {
    console.log('[SYNC] Setting up network listener');
    let isSubscribed = true;

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      if (!isSubscribed) return;

      const online = !!(state.isConnected && state.isInternetReachable);
      console.log('[SYNC] Network state changed. Online:', online);
      setIsOnline(online);

      // Trigger sync when coming online
      if (online && queue.length > 0) {
        console.log('[SYNC] Network restored, triggering sync...');
        setTimeout(() => processQueue(), 500); // Debounce
      }
    });

    // Initial network check and sync attempt
    NetInfo.fetch().then((state: any) => {
      if (!isSubscribed) return;

      const online = !!(state.isConnected && state.isInternetReachable);
      console.log('[SYNC] Initial network check. Online:', online);
      setIsOnline(online);

      if (online && queue.length > 0) {
        console.log('[SYNC] App started with pending queue, triggering sync...');
        setTimeout(() => processQueue(), 1000); // Delay to avoid mount race
      }
    });

    return () => {
      console.log('[SYNC] Cleaning up network listener');
      isSubscribed = false;
      unsubscribe();
    };
  }, []); // Empty deps - mount once only

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
    isOnline,
    isSyncing,
    forceSync: processQueue, // Manual sync trigger
  };
};