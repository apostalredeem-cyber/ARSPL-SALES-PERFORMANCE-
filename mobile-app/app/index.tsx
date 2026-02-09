import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTracking } from '../src/hooks/useTracking';
import { useAttendance } from '../src/hooks/useAttendance';
import { MapPin, Power, Map as MapIcon, ClipboardList, LogOut, Clock, Briefcase, Sparkles, TrendingUp, IndianRupee } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import FaceRecognition from '../src/components/FaceRecognition';
import { useDailyWorkPlan } from '../src/hooks/useDailyWorkPlan';
import { useTravelSummary } from '../src/hooks/useTravelSummary';

const MapPinIcon = MapPin as any;
const PowerIcon = Power as any;
const MapIconComp = MapIcon as any;
const ClipboardListIcon = ClipboardList as any;
const LogOutIcon = LogOut as any;
const ClockIcon = Clock as any;
const BriefcaseIcon = Briefcase as any;
const SparklesIcon = Sparkles as any;
const TrendingUpIcon = TrendingUp as any;
const IndianRupeeIcon = IndianRupee as any;

export default function Dashboard() {
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const { isTracking, startTracking, stopTracking, error: trackingError } = useTracking();
    const { activeAttendance, clockIn, clockOut, loading: attLoading } = useAttendance();
    const { currentPlan, hasActiveWorkPlan, hasTodayWorkPlan, loading: planLoading } = useDailyWorkPlan();
    const { weeklySummary, fetchWeeklySummary } = useTravelSummary();
    const [faceVisible, setFaceVisible] = React.useState(false);

    // Check for work plan and show guidance if needed
    const showPlanGuidance = !planLoading && !hasTodayWorkPlan();

    // Fetch weekly summary on mount
    React.useEffect(() => {
        fetchWeeklySummary();
    }, []);

    const handleAuthSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
    };

    const toggleTracking = async () => {
        if (!hasActiveWorkPlan()) {
            Alert.alert('Activation Required', 'Please create and activate your work plan for today before starting duty.');
            return;
        }

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
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>v1.0.1</Text>
                    </View>
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

                {showPlanGuidance && (
                    <TouchableOpacity
                        style={styles.guidanceCard}
                        onPress={() => router.push('/daily-work-plan')}
                    >
                        <SparklesIcon size={24} color="#3b82f6" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guidanceTitle}>Plan your day</Text>
                            <Text style={styles.guidanceText}>Create a work plan to start tracking your route.</Text>
                        </View>
                        <View style={styles.guidanceBadge}>
                            <Text style={styles.guidanceBadgeText}>START</Text>
                        </View>
                    </TouchableOpacity>
                )}


                {/* Weekly Summary Card */}
                {weeklySummary && (
                    <TouchableOpacity
                        style={styles.summaryCard}
                        onPress={() => router.push('/weekly-travel-summary')}
                    >
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>This Week's Travel</Text>
                            <View style={styles.summaryBadge}>
                                <Text style={styles.summaryBadgeText}>
                                    {weeklySummary.approved_count}/{weeklySummary.days_count} Approved
                                </Text>
                            </View>
                        </View>
                        <View style={styles.summaryStats}>
                            <View style={styles.summaryStat}>
                                <TrendingUpIcon size={20} color="#3b82f6" />
                                <Text style={styles.summaryStatValue}>{weeklySummary.total_km.toFixed(1)} km</Text>
                            </View>
                            <View style={styles.summaryStat}>
                                <IndianRupeeIcon size={20} color="#10b981" />
                                <Text style={styles.summaryStatValue}>₹{weeklySummary.total_amount.toFixed(2)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Action Grid */}
                <View style={styles.grid}>
                    {/* Only show My Route if work plan exists */}
                    {hasTodayWorkPlan() && (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => {
                                if (hasActiveWorkPlan()) {
                                    router.push('/my-route');
                                } else {
                                    Alert.alert('Access Denied', 'Please activate your work plan first to view your route.');
                                }
                            }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: '#3b82f620' }]}>
                                <MapIconComp size={24} stroke="#3b82f6" />
                            </View>
                            <Text style={styles.cardTitle}>My Route</Text>
                            <Text style={styles.cardDesc}>View today's path</Text>
                        </TouchableOpacity>
                    )}

                    {/* Only show Work Plan if no active plan */}
                    {!hasActiveWorkPlan() && hasTodayWorkPlan() && (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push('/daily-work-plan')}
                        >
                            <View style={[styles.iconBox, { backgroundColor: '#3b82f620' }]}>
                                <SparklesIcon size={24} stroke="#3b82f6" />
                            </View>
                            <Text style={styles.cardTitle}>Work Plan</Text>
                            <Text style={styles.cardDesc}>View today's plan</Text>
                        </TouchableOpacity>
                    )}


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
    versionBadge: {
        backgroundColor: '#3b82f620',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        alignSelf: 'flex-start'
    },
    versionText: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: 'bold'
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
    summaryCard: {
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryBadge: {
        backgroundColor: '#3b82f615',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    summaryBadgeText: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: 'bold',
    },
    summaryStats: {
        flexDirection: 'row',
        gap: 24,
    },
    summaryStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryStatValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    guidanceCard: {
        backgroundColor: '#3b82f610',
        borderWidth: 1,
        borderColor: '#3b82f630',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    guidanceTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    guidanceText: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 2,
    },
    guidanceBadge: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    guidanceBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
