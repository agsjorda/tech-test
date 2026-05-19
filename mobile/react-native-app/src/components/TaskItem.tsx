// ─── TaskItem ─────────────────────────────────────────────────────────────────
// Renders a single task row with:
//   - Title (struck through when completed)
//   - Priority badge with colour coding
//   - Complete / Undo toggle button
//   - Delete button with confirmation alert

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Task, TaskPriority } from '../types';
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks';

interface Props {
  task: Task;
}

// Priority badge colour map — same logic as the frontend TaskCard
const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  high:   { bg: '#fee2e2', text: '#dc2626' },
  medium: { bg: '#fef3c7', text: '#d97706' },
  low:    { bg: '#dcfce7', text: '#16a34a' },
};

export default function TaskItem({ task }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isCompleted = task.status === 'completed';
  const priorityStyle = PRIORITY_COLORS[task.priority];

  function handleToggleComplete() {
    updateTask.mutate({
      id: task.id,
      data: { status: isCompleted ? 'pending' : 'completed' },
    });
  }

  function handleDelete() {
    // Native alert for confirmation before deleting
    Alert.alert(
      'Delete task',
      `Delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask.mutate(task.id),
        },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* Title — strikethrough when completed */}
        <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
          {task.title}
        </Text>

        {/* Priority badge */}
        <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
            {task.priority}
          </Text>
        </View>
      </View>

      {/* Optional description */}
      {task.description ? (
        <Text style={styles.description}>{task.description}</Text>
      ) : null}

      <View style={styles.actions}>
        {/* Complete / Undo toggle */}
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleToggleComplete}
          disabled={updateTask.isPending}
        >
          <Text style={styles.completeButtonText}>
            {isCompleted ? 'Undo' : 'Complete'}
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          disabled={deleteTask.isPending}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  completeButton: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  completeButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
});
