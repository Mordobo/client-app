import { t } from '@/i18n';
import type { CardMarkVariant } from '@/utils/cardNetwork';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export interface CardBrandMarkProps {
  variant: CardMarkVariant;
  /** Total width of the plastic (height follows ISO ~1.586 ratio if omitted). */
  width?: number;
  /** If omitted, derived from `width` for credit-card proportions. */
  height?: number;
}

/** ISO/IEC 7810 ID-1 width:height ≈ 1.586 : 1 */
const CARD_ASPECT = 1.5862;

function gradientForVariant(v: CardMarkVariant): readonly [string, string] {
  switch (v) {
    case 'visa':
      return ['#1A1F71', '#2B4FFE'];
    case 'mastercard':
      return ['#1a1a1a', '#2d2d2d'];
    case 'amex':
      return ['#006FCF', '#00A1E0'];
    case 'discover':
      return ['#FF6000', '#FFB000'];
    case 'diners':
      return ['#0079BE', '#004B87'];
    case 'jcb':
      return ['#0B4EA2', '#6C2B8E'];
    case 'unionpay':
      return ['#045AA7', '#E21836'];
    case 'maestro':
      return ['#6C2BD9', '#0099DF'];
    case 'mir':
      return ['#39B54A', '#0D7A3A'];
    case 'elo':
      return ['#1B1B1B', '#2a2a2a'];
    case 'hipercard':
      return ['#822124', '#D52B1E'];
    case 'cartes_bancaires':
      return ['#429AD4', '#103E68'];
    case 'interac':
      return ['#1a237e', '#283593'];
    case 'dankort':
      return ['#0070C0', '#D52B1E'];
    case 'paypal':
      return ['#003087', '#009CDE'];
    case 'apple_pay':
      return ['#000000', '#2c2c2e'];
    case 'google_pay':
      return ['#1a237e', '#0d47a1'];
    case 'other_card':
    case 'unknown':
      return ['#374151', '#1f2937'];
    default:
      return ['#374151', '#1f2937'];
  }
}

function MastercardCircles({ w, h }: { w: number; h: number }) {
  const d = Math.min(w * 0.26, h * 0.42);
  return (
    <View
      style={{
        position: 'absolute',
        right: w * 0.06,
        bottom: h * 0.12,
        width: d * 1.65,
        height: d,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: '#EB001B',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: d * 0.55,
          top: 0,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: '#F79E1B',
          opacity: 0.98,
        }}
      />
    </View>
  );
}

const shineStyle = StyleSheet.create({
  shine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-18deg' }, { translateX: -12 }],
  },
});

/**
 * Mini plastic card: ISO-like proportions, EMV chip, optional brand motif, monogram.
 */
export function CardBrandMark({ variant, width = 56, height: heightProp }: CardBrandMarkProps): React.ReactElement {
  const w = width;
  const h = heightProp ?? Math.round(width / CARD_ASPECT);
  const colors = useMemo(() => gradientForVariant(variant), [variant]);
  const a11yLabel = useMemo(() => t(`payment.cardNetworks.${variant}`), [variant]);
  const plasticLabel = useMemo(() => t(`payment.cardNetworks.${variant}`), [variant]);
  const mastercardWordmark = useMemo(() => t('payment.cardNetworks.mastercard'), [variant]);
  const mcInitials = useMemo(() => t('payment.cardPlastic.mcInitials'), []);
  const corner = Math.max(6, Math.round(Math.min(w, h) * 0.12));
  const chipW = Math.round(w * 0.2);
  const chipH = Math.round(h * 0.22);
  const chipLeft = Math.round(w * 0.08);
  const chipTop = Math.round(h * 0.2);
  const fontSize = Math.max(7, Math.min(11, Math.round(h * 0.16)));

  return (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: corner,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 4,
          },
          android: { elevation: 5 },
          default: {},
        }),
      }}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <LinearGradient
        colors={[colors[0], colors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: w,
          height: h,
          borderRadius: corner,
          overflow: 'hidden',
        }}
      >
        {/* Brillo sutil tipo plástico */}
        <View style={[shineStyle.shine, { width: w * 0.45 }]} />

        {/* Chip EMV */}
        <View
          style={{
            position: 'absolute',
            left: chipLeft,
            top: chipTop,
            width: chipW,
            height: chipH,
            borderRadius: 4,
            backgroundColor: '#c9a227',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.15)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: chipLeft + 2,
            top: chipTop + 2,
            width: chipW - 4,
            height: chipH - 4,
            borderRadius: 2,
            backgroundColor: '#d4bc6a',
            opacity: 0.85,
          }}
        />

        {variant === 'mastercard' ? <MastercardCircles w={w} h={h} /> : null}

        {variant === 'mastercard' ? (
          <Text
            style={{
              position: 'absolute',
              left: Math.max(4, w * 0.06),
              bottom: Math.max(3, h * 0.08),
              color: 'rgba(255,255,255,0.92)',
              fontSize: Math.max(7, fontSize * 0.85),
              fontWeight: '900',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
            numberOfLines={1}
          >
            {mcInitials}
          </Text>
        ) : null}

        {/* Franja tipo Amex (solo amex) */}
        {variant === 'amex' ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: h * 0.38,
              height: h * 0.12,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
        ) : null}

        {variant !== 'mastercard' ? (
          <View
            style={{
              position: 'absolute',
              right: Math.max(4, w * 0.06),
              bottom: Math.max(4, h * 0.08),
              maxWidth: w * 0.62,
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize,
                fontWeight: '800',
                letterSpacing: variant === 'visa' ? 1.2 : 0.4,
                fontStyle: variant === 'visa' ? 'italic' : 'normal',
                textAlign: 'right',
                textShadowColor: 'rgba(0,0,0,0.35)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {plasticLabel}
            </Text>
          </View>
        ) : null}

        {variant === 'mastercard' ? (
          <View
            style={{
              position: 'absolute',
              right: Math.max(4, w * 0.06),
              bottom: Math.max(4, h * 0.08),
              maxWidth: w * 0.48,
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: Math.max(6, fontSize * 0.72),
                fontWeight: '700',
                textAlign: 'right',
                textTransform: 'lowercase',
                textShadowColor: 'rgba(0,0,0,0.45)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {mastercardWordmark}
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}
