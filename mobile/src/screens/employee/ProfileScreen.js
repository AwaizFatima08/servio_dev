import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const RESIDENCE_LABELS = {
  boq: 'BOQ', moq: 'MOQ', guest_house: 'Guest House',
  a: 'A', b: 'B', b_modified: 'B Modified', c: 'C',
  d_plus: 'D+', d: 'D', e: 'E', e_modified: 'E Modified',
};

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null); // flat profile object
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [phone, setPhone]     = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get('/profile/me');
      // Backend returns { profile: { ... } } — flat object
      const flat = res.data?.profile ?? res.data;
      setProfile(flat);
      setPhone(flat?.phoneNumber || '');
    } catch (err) {
      console.log('Profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/profile/me', { phoneNumber: phone });
      setEditing(false);
      loadProfile();
      Alert.alert('Saved', 'Phone number updated.', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const fields = profile ? [
    { label: 'Full Name',      value: profile.fullName },
    { label: 'Employee No.',   value: profile.officialEmployeeNumber },
    { label: 'Grade',          value: profile.pendingGrade
        ? `${profile.grade} (${profile.pendingGrade} pending)`
        : profile.grade },
    { label: 'Designation',    value: profile.pendingDesignation
        ? `${profile.designation} (${profile.pendingDesignation} pending)`
        : profile.designation },
    { label: 'Department',     value: profile.department },
    { label: 'House No.',      value: profile.pendingHouseNumber
        ? `${profile.houseNumber} (${profile.pendingHouseNumber} pending)`
        : profile.houseNumber },
    { label: 'Residence Type', value: RESIDENCE_LABELS[profile.residenceType] || profile.residenceType },
    { label: 'Email',          value: profile.personalEmail },
    { label: 'Role',           value: profile.role?.replace(/_/g, ' ') },
  ] : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={() => editing ? handleSave() : setEditing(true)}
          style={styles.editBtn}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#1A7A4A" />
            : <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Avatar */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.avatarName}>{profile?.fullName || '—'}</Text>
            <Text style={styles.avatarNo}>{profile?.officialEmployeeNumber || '—'}</Text>
          </View>

          {/* Fields */}
          <View style={styles.card}>
            {fields.map((f, idx) => (
              <React.Fragment key={f.label}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value || '—'}</Text>
                </View>
                {idx < fields.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Editable phone */}
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {editing ? (
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="03001234567"
                  placeholderTextColor="#ccc"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.phoneNumber || '—'}</Text>
              )}
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => { setEditing(false); setPhone(profile?.phoneNumber || ''); }}
            >
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#EBF9F4' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  editBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1A7A4A' },
  editBtnText:   { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  centeredMsg:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:        { padding: 16 },
  avatarBlock:   { alignItems: 'center', marginBottom: 20 },
  avatar:        { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText:    { fontSize: 28, fontWeight: '700', color: '#fff' },
  avatarName:    { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  avatarNo:      { fontSize: 13, color: '#888', marginTop: 2 },
  card:          { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 12, elevation: 1 },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  fieldLabel:    { fontSize: 13, color: '#888', flex: 1 },
  fieldValue:    { fontSize: 14, color: '#333', fontWeight: '500', flex: 2, textAlign: 'right' },
  divider:       { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },
  phoneInput:    { fontSize: 14, color: '#333', fontWeight: '500', flex: 2, textAlign: 'right', borderBottomWidth: 1, borderBottomColor: '#1A7A4A', paddingBottom: 2 },
  cancelEditBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelEditText:{ fontSize: 14, color: '#aaa' },
});