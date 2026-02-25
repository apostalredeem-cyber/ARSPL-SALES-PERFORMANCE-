import React, { useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { useOfflineQueue, PendingAction } from '../hooks/useOfflineQueue';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

/**
 * SyncEngine: Monitors connectivity and auto-processes the offline queue.
 * Designed to be a phantom component rendered at the root level.
 */
export const SyncEngine = () => {
    const { queue, popAction, updateRetryCount, isLoaded } = useOfflineQueue();
    const isSyncing = useRef(false);

    const processAction = async (action: PendingAction) => {
        try {
            let error = null;
            let data = null;

            if (action.type === 'ADD_AREA') {
                const result = await (supabase as any)
                    .from('areas')
                    .insert(action.payload)
                    .select();
                error = result.error;
                data = result.data?.[0];
            } else if (action.type === 'ADD_LEAD') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    console.error('SyncEngine: No authenticated user, skipping lead insert');
                    return false;
                }
                // Only columns that exist in the leads table schema
                const leadPayload = {
                    name: action.payload.name,
                    phone_number: action.payload.phone_number,
                    area_id: action.payload.area_id,
                    status: action.payload.status || 'New Lead',
                    expected_value: action.payload.expected_value || 0,
                    assigned_staff_id: user.id,
                    created_by: user.id,
                };
                console.log('Insert payload:', leadPayload);
                const result = await (supabase as any)
                    .from('leads')
                    .insert(leadPayload)
                    .select();
                error = result.error;
                if (error) console.error('Supabase error:', error);
                data = result.data?.[0];
            }

            if (error) {
                // Handle Idempotency: If conflict/duplicate, treat as success (already synced)
                if (error.code === '23505') {
                    console.log('SyncEngine: Idempotent success (duplicate)', action.id);
                    await popAction(action.id);
                    return true;
                }
                throw error;
            }

            console.log('SyncEngine: Success', action.id, data);
            await popAction(action.id);
            return true;
        } catch (err) {
            console.error('SyncEngine: Action failed', action.id, err);
            await updateRetryCount(action.id);
            return false;
        }
    };

    const runSync = async () => {
        if (isSyncing.current || queue.length === 0) return;

        const state = await Network.getNetworkStateAsync();
        if (!state.isConnected || !state.isInternetReachable) return;

        isSyncing.current = true;
        console.log('SyncEngine: Starting sync for', queue.length, 'actions');

        // Process FIFO
        const actionsToProcess = [...queue].sort((a, b) => a.createdAt - b.createdAt);

        for (const action of actionsToProcess) {
            if (action.retryCount >= 5) continue; // Skip stalled actions
            const success = await processAction(action);
            if (!success) break; // Stop batch on first failure to maintain order
        }

        isSyncing.current = false;

        // Notify UI (Optional Event if needed, for now we let state sync)
        if (queue.length === 0) {
            // Success toast logic could go here or in a dedicated notifier
        }
    };

    useEffect(() => {
        if (isLoaded && queue.length > 0) {
            runSync();
        }
    }, [isLoaded, queue.length]);

    // Periodically check or listen for connectivity regain
    useEffect(() => {
        const interval = setInterval(runSync, 30000); // Heartbeat sync check every 30s
        return () => clearInterval(interval);
    }, []);

    return null; // Phantom component
};
