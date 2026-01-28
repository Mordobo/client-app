import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isActive = index <= currentStep;
          if (isActive) {
            return (
              <LinearGradient
                key={index}
                colors={['#6366F1', '#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.barSegment}
              />
            );
          }
          return (
            <View
              key={index}
              style={styles.barSegment}
            />
          );
        })}
      </View>
      <Text style={styles.stepText}>
        Paso {currentStep + 1} de {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  barContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
});
