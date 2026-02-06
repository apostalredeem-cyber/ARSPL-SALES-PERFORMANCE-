import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

interface TaskData {
    locations: Location.LocationObject[];
}

TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<TaskData>) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];

        if (location) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Convert coordinates to PostGIS POINT format (WKT)
                const point = `POINT(${location.coords.longitude} ${location.coords.latitude})`;

                const { error: insertError } = await supabase
                    .from('gps_logs')
                    .insert({
                        user_id: user.id,
                        location: point,
                        heading: location.coords.heading,
                        speed: location.coords.speed,
                        accuracy: location.coords.accuracy,
                        battery_level: 0, // Battery info requires expo-battery, can add later
                        is_mocked: location.mocked || false,
                        timestamp: new Date(location.timestamp).toISOString(),
                    } as any);

                if (insertError) {
                    console.error('Error logging GPS in background:', insertError.message);
                }
            } catch (err) {
                console.error('Failed to sync location from background:', err);
            }
        }
    }
});
