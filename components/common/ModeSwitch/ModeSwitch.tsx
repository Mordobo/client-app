import { t } from '@/i18n';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export type UserMode = 'client' | 'provider';
export type ModeSwitchVariant = 'pill' | 'card' | 'floating' | 'dual' | 'header' | 'nav';
export type ModeSwitchSize = 'small' | 'medium' | 'large';

export interface ModeSwitchProps {
  variant?: ModeSwitchVariant;
  currentMode: UserMode;
  onModeChange: (mode: UserMode) => void;
  disabled?: boolean;
  showLabels?: boolean;
  size?: ModeSwitchSize;
  showConfirmation?: boolean;
  onConfirmationRequest?: (newMode: UserMode, confirm: () => void) => void;
}

// Color constants matching specifications
const COLORS = {
  client: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
  },
  provider: {
    primary: '#1B8B5E',
    secondary: '#25A870',
    accent: '#34D399',
  },
  common: {
    background: '#1E1B2E',
    border: '#3D3370',
    inactiveText: '#9CA3AF',
    activeText: '#FFFFFF',
  },
};

const SIZE_CONFIG = {
  small: {
    height: 32,
    padding: 4,
    fontSize: 12,
    iconSize: 14,
    width: 160,
  },
  medium: {
    height: 48,
    padding: 4,
    fontSize: 14,
    iconSize: 18,
    width: 220,
  },
  large: {
    height: 56,
    padding: 8,
    fontSize: 16,
    iconSize: 22,
    width: 240,
  },
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ModeSwitch({
  variant = 'pill',
  currentMode,
  onModeChange,
  disabled = false,
  showLabels = true,
  size = 'medium',
  showConfirmation = false,
  onConfirmationRequest,
}: ModeSwitchProps) {
  const scale = useSharedValue(1);
  const isClient = currentMode === 'client';

  const handlePress = useCallback(() => {
    if (disabled) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Scale animation
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });

    const newMode: UserMode = isClient ? 'provider' : 'client';

    if (showConfirmation && onConfirmationRequest) {
      onConfirmationRequest(newMode, () => {
        onModeChange(newMode);
      });
    } else {
      onModeChange(newMode);
    }
  }, [disabled, isClient, onModeChange, showConfirmation, onConfirmationRequest, scale]);

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Render based on variant
  switch (variant) {
    case 'pill':
      return (
        <PillVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    case 'card':
      return (
        <CardVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    case 'floating':
      return (
        <FloatingVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    case 'dual':
      return (
        <DualVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    case 'header':
      return (
        <HeaderVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    case 'nav':
      return (
        <NavVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
    default:
      return (
        <PillVariant
          currentMode={currentMode}
          onModeChange={handlePress}
          disabled={disabled}
          showLabels={showLabels}
          size={size}
          animatedScaleStyle={animatedScaleStyle}
        />
      );
  }
}

// Pill Variant (Primary)
interface VariantProps {
  currentMode: UserMode;
  onModeChange: () => void;
  disabled: boolean;
  showLabels: boolean;
  size: ModeSwitchSize;
  animatedScaleStyle: any;
}

function PillVariant({
  currentMode,
  onModeChange,
  disabled,
  showLabels,
  size,
  animatedScaleStyle,
}: VariantProps) {
  const isClient = currentMode === 'client';
  const slidePosition = useSharedValue(isClient ? 0 : 1);
  const sizeConfig = SIZE_CONFIG[size];

  useEffect(() => {
    slidePosition.value = withTiming(isClient ? 0 : 1, { duration: 300 });
  }, [isClient, slidePosition]);

  // Calculate exact dimensions
  const containerPadding = sizeConfig.padding;
  const availableWidth = sizeConfig.width - containerPadding * 2;
  const sliderWidth = availableWidth / 2;
  const sliderHeight = sizeConfig.height - containerPadding * 2;

  const slideStyle = useAnimatedStyle(() => {
    const translateX = slidePosition.value * sliderWidth;
    return {
      transform: [{ translateX }],
    };
  });

  const clientIconColor = useAnimatedStyle(() => ({
    opacity: withTiming(isClient ? 1 : 0.35, { duration: 200 }),
  }));

  const providerIconColor = useAnimatedStyle(() => ({
    opacity: withTiming(isClient ? 0.35 : 1, { duration: 200 }),
  }));

  const clientTextStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isClient ? 1 : 0.5, { duration: 200 }),
  }));

  const providerTextStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isClient ? 0.5 : 1, { duration: 200 }),
  }));

  return (
    <AnimatedTouchable
      style={[
        styles.pillContainer,
        animatedScaleStyle,
        { width: sizeConfig.width, height: sizeConfig.height },
        disabled && styles.disabled,
      ]}
      onPress={onModeChange}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: !isClient }}
      accessibilityLabel={isClient ? t('mode.switchToProvider') : t('mode.switchToClient')}
      accessibilityHint={t('mode.switchMode')}
    >
      <View
        style={[
          styles.pillBackground,
          {
            backgroundColor: COLORS.common.background,
            borderColor: COLORS.common.border,
            borderRadius: sizeConfig.height / 2,
            borderWidth: 1,
            padding: containerPadding,
            overflow: 'hidden', // Ensure slider doesn't overflow
          },
        ]}
      >
        {/* Slider with gradient */}
        <Animated.View
          style={[
            slideStyle,
            {
              position: 'absolute',
              width: sliderWidth,
              height: sliderHeight,
              borderRadius: sliderHeight / 2,
              top: containerPadding,
              left: containerPadding,
              overflow: 'hidden', // Ensure gradient doesn't overflow
            },
          ]}
        >
          <LinearGradient
            colors={
              isClient
                ? [COLORS.client.primary, COLORS.client.secondary, COLORS.client.accent]
                : [COLORS.provider.primary, COLORS.provider.secondary, COLORS.provider.accent]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Content layer - above slider */}
        <View style={[styles.pillContent, { zIndex: 1 }]}>
          <View style={styles.pillOption}>
            <Animated.View style={clientIconColor}>
              <Ionicons 
                name={isClient ? "person" : "person-outline"} 
                size={sizeConfig.iconSize} 
                color={COLORS.common.activeText} 
              />
            </Animated.View>
            {showLabels && (
              <Animated.Text 
                style={[
                  styles.pillText, 
                  clientTextStyle, 
                  { 
                    fontSize: sizeConfig.fontSize,
                    color: COLORS.common.activeText,
                    fontWeight: isClient ? '700' : '500',
                  }
                ]}
              >
                {t('mode.client')}
              </Animated.Text>
            )}
          </View>

          <View style={styles.pillOption}>
            <Animated.View style={providerIconColor}>
              <Ionicons 
                name={!isClient ? "construct" : "construct-outline"} 
                size={sizeConfig.iconSize} 
                color={COLORS.common.activeText} 
              />
            </Animated.View>
            {showLabels && (
              <Animated.Text 
                style={[
                  styles.pillText, 
                  providerTextStyle, 
                  { 
                    fontSize: sizeConfig.fontSize,
                    color: COLORS.common.activeText,
                    fontWeight: !isClient ? '700' : '500',
                  }
                ]}
              >
                {t('mode.provider')}
              </Animated.Text>
            )}
          </View>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

