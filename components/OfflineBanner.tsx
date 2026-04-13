import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Text } from './ui/Text';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -40,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text variant="small" style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '600' },
});
