import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ThreeDSecureVariant = "visa_secure" | "mastercard_id_check";

interface ThreeDSecureMarkProps {
  variant: ThreeDSecureVariant;
  width?: number;
}

/**
 * Visual 3-D Secure marks required by Azul on home, security policy, and checkout.
 * Styled to match Verified by Visa / Visa Secure and Mastercard Identity Check branding.
 */
export function ThreeDSecureMark({ variant, width = 148 }: ThreeDSecureMarkProps) {
  if (variant === "visa_secure") {
    const height = Math.round(width * 0.42);
    return (
      <View
        style={[styles.visaShell, { width, height, borderRadius: Math.round(height * 0.18) }]}
        accessibilityRole="image"
        accessibilityLabel="Verified by Visa / Visa Secure"
      >
        <View style={styles.visaShield}>
          <Text style={styles.visaCheck}>✓</Text>
        </View>
        <View style={styles.visaCopy}>
          <Text style={styles.visaVerified}>Verified by Visa</Text>
          <Text style={styles.visaSecure}>Visa Secure</Text>
        </View>
      </View>
    );
  }

  const height = Math.round(width * 0.42);
  const circle = Math.round(height * 0.42);
  return (
    <View
      style={[styles.mcShell, { width, height, borderRadius: Math.round(height * 0.18) }]}
      accessibilityRole="image"
      accessibilityLabel="Mastercard Identity Check"
    >
      <View style={[styles.mcCircles, { width: circle * 1.55, height: circle }]}>
        <View style={[styles.mcCircle, styles.mcRed, { width: circle, height: circle, borderRadius: circle / 2 }]} />
        <View
          style={[
            styles.mcCircle,
            styles.mcOrange,
            { width: circle, height: circle, borderRadius: circle / 2, left: circle * 0.55 },
          ]}
        />
      </View>
      <View style={styles.mcCopy}>
        <Text style={styles.mcTitle}>Mastercard</Text>
        <Text style={styles.mcSubtitle}>Identity Check</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visaShell: {
    backgroundColor: "#1A1F71",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  visaShield: {
    width: 28,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  visaCheck: {
    color: "#1A1F71",
    fontSize: 16,
    fontWeight: "800",
    marginTop: -1,
  },
  visaCopy: {
    flexShrink: 1,
  },
  visaVerified: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  visaSecure: {
    color: "#A5B4FC",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  mcShell: {
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  mcCircles: {
    position: "relative",
  },
  mcCircle: {
    position: "absolute",
    top: 0,
  },
  mcRed: {
    backgroundColor: "#EB001B",
    left: 0,
  },
  mcOrange: {
    backgroundColor: "#F79E1B",
  },
  mcCopy: {
    flexShrink: 1,
  },
  mcTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  mcSubtitle: {
    color: "#D1D5DB",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
});