// Card Variant - Larger format with description
function CardVariant({ currentMode, onModeChange, disabled, showLabels, size, animatedScaleStyle }: VariantProps) {
  const isClient = currentMode === 'client';
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <AnimatedTouchable
      style={[styles.cardContainer, animatedScaleStyle, disabled && styles.disabled]}
      onPress={onModeChange}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: !isClient }}
      accessibilityLabel={isClient ? t('mode.switchToProvider') : t('mode.switchToClient')}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: COLORS.common.background,
            borderColor: isClient ? COLORS.client.primary : COLORS.provider.primary,
            borderWidth: 2,
            borderRadius: 16,
            padding: 16,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons
            name={isClient ? 'person' : 'construct'}
            size={sizeConfig.iconSize + 8}
            color={isClient ? COLORS.client.primary : COLORS.provider.primary}
          />
          <Text style={[styles.cardTitle, { color: COLORS.common.activeText }]}>
            {isClient ? t('mode.client') : t('mode.provider')}
          </Text>
        </View>
        <Text style={[styles.cardDescription, { color: COLORS.common.inactiveText, fontSize: sizeConfig.fontSize - 2 }]}>
          {isClient ? t('mode.clientDescription') : t('mode.providerDescription')}
        </Text>
      </View>
    </AnimatedTouchable>
  );
}

