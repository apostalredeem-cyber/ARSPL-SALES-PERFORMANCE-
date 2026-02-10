import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

/**
 * IMPORTANT:
 * Path MUST be correct.
 * If your folder is mobile-app/src/hooks/useCRM.ts
 */
import { useCRM } from '../src/hooks/useCRM';

import { Feather, Ionicons } from '@expo/vector-icons';


export default function AddLeadScreen() {
  const router = useRouter();
  const { areas, addArea, addLead, loading, error } = useCRM();

  /* -------- Form State -------- */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  /* -------- Area UI -------- */
  const [areaModal, setAreaModal] = useState(false);
  const [addAreaMode, setAddAreaMode] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [newCity, setNewCity] = useState('');

  const formValid = name.trim() && phone.trim() && areaId;

  /* -------- GPS -------- */
  const captureLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Location denied', 'GPS is optional.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
    } catch {
      Alert.alert('GPS Error', 'Unable to capture location.');
    }
  };

  /* -------- Save Area -------- */
  const saveArea = async () => {
    if (!newArea.trim()) return;
    const res = await addArea(newArea.trim(), newCity.trim());
    if (res) {
      setAreaId(res.id);
      setAddAreaMode(false);
      setAreaModal(false);
      setNewArea('');
      setNewCity('');
    } else {
      Alert.alert('Error', error || 'Failed to add area');
    }
  };

  /* -------- Save Lead -------- */
  const saveLead = async () => {
    if (!formValid) return;

    const res = await addLead({
      name: name.trim(),
      phone_number: phone.trim(),
      area_id: areaId,
      address: address || undefined,
      latitude: lat || undefined,
      longitude: lng || undefined,
    });

    if (res?.error === 'duplicate') {
      Alert.alert('Duplicate Party', 'Phone number already exists.');
      return;
    }

    Alert.alert(
      res?.isPending ? 'Saved Offline' : 'Success',
      res?.isPending
        ? 'Party saved offline. Will sync automatically.'
        : 'Party added successfully.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const selectedArea =
    areas.find(a => a.id === areaId)?.name || 'Select Area';

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>Add New Party</Text>

        {/* Name */}
        <Field label="Party Name *" icon={<Feather name="user-plus" size={18} color="#fff" />}>
          <TextInput value={name} onChangeText={setName} style={s.input} />
        </Field>

        {/* Phone */}
        <Field label="Phone *" icon={<Feather name="phone" size={18} color="#fff" />}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={s.input}
          />
        </Field>

        {/* Area */}
        <Field label="Area *" icon={<Feather name="map" size={18} color="#fff" />}>
          <TouchableOpacity
            style={s.selector}
            onPress={() => setAreaModal(true)}
          >
            <Text style={s.selectorText}>{selectedArea}</Text>
            <Feather name="chevron-down" size={18} color="#fff" />
          </TouchableOpacity>
        </Field>

        {/* Address */}
        <Field label="Address">
          <TextInput
            value={address}
            onChangeText={setAddress}
            multiline
            style={[s.input, { height: 80 }]}
          />
        </Field>

        {/* GPS */}
        <TouchableOpacity style={s.gpsBtn} onPress={captureLocation}>
          <Ionicons name="locate" size={18} color="#fff" />
          <Text style={s.gpsText}>
            {lat ? 'Update Location' : 'Capture Location'}
          </Text>
        </TouchableOpacity>

        {lat && (
          <Text style={s.coords}>
            {lat.toFixed(6)}, {lng?.toFixed(6)}
          </Text>
        )}
      </ScrollView>

      {/* Save */}
      <TouchableOpacity
        style={[s.save, !formValid && s.disabled]}
        disabled={!formValid || loading}
        onPress={saveLead}
      >
        {loading ? <ActivityIndicator /> : <Text>Save Party</Text>}
      </TouchableOpacity>

      {/* Area Modal */}
      <Modal visible={areaModal} animationType="slide">
        <View style={s.modal}>
          <Text style={s.modalTitle}>Select Area</Text>

          {!addAreaMode ? (
            <>
              <ScrollView>
                {areas.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={s.areaItem}
                    onPress={() => {
                      setAreaId(a.id);
                      setAreaModal(false);
                    }}
                  >
                    <Text>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={s.addBtn}
                onPress={() => setAddAreaMode(true)}
              >
                <Feather name="plus" size={18} color="#000" />
                <Text>Add New Area</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Area name"
                value={newArea}
                onChangeText={setNewArea}
                style={s.input}
              />
              <TextInput
                placeholder="City (optional)"
                value={newCity}
                onChangeText={setNewCity}
                style={s.input}
              />
              <TouchableOpacity style={s.save} onPress={saveArea}>
                <Text>Save Area</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => setAreaModal(false)}>
            <Text style={s.close}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Small Helper ---------- */
function Field({ label, icon, children }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.field}>
        {icon}
        {children}
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  body: { padding: 20 },
  title: { fontSize: 24, color: '#fff', marginBottom: 20 },
  label: { color: '#888', marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
  },
  input: { flex: 1, color: '#fff', marginLeft: 10 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  selectorText: { color: '#fff' },
  gpsBtn: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#222',
    borderRadius: 12,
    marginTop: 10,
  },
  gpsText: { color: '#fff' },
  coords: { color: '#888', marginTop: 6 },
  save: {
    backgroundColor: '#3b82f6',
    padding: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
  },
  disabled: { opacity: 0.5 },
  modal: { flex: 1, padding: 20 },
  modalTitle: { fontSize: 20, marginBottom: 10 },
  areaItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  addBtn: { padding: 14, backgroundColor: '#eee', marginTop: 10 },
  close: { textAlign: 'center', marginTop: 20 },
});
