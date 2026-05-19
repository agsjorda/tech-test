// ─── AppNavigator ─────────────────────────────────────────────────────────────
// Decides which stack to show based on whether a token exists in SecureStore.
//
// Two stacks:
//   Auth stack  — Login, Register  (shown when user is not logged in)
//   App stack   — TaskList, CreateTask  (shown when user is logged in)
//
// On mount we read SecureStore once. After that, screens call setIsLoggedIn()
// (exported below) to trigger a switch — login/register call it with true,
// logout calls it with false. This avoids re-reading SecureStore on every render.

import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { setToken } from '../lib/api';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TaskListScreen from '../screens/TaskListScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';

// ─── Navigation type definitions ─────────────────────────────────────────────
// Mapping screen name → route params. `undefined` means the screen takes no params.
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  TaskList: undefined;
  CreateTask: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

// ─── Module-level setter — called by useAuth hooks ────────────────────────────
// Screens import this and call it after login/register/logout so the navigator
// re-renders without needing props or context drilling.
let _setIsLoggedIn: ((v: boolean) => void) | null = null;

export function notifyAuthChange(loggedIn: boolean) {
  _setIsLoggedIn?.(loggedIn);
}

// ─── Navigator component ──────────────────────────────────────────────────────
export default function AppNavigator() {
  // null = still checking SecureStore (show nothing while loading)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Register the setter so useAuth can trigger a stack switch
  _setIsLoggedIn = setIsLoggedIn;

  useEffect(() => {
    // Read token from encrypted storage on every app launch
    SecureStore.getItemAsync('token').then((token) => {
      if (token) {
        // Populate the Axios interceptor so requests are authenticated immediately
        setToken(token);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });
  }, []);

  // Still reading SecureStore — render nothing to avoid a flash of the wrong stack
  if (isLoggedIn === null) return null;

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        // ── App stack — authenticated users ──────────────────────────────────
        <AppStack.Navigator>
          <AppStack.Screen
            name="TaskList"
            component={TaskListScreen}
            options={{ title: 'My Tasks' }}
          />
          <AppStack.Screen
            name="CreateTask"
            component={CreateTaskScreen}
            options={{ title: 'New Task' }}
          />
        </AppStack.Navigator>
      ) : (
        // ── Auth stack — unauthenticated users ────────────────────────────────
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
