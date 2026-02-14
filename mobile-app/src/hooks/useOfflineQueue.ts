import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback, useEffect } from 'react';

export type ActionType = 'ADD_AREA' | 'ADD_LEAD';

export interface PendingAction {
    id: string;
    type: ActionType;
    payload: any;
    createdAt: number;
    retryCount: number;
}

const STORAGE_KEY = '@crm_pending_actions';

/**
 * Hook for managing the offline persistent queue.
 */
export const useOfflineQueue = () => {
    const [queue, setQueue] = useState<PendingAction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const loadQueue = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setQueue(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Failed to load offline queue:', err);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const saveQueue = useCallback(async (newQueue: PendingAction[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
            setQueue(newQueue);
        } catch (err) {
            console.error('Failed to save offline queue:', err);
        }
    }, []);

    const pushAction = useCallback(async (type: ActionType, payload: any) => {
        // Generate proper UUID for action ID (not short random string)
        const generateUUID = (): string => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        };

        const newAction: PendingAction = {
            id: generateUUID(), // UUID format instead of short string
            type,
            payload,
            createdAt: Date.now(),
            retryCount: 0,
        };
        const newQueue = [...queue, newAction];
        await saveQueue(newQueue);
        return newAction;
    }, [queue, saveQueue]);

    const popAction = useCallback(async (actionId: string) => {
        const newQueue = queue.filter(a => a.id !== actionId);
        await saveQueue(newQueue);
    }, [queue, saveQueue]);

    const updateRetryCount = useCallback(async (actionId: string) => {
        const newQueue = queue.map(a => a.id === actionId ? { ...a, retryCount: a.retryCount + 1 } : a);
        await saveQueue(newQueue);
    }, [queue, saveQueue]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    return {
        queue,
        isLoaded,
        pushAction,
        popAction,
        updateRetryCount,
        refreshQueue: loadQueue,
    };
};
