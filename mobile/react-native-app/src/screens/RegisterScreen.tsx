// ─── RegisterScreen ───────────────────────────────────────────────────────────
// Four controlled inputs: name, email, password, confirm password.
// Client-side check: passwords must match before sending the request.
// On success, useRegister's onSuccess saves the token and switches to app stack.

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
import type { AuthStackParamList } from '../navigation/AppNavigator';
import { useRegister } from '../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const register = useRegister();

  // Extract API error — can be a top-level message or per-field errors
  const apiError =
    register.error && 'response' in register.error
      ? (
          register.error as {
            response?: { data?: { message?: string; errors?: Record<string, string[]> } };
          }
        ).response?.data
      : null;

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    if (password !== passwordConfirmation) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    register.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>

        {/* API error banner — e.g. "The email has already been taken." */}
        {apiError?.message ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{apiError.message}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="John Doe"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
          autoComplete="name"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, register.isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={register.isPending}
        >
          {register.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
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
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  linkBold: { color: '#2563eb', fontWeight: '600' },
});
