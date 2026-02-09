import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useCRM, Area } from '../src/hooks/useCRM';
import { useAuth } from '../src/contexts/AuthContext';
import * as Location from 'expo-location';
import { UserPlus, Phone, MapPin, Map, Plus, X, GpsFixed, ChevronDown } from 'lucide-react-native';

const UserPlusIcon = UserPlus as any;
const PhoneIcon = Phone as any;
const MapPinIcon = MapPin as any;
const MapIcon = Map as any;
const PlusIcon = Plus as any;
const XIcon = X as any;
const GpsIcon = GpsFixed as any;
const ChevronDownIcon = ChevronDown as any;

export default function AddLeadScreen() {
    const router = useRouter();
    const { areas, addArea, addLead, loading: crmLoading, error: crmError } = useCRM();
    const { user } = useAuth();

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [areaId, setAreaId] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    // UI State
    const [isAreaModalVisible, setIsAreaModalVisible] = useState(false);
    const [isAddAreaVisible, setIsAddAreaVisible] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaCity, setNewAreaCity] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isFormValid = name.trim() !== '' && phone.trim() !== '' && areaId !== '';

    const handleGetLocation = async () => {
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to capture GPS coordinates.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setLatitude(location.coords.latitude);
            setLongitude(location.coords.longitude);
        } catch (err) {
            Alert.alert('Error', 'Failed to get current location.');
        } finally {
            setGpsLoading(false);
        }
    };

    const handleAddArea = async () => {
        if (!newAreaName.trim()) return;
        const area = await addArea(newAreaName, newAreaCity);
        if (area) {
            const isPending = (area as any).isPending;
            setAreaId(area.id);
            setIsAddAreaVisible(false);
            setNewAreaName('');
            setNewAreaCity('');
            setIsAreaModalVisible(false);
            if (isPending) {
                Alert.alert('Saved Offline', 'Area saved offline. Will sync later.');
            }
        } else if (crmError) {
            Alert.alert('Error', crmError);
        }
    };

    const handleSave = async () => {
        if (!isFormValid) return;
        setSubmitting(true);

        const result = await addLead({
            name,
            phone_number: phone,
            area_id: areaId,
            address: address || undefined,
            latitude: latitude || undefined,
            longitude: longitude || undefined,
        });

        setSubmitting(false);

        if (result && !(result as any).error) {
            const isPending = (result as any).isPending;
            Alert.alert(
                isPending ? 'Saved Offline' : 'Success',
                isPending ? 'Party saved offline. It will sync automatically when you are back online.' : 'Party added successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } else if (result && (result as any).error === 'duplicate') {
            Alert.alert('Duplicate', 'This phone number already exists.');
        } else {
            Alert.alert('Error', crmError || 'Failed to save party.');
        }
    };

    const selectedAreaName = areas.find(a => a.id === areaId)?.name || 'Select Area';

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <XIcon size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Add New Party</Text>
                    <Text style={styles.subtitle}>Enter details to create a new lead</Text>
                </View>

                {/* Main Form */}
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PARTY NAME *</Text>
                        <View style={styles.inputWrapper}>
                            <UserPlusIcon size={18} color="#3b82f6" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter party/client name"
                                placeholderTextColor="#52525b"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PHONE NUMBER *</Text>
                        <View style={styles.inputWrapper}>
                            <PhoneIcon size={18} color="#3b82f6" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile number"
                                placeholderTextColor="#52525b"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>AREA / REGION *</Text>
                        <TouchableOpacity
                            style={styles.selectorWrapper}
                            onPress={() => setIsAreaModalVisible(true)}
                        >
                            <MapIcon size={18} color="#3b82f6" style={styles.inputIcon} />
                            <Text style={[styles.selectorText, !areaId && styles.placeholderText]}>
                                {selectedAreaName}
                            </Text>
                            <ChevronDownIcon size={18} color="#52525b" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ADDRESS (OPTIONAL)</Text>
                        <View style={styles.inputWrapper}>
                            <MapPinIcon size={18} color="#3b82f6" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                                placeholder="Enter full address"
                                placeholderTextColor="#52525b"
                                value={address}
                                onChangeText={setAddress}
                                multiline
                            />
                        </View>
                    </View>

                    <View style={styles.locationSection}>
                        <View style={styles.locationHeader}>
                            <Text style={styles.label}>GPS LOCATION</Text>
                            {latitude && longitude && (
                                <Text style={styles.gpsBadge}>Captured</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.locationBtn, gpsLoading && styles.disabledBtn]}
                            onPress={handleGetLocation}
                            disabled={gpsLoading}
                        >
                            {gpsLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <GpsIcon size={18} color="#fff" />
                                    <Text style={styles.locationBtnText}>
                                        {latitude ? "Update Current Location" : "Capture Current Location"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {latitude && (
                            <Text style={styles.coordsText}>
                                {latitude.toFixed(6)}, {longitude?.toFixed(6)}
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Action Bar */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.saveBtn, (!isFormValid || submitting) && styles.disabledSaveBtn]}
                    onPress={handleSave}
                    disabled={!isFormValid || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Party</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Area Selection Modal */}
            <Modal
                visible={isAreaModalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Area</Text>
                            <TouchableOpacity onPress={() => {
                                setIsAreaModalVisible(false);
                                setIsAddAreaVisible(false);
                            }}>
                                <XIcon size={24} color="#a1a1aa" />
                            </TouchableOpacity>
                        </View>

                        {!isAddAreaVisible ? (
                            <>
                                <ScrollView style={styles.areasList}>
                                    {areas.length === 0 ? (
                                        <Text style={styles.emptyText}>No areas found. Add a new one below.</Text>
                                    ) : (
                                        areas.map(area => (
                                            <TouchableOpacity
                                                key={area.id}
                                                style={[styles.areaItem, areaId === area.id && styles.selectedAreaItem]}
                                                onPress={() => {
                                                    setAreaId(area.id);
                                                    setIsAreaModalVisible(false);
                                                }}
                                            >
                                                <View>
                                                    <Text style={styles.areaItemName}>{area.name}</Text>
                                                    {area.city && <Text style={styles.areaItemCity}>{area.city}</Text>}
                                                </View>
                                                {areaId === area.id && <View style={styles.checkMark} />}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                                <TouchableOpacity
                                    style={styles.addAreaBtn}
                                    onPress={() => setIsAddAreaVisible(true)}
                                >
                                    <PlusIcon size={18} color="#fff" />
                                    <Text style={styles.addAreaBtnText}>Add New Area</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.addAreaForm}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>AREA NAME *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="e.g. Bandra West"
                                        placeholderTextColor="#52525b"
                                        value={newAreaName}
                                        onChangeText={setNewAreaName}
                                        autoFocus
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CITY (OPTIONAL)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="e.g. Mumbai"
                                        placeholderTextColor="#52525b"
                                        value={newAreaCity}
                                        onChangeText={setNewAreaCity}
                                    />
                                </View>
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setIsAddAreaVisible(false)}
                                    >
                                        <Text style={styles.modalCancelText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalSaveBtn, !newAreaName.trim() && styles.disabledBtn]}
                                        onPress={handleAddArea}
                                        disabled={!newAreaName.trim() || crmLoading}
                                    >
                                        <Text style={styles.modalSaveText}>Save Area</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 100 },
    header: { marginBottom: 32 },
    backBtn: { marginBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
    card: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#52525b', letterSpacing: 1, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#09090b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a',
        paddingHorizontal: 16,
    },
    selectorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#09090b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        height: 56,
        color: '#fff',
        fontSize: 16,
    },
    selectorText: { flex: 1, color: '#fff', fontSize: 16 },
    placeholderText: { color: '#52525b' },
    locationSection: {
        marginTop: 10,
        backgroundColor: '#09090b',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    gpsBadge: { fontSize: 10, fontWeight: 'bold', color: '#10b981', backgroundColor: '#10b98110', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#27272a',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    locationBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    disabledBtn: { opacity: 0.5 },
    coordsText: { color: '#71717a', fontSize: 12, textAlign: 'center', marginTop: 8 },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#09090b',
        padding: 24,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#18181b',
    },
    saveBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledSaveBtn: { backgroundColor: '#27272a', opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#18181b',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    areasList: { marginBottom: 20 },
    areaItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#09090b',
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    selectedAreaItem: { borderColor: '#3b82f6', backgroundColor: '#3b82f605' },
    areaItemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    areaItemCity: { color: '#71717a', fontSize: 12, marginTop: 2 },
    checkMark: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
    emptyText: { color: '#52525b', textAlign: 'center', marginVertical: 40 },
    addAreaBtn: {
        flexDirection: 'row',
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addAreaBtnText: { color: '#fff', fontWeight: 'bold' },
    addAreaForm: { gap: 12 },
    modalInput: {
        backgroundColor: '#09090b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a',
        padding: 16,
        color: '#fff',
        fontSize: 16,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#27272a',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalCancelText: { color: '#fff', fontWeight: 'bold' },
    modalSaveBtn: {
        flex: 2,
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalSaveText: { color: '#fff', fontWeight: 'bold' },
});
