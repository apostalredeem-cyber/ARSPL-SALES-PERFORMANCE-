import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTracking } from '../src/hooks/useTracking';
import { useAttendance } from '../src/hooks/useAttendance';
import { MapPin, Power, Map as MapIcon, ClipboardList, LogOut, Clock, Briefcase, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import FaceRecognition from '../src/components/FaceRecognition';

const MapPinIcon = MapPin as any;
const PowerIcon = Power as any;
const MapIconComp = MapIcon as any;
const ClipboardListIcon = ClipboardList as any;
const LogOutIcon = LogOut as any;
const ClockIcon = Clock as any;
const BriefcaseIcon = Briefcase as any;
const SparklesIcon = Sparkles as any;

export default function Dashboard() {
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const { isTracking, startTracking, stopTracking, error: trackingError } = useTracking();
    const { activeAttendance, clockIn, clockOut, loading: attLoading } = useAttendance();
    const [faceVisible, setFaceVisible] = React.useState(false);

    const handleAuthSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
    };

    const toggleTracking = async () => {
        if (isTracking) {
            await stopTracking();
            if (activeAttendance) await clockOut();
        } else {
            // Trigger face recognition instead of direct clock-in
            setFaceVisible(true);
        }
    };

    const handleFaceCaptured = async (uri: string) => {
        setFaceVisible(false);
        await startTracking();
        await clockIn(uri);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>{profile?.full_name || 'Employee'}</Text>
                </View>
                <TouchableOpacity onPress={handleAuthSignOut} style={styles.signOutButton}>
                    <LogOutIcon size={20} color="#a1a1aa" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Card */}
                <View style={[styles.statusCard, isTracking ? styles.statusActive : styles.statusInactive]}>
                    <View style={styles.statusInfo}>
                        <View style={[styles.statusIndicator, isTracking ? styles.indicatorActive : styles.indicatorInactive]} />
                        <Text style={styles.statusLabel}>
                            {isTracking ? 'DUTY ACTIVE' : 'DUTY INACTIVE'}
                        </Text>
                        {activeAttendance && (
                            <View style={styles.attendanceBadge}>
                                <ClockIcon size={12} color="#3b82f6" />
                                <Text style={styles.attendanceText}>Clocked In: {new Date(activeAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.toggleButton, isTracking ? styles.toggleActive : styles.toggleInactive]}
                        onPress={toggleTracking}
                    >
                        <PowerIcon size={24} color="white" />
                        <Text style={styles.toggleButtonText}>
                            {isTracking ? 'Clock Out / End Duty' : 'Clock In / Start Duty'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {trackingError && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{trackingError}</Text>
                    </View>
                )}

                {/* Action Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push('/route-trail')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#3b82f620' }]}>
                            <MapIconComp size={24} stroke="#3b82f6" />
                        </View>
                        <Text style={styles.cardTitle}>My Route</Text>
                        <Text style={styles.cardDesc}>View today's path</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push('/auto-plan')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#3b82f620' }]}>
                            <SparklesIcon size={24} stroke="#3b82f6" />
                        </View>
                        <Text style={styles.cardTitle}>Work Plan</Text>
                        <Text style={styles.cardDesc}>AI suggested route</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push('/leads')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#10b98120' }]}>
                            <BriefcaseIcon size={24} stroke="#10b981" />
                        </View>
                        <Text style={styles.cardTitle}>My Clients</Text>
                        <Text style={styles.cardDesc}>Manage CRM leads</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push('/expenses')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#f59e0b20' }]}>
                            <MapPinIcon size={24} stroke="#f59e0b" />
                        </View>
                        <Text style={styles.cardTitle}>Expenses</Text>
                        <Text style={styles.cardDesc}>Log travel bills</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <FaceRecognition
                visible={faceVisible}
                onClose={() => setFaceVisible(false)}
                onCapture={handleFaceCaptured}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    signOutButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#27272a',
    },
    content: {
        padding: 24,
    },
    statusCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
    },
    statusActive: {
        backgroundColor: '#172554',
        borderColor: '#1e3a8a',
    },
    statusInactive: {
        backgroundColor: '#18181b',
        borderColor: '#27272a',
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    indicatorActive: {
        backgroundColor: '#3b82f6',
        shadowColor: '#3b82f6',
        shadowRadius: 4,
        shadowOpacity: 0.8,
    },
    indicatorInactive: {
        backgroundColor: '#52525b',
    },
    statusLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    toggleActive: {
        backgroundColor: '#ef4444',
    },
    toggleInactive: {
        backgroundColor: '#2563eb',
    },
    toggleButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    card: {
        width: '47%',
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 20,
        padding: 16,
        gap: 8,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardDesc: {
        color: '#71717a',
        fontSize: 12,
    },
    errorBanner: {
        backgroundColor: '#450a0a',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#7f1d1d',
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
    },
    attendanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#3b82f615',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 'auto',
    },
    attendanceText: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
