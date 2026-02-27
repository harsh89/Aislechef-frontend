import React, { useEffect, useCallback, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { useSync } from '../hooks/useSync';
import { useTheme } from '../hooks/useTheme';
import { getDatabase } from '../lib/database';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 30 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(app)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function SyncProvider() {
  const onConflict = useCallback(() => {
    Alert.alert('Sync', 'Some items were updated from another device.');
  }, []);
  useSync(onConflict);
  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const { colors } = useTheme();

  useEffect(() => {
    initialize();
    getDatabase(); // initialize SQLite on startup
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <SyncProvider />
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
            </AuthGuard>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
