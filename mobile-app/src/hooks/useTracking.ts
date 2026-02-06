import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { LOCATION_TRACKING_TASK } from '../tasks/locationTask';

export const useTracking = () => {
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkTrackingStatus();
    }, []);

    const checkTrackingStatus = async () => {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        setIsTracking(hasStarted);
    };

    const startTracking = async () => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                setError('Foreground location permission denied');
                return;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                setError('Background location permission denied');
                return;
            }

            await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 60000, // 60 seconds
                distanceInterval: 10, // 10 meters
                deferredUpdatesInterval: 60000,
                foregroundService: {
                    notificationTitle: 'Tracking Active',
                    notificationBody: 'Your location is being tracked for duty logs.',
                    notificationColor: '#2563eb',
                },
                pausesUpdatesAutomatically: false,
            });

            setIsTracking(true);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to start tracking');
            console.error(err);
        }
    };

    const stopTracking = async () => {
        try {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
            setIsTracking(false);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to stop tracking');
        }
    };

    return { isTracking, startTracking, stopTracking, error };
};
