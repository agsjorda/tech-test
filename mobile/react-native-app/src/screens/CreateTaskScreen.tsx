// ─── CreateTaskScreen ─────────────────────────────────────────────────────────
// Form to create a new task. Three fields: title (required), description
// (optional), and priority (low / medium / high — default medium).
//
// On success: TanStack Query invalidates the task cache and we navigate back
// to TaskList, which refetches and shows the new task immediately.
// On 422 (e.g. duplicate title within 10 seconds): backend message shown.

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useCreateTask } from '../hooks/useTasks';
import type { TaskPriority } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateTask'>;

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export default function CreateTaskScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const createTask = useCreateTask();

  // Extract the error message from the Axios response body (e.g. 422 duplicate)
  const apiError =
    createTask.error && 'response' in createTask.error
      ? (createTask.error as { response?: { data?: { message?: string } } })
          .response?.data?.message
      : null;

  function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      },
      {
        // Navigate back on success — TanStack Query invalidation (in the hook)
        // will cause TaskListScreen to refetch and show the new task
        onSuccess: () => navigation.goBack(),
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* API error banner — e.g. duplicate title within 10 seconds */}
        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Write unit tests"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details…"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Priority selector — three pill buttons */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityButton, priority === p && styles.priorityButtonActive]}
              onPress={() => setPriority(p)}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === p && styles.priorityButtonTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, createTask.isPending && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={createTask.isPending}
          >
            {createTask.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create task</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flexGrow: 1, padding: 20 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: { color: '#dc2626' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  textArea: { height: 90 },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  priorityButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  priorityButtonText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  priorityButtonTextActive: { color: '#2563eb' },
  actions: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelText: { color: '#374151', fontSize: 15, fontWeight: '500' },
  submitButton: { backgroundColor: '#2563eb' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
