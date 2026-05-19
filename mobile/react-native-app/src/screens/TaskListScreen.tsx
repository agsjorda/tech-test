// ─── TaskListScreen ───────────────────────────────────────────────────────────
// Main screen for authenticated users. Shows all tasks with:
//   - Status filter tabs (All / Pending / Completed)
//   - FlatList of TaskItem components
//   - Pull-to-refresh via RefreshControl
//   - "New Task" button that navigates to CreateTaskScreen
//   - Logout button in the header area

import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useTasks } from '../hooks/useTasks';
import { useLogout } from '../hooks/useAuth';
import TaskItem from '../components/TaskItem';
import type { TaskStatus } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'TaskList'>;

// Filter tab options — undefined means "all tasks", no status filter applied
const FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All',       value: undefined },
  { label: 'Pending',   value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export default function TaskListScreen({ navigation }: Props) {
  // statusFilter is lifted state — owned here, passed down to useTasks and filter tabs
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  const { data, isLoading, isError, refetch, isRefetching } = useTasks(statusFilter);
  const logout = useLogout();

  const tasks = data?.data ?? [];

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Tasks</Text>
        <TouchableOpacity
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status filter tabs ──────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={styles.centered} size="large" color="#2563eb" />
      ) : isError ? (
        <Text style={styles.errorText}>Failed to load tasks. Pull down to retry.</Text>
      ) : (
        // FlatList is the performant list component for React Native — it only
        // renders items currently visible on screen (virtual scrolling)
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TaskItem task={item} />}
          contentContainerStyle={styles.list}
          // RefreshControl wires pull-to-refresh to TanStack Query's refetch
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#2563eb']}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {statusFilter
                ? `No ${statusFilter} tasks.`
                : 'No tasks yet. Tap + to create one.'}
            </Text>
          }
        />
      )}

      {/* ── Floating "New Task" button ───────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Text style={styles.fabText}>+ New Task</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  filterTabActive: { backgroundColor: '#2563eb' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  filterTabTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { textAlign: 'center', marginTop: 40, color: '#dc2626', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9ca3af', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 13,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
