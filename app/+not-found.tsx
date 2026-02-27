import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/ui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text variant="h2">Page not found</Text>
        <Link href="/(app)">
          <Text variant="body" style={styles.link}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { textDecorationLine: 'underline' },
});
