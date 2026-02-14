import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCRM } from '../src/hooks/useCRM';
import { Feather } from '@expo/vector-icons';

// Validated Icon Component Wrapper
const Icon = ({ name, color, size = 18 }: { name: keyof typeof Feather.glyphMap; color: string; size?: number }) => {
  return <Feather name={name} size={size} color={color} />;
};

export default function AddLeadScreen() {
  const router = useRouter();
  const crm = useCRM();

  // Safety: destruct with defaults
  const { areas = [], addArea, addLead, loading = false, error } = crm || {};

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Area Modal State
  const [areaModal, setAreaModal] = useState(false);
  const [addAreaMode, setAddAreaMode] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [newCity, setNewCity] = useState('');

  const formValid = name.trim().length > 0 && phone.trim().length > 0 && areaId.length > 0;

  const captureLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Location denied', 'GPS is optional.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      if (loc && loc.coords) {
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
      }
    } catch (e) {
      Alert.alert('GPS Error', 'Unable to capture location.');
    }
  };

  const saveArea = async () => {
    if (!newArea.trim()) return;
    if (!addArea) {
      Alert.alert('Error', 'CRM offline or unavailable');
      return;
    }
    const res = await addArea(newArea.trim(), newCity.trim());
    if (res && res.id) {
      setAreaId(res.id);
      setAddAreaMode(false);
      setAreaModal(false);
      setNewArea('');
      setNewCity('');
    } else {
      Alert.alert('Error', error || 'Failed to add area');
    }
  };

  const saveLead = async () => {
    if (!formValid) return;
    if (!addLead) {
      Alert.alert('Error', 'CRM initialized incorrectly');
      return;
    }

    try {
      const res = await addLead({
        name: name.trim(),
        phone_number: phone.trim(),
        area_id: areaId,
        address: address || undefined,
        latitude: lat || undefined,
        longitude: lng || undefined,
        client_type: 'Retailer', // Default, could be added to UI later
      });

      if (!res) {
        Alert.alert('Error', 'Failed to save party. Please try again.');
        return;
      }

      if ((res as any).error === 'duplicate') {
        Alert.alert('Duplicate Party', 'Phone number already exists.');
        return;
      }

      const isPending = (res as any).isPending;
      Alert.alert(
        isPending ? 'Saved Offline' : 'Success',
        isPending ? 'Party saved offline. Will sync automatically.' : 'Party added successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const selectedAreaObj = areas.find(a => a.id === areaId);
  const selectedAreaName = selectedAreaObj ? selectedAreaObj.name : 'Select Area';

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>Add New Party</Text>

        <Field label="Party Name *" icon={<Icon name="user-plus" color={COLORS.gold} />}>
          <TextInput
            value={name}
            onChangeText={setName}
            style={s.input}
            placeholder="Enter Name"
            placeholderTextColor="#666"
          />
        </Field>

        <Field label="Phone *" icon={<Icon name="phone" color={COLORS.gold} />}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={s.input}
            placeholder="Enter Phone"
            placeholderTextColor="#666"
          />
        </Field>

        <Field label="Area *" icon={<Icon name="map" color={COLORS.gold} />}>
          <TouchableOpacity style={s.selector} onPress={() => setAreaModal(true)}>
            <Text style={s.selectorText}>{selectedAreaName}</Text>
            <Icon name="chevron-down" color={COLORS.gold} />
          </TouchableOpacity>
        </Field>

        <Field label="Address">
          <TextInput
            value={address}
            onChangeText={setAddress}
            multiline
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Full Address (Optional)"
            placeholderTextColor="#666"
          />
        </Field>

        <TouchableOpacity style={s.gpsBtn} onPress={captureLocation}>
          <Icon name="map-pin" color={COLORS.gold} />
          <Text style={s.gpsText}>{lat ? 'Update Location' : 'Capture Location'}</Text>
        </TouchableOpacity>

        {lat ? (
          <Text style={s.coords}>{lat.toFixed(6)}, {lng?.toFixed(6)}</Text>
        ) : null}
      </ScrollView>

      <TouchableOpacity
        style={[s.save, (!formValid || loading) && s.disabled]}
        disabled={!formValid || loading}
        onPress={saveLead}
      >
        {loading ? <ActivityIndicator color="#000" /> : <Text style={s.saveText}>Save Party</Text>}
      </TouchableOpacity>

      <Modal visible={areaModal} animationType="slide" transparent={true} onRequestClose={() => setAreaModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Select Area</Text>
            {!addAreaMode ? (
              <>
                <ScrollView style={{ maxHeight: 300 }}>
                  {areas.map(a => (
                    <TouchableOpacity key={a.id} style={s.areaItem} onPress={() => { setAreaId(a.id); setAreaModal(false); }}>
                      <Text style={s.areaItemText}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {areas.length === 0 && <Text style={{ color: '#666', padding: 10 }}>No areas found.</Text>}
                </ScrollView>
                <TouchableOpacity style={s.addBtn} onPress={() => setAddAreaMode(true)}>
                  <Icon name="plus" color="#000" />
                  <Text style={s.addBtnText}>Add New Area</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput placeholder="Area name" placeholderTextColor="#666" value={newArea} onChangeText={setNewArea} style={[s.input, s.modalInput]} />
                <TextInput placeholder="City (optional)" placeholderTextColor="#666" value={newCity} onChangeText={setNewCity} style={[s.input, s.modalInput]} />
                <View style={s.modalButtons}>
                  <TouchableOpacity style={[s.save, { flex: 1, margin: 0, marginRight: 8 }]} onPress={saveArea}>
                    <Text style={s.saveText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setAddAreaMode(false)}>
                    <Text style={s.cancelText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity onPress={() => setAreaModal(false)} style={s.closeBtn}>
              <Text style={s.close}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, icon, children }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.field}>
        {icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}
        {children}
      </View>
    </View>
  );
}

const COLORS = {
  gold: '#D4AF37',
  lemon: '#A3E635',
  bg: '#09090b',
  card: '#18181b',
  border: '#27272a',
  text: '#fff',
  subtext: '#a1a1aa'
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  label: { color: COLORS.gold, marginBottom: 6, fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.card },
  input: { flex: 1, color: COLORS.text, fontSize: 16 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center' },
  selectorText: { color: COLORS.text, fontSize: 16 },
  gpsBtn: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: COLORS.card, borderRadius: 12, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.gold },
  gpsText: { color: COLORS.gold, fontWeight: 'bold' },
  coords: { color: COLORS.subtext, marginTop: 8, textAlign: 'center', fontSize: 12 },
  save: { backgroundColor: COLORS.gold, padding: 16, alignItems: 'center', margin: 16, borderRadius: 12 },
  saveText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.5, backgroundColor: COLORS.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.gold },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.gold, marginBottom: 20 },
  areaItem: { padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  areaItemText: { color: COLORS.text, fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: COLORS.lemon, borderRadius: 12, marginTop: 16, gap: 8 },
  addBtnText: { color: '#000', fontWeight: 'bold' },
  modalInput: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 12, color: COLORS.text },
  modalButtons: { flexDirection: 'row', marginTop: 12 },
  cancelBtn: { backgroundColor: COLORS.border, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.text, fontWeight: 'bold' },
  closeBtn: { marginTop: 16, alignItems: 'center' },
  close: { color: COLORS.subtext, fontSize: 14 },
});
