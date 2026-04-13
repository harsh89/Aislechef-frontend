import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from './ui/Text';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text variant="h3" style={styles.title}>Something went wrong</Text>
        <Text variant="body" muted style={styles.message}>{this.state.message}</Text>
        <Pressable onPress={this.reset} style={styles.button}>
          <Text variant="bodyMd" style={{ color: '#fff' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { marginBottom: 12, textAlign: 'center' },
  message: { textAlign: 'center', marginBottom: 32 },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
});
