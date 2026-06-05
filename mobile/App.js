import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import LoginScreen from './src/screens/auth/LoginScreen';
import EmployeeNavigator from './src/screens/employee/EmployeeNavigator';
import SupervisorHomeScreen from './src/screens/supervisor/SupervisorHomeScreen';
import AccountsHomeScreen from './src/screens/accounts/AccountsHomeScreen';
import ManagerHomeScreen from './src/screens/manager/ManagerHomeScreen';
import AdminHomeScreen from './src/screens/admin/AdminHomeScreen';

const Stack = createNativeStackNavigator();

function RoleNavigator({ role }) {
  if (role === 'employee') return <EmployeeNavigator />;
  if (role === 'mess_supervisor') return <SupervisorHomeScreen />;
  if (role === 'accounts_supervisor') return <AccountsHomeScreen />;
  if (role === 'manager') return <ManagerHomeScreen />;
  if (role === 'admin' || role === 'super_admin') return <AdminHomeScreen />;
  return <EmployeeNavigator />;
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A7A4A" />
      </View>
    );
  }

  const role = user?.user?.role;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main">
            {() => <RoleNavigator role={role} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}