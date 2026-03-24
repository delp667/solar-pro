import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CompanySelectionScreen from '../screens/CompanySelectionScreen';
import ServiceTypeScreen from '../screens/ServiceTypeScreen';
import WaitingScreen from '../screens/WaitingScreen';
import { colors, typography, spacing } from '../theme';

const Stack = createStackNavigator();

function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backButton} activeOpacity={0.7}>
      <Text style={styles.backText}>→ חזור</Text>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          headerStyle: {
            backgroundColor: colors.background,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            ...typography.bodyMedium,
            color: colors.text,
          },
          headerTintColor: colors.primary,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
          headerTitle: '',
        })}
      >
        <Stack.Screen
          name="CompanySelection"
          component={CompanySelectionScreen}
        />
        <Stack.Screen
          name="ServiceType"
          component={ServiceTypeScreen}
        />
        <Stack.Screen
          name="Waiting"
          component={WaitingScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
});
