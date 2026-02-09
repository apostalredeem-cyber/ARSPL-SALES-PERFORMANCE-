import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { LOCATION_TRACKING_TASK } from '../tasks/locationTask';
import { Alert } from 'react-native';

export const useTracking = () => {
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detect if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    useEffect(() => {
        checkTrackingStatus();
    }, []);

    const checkTrackingStatus = async () => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
            setIsTracking(hasStarted);
        } catch (err) {
            console.error('Failed to check tracking status', err);
        }
    };

    const startTracking = async () => {
        try {
            setError(null);

            // Step 1: Request Foreground Permissions
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                const msg = 'Foreground location permission denied. Tracking cannot start.';
                setError(msg);
                Alert.alert('Permission Denied', msg);
                return;
            }

            // Step 2: Handle Background Tracking based on Environment
            if (isExpoGo) {
                // Expo Go doesn't support background-task-manager location updates well on Android
                // We'll allow it to run, but warn the user that it might stop when minimized
                console.warn('Running in Expo Go: Background tracking might be limited.');

                // For a "SAFE" out-of-box experience in Expo Go, we can start a foreground-only watch 
                // but the requested task requires "Background GPS fully functional" in Dev Build.
                // So in Expo Go, we just warn and proceed with what it CAN do.
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

            if (backgroundStatus !== 'granted') {
                const msg = isExpoGo
                    ? 'Background location denied. In Expo Go, tracking will only work while the app is open.'
                    : 'Background location permission denied. Please enable "Allow all the time" in settings.';

                if (!isExpoGo) {
                    setError(msg);
                    Alert.alert('Background Restricted', msg);
                    return;
                } else {
                    // In Expo Go, we might still want to try starting it, or fallback
                    console.log('Background permission denied in Expo Go, proceeding with foreground limitations.');
                }
            }

            // Step 3: Start Updates
            await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 60000, // 1 minute for better responsiveness
                distanceInterval: 10,
                deferredUpdatesInterval: 60000,
                foregroundService: {
                    notificationTitle: 'ARSPL Tracker Active',
                    notificationBody: 'Your duty route is being recorded.',
                    notificationColor: '#2563eb',
                },
                pausesUpdatesAutomatically: false,
            });

            setIsTracking(true);
            setError(null);
        } catch (err: any) {
            const msg = err.message || 'Failed to start tracking';
            setError(msg);
            console.error('Tracking Start Error:', err);

            if (err.message?.includes('TASK_MANAGER')) {
                Alert.alert('System Limitation', 'Background tasks are not supported in this environment. Use the Dev Build APK for full tracking.');
            }
        }
    };

    const stopTracking = async () => {
        try {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
            setIsTracking(false);
            setError(null);
        } catch (err: any) {
            console.error('Tracking Stop Error:', err);
            // Even if it fails to stop (e.g. not running), update state
            setIsTracking(false);
        }
    };

    return { isTracking, startTracking, stopTracking, error, isExpoGo };
};