// Floating Variant - Compact FAB-style
function FloatingVariant({ currentMode, onModeChange, disabled, size, animatedScaleStyle }: VariantProps) {
  const isClient = currentMode === 'client';
  const sizeConfig = SIZE_CONFIG[size];
  const fabSize = sizeConfig.height;

  return (
    <AnimatedTouchable
      style={[
        styles.floatingButton,
        animatedScaleStyle,
        {
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
        },
        disabled && styles.disabled,
      ]}
      onPress={onModeChange}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: !isClient }}
    >
      <LinearGradient
        colors={
          isClient
            ? [COLORS.client.primary, COLORS.client.secondary, COLORS.client.accent]
            : [COLORS.provider.primary, COLORS.provider.secondary, COLORS.provider.accent]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons
        name={isClient ? 'person' : 'construct'}
        size={sizeConfig.iconSize}
        color={COLORS.common.activeText}
      />
    </AnimatedTouchable>
  );
}

// Dual Variant - Side-by-side selection cards
function DualVariant({ currentMode, onModeChange, disabled, showLabels, size, animatedScaleStyle }: VariantProps) {
  const isClient = currentMode === 'client';
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <View style={[styles.dualContainer, { gap: 12 }]}>
      <AnimatedTouchable
        style={[
          styles.dualCard,
          animatedScaleStyle,
          {
            backgroundColor: isClient ? COLORS.client.primary : COLORS.common.background,
            borderColor: isClient ? COLORS.client.primary : COLORS.common.border,
            borderRadius: 16,
            padding: 16,
            flex: 1,
          },
          disabled && styles.disabled,
        ]}
        onPress={() => !isClient && onModeChange()}
        disabled={disabled || isClient}
        accessibilityRole="button"
        accessibilityState={{ selected: isClient }}
      >
        <Ionicons
          name="person"
          size={sizeConfig.iconSize + 4}
          color={isClient ? COLORS.common.activeText : COLORS.common.inactiveText}
        />
        {showLabels && (
          <Text
            style={[
              styles.dualText,
              {
                color: isClient ? COLORS.common.activeText : COLORS.common.inactiveText,
                fontSize: sizeConfig.fontSize,
              },
            ]}
          >
            {t('mode.client')}
          </Text>
        )}
      </AnimatedTouchable>

      <AnimatedTouchable
        style={[
          styles.dualCard,
          animatedScaleStyle,
          {
            backgroundColor: !isClient ? COLORS.provider.primary : COLORS.common.background,
            borderColor: !isClient ? COLORS.provider.primary : COLORS.common.border,
            borderRadius: 16,
            padding: 16,
            flex: 1,
          },
          disabled && styles.disabled,
        ]}
        onPress={() => isClient && onModeChange()}
        disabled={disabled || !isClient}
        accessibilityRole="button"
        accessibilityState={{ selected: !isClient }}
      >
        <Ionicons
          name="construct"
          size={sizeConfig.iconSize + 4}
          color={!isClient ? COLORS.common.activeText : COLORS.common.inactiveText}
        />
        {showLabels && (
          <Text
            style={[
              styles.dualText,
              {
                color: !isClient ? COLORS.common.activeText : COLORS.common.inactiveText,
                fontSize: sizeConfig.fontSize,
              },
            ]}
          >
            {t('mode.provider')}
          </Text>
        )}
      </AnimatedTouchable>
    </View>
  );
}

// Header Variant - Integrated with profile header
function HeaderVariant({ currentMode, onModeChange, disabled, showLabels, size, animatedScaleStyle }: VariantProps) {
  return (
    <PillVariant
      currentMode={currentMode}
      onModeChange={onModeChange}
      disabled={disabled}
      showLabels={showLabels}
      size={size}
      animatedScaleStyle={animatedScaleStyle}
    />
  );
}

// Nav Variant - Horizontal bar in navigation
function NavVariant({ currentMode, onModeChange, disabled, showLabels, size, animatedScaleStyle }: VariantProps) {
  return (
    <PillVariant
      currentMode={currentMode}
      onModeChange={onModeChange}
      disabled={disabled}
      showLabels={showLabels}
      size={size}
      animatedScaleStyle={animatedScaleStyle}
    />
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillBackground: {
    flexDirection: 'row',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  pillContent: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
  },
  pillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  pillText: {
    fontWeight: '600',
  },
  cardContainer: {
    minWidth: 200,
  },
  card: {
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardDescription: {
    marginTop: 4,
  },
  floatingButton: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dualContainer: {
    flexDirection: 'row',
  },
  dualCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    gap: 8,
  },
  dualText: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
