import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface ErrorBoundaryProps {
  error: Error;
  retry?: () => void;
}

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  // Log to native console (visible in adb logcat)
  console.error('[ErrorBoundary] Caught error:', error);
  console.error('[ErrorBoundary] Stack:', error.stack);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.message}>
          La aplicación encontró un error inesperado.
        </Text>
        
        {__DEV__ && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Error details (dev only):</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.errorStack} numberOfLines={10}>
                {error.stack}
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.buttonText}>Volver al inicio</Text>
          </TouchableOpacity>
          
          {retry && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={retry}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                Intentar de nuevo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextSecondary: {
    color: '#3b82f6',
  },
});
