import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ThreeDSecureVariant = "visa_secure" | "mastercard_id_check";

interface ThreeDSecureMarkProps {
  variant: ThreeDSecureVariant;
  width?: number;
}

/**
 * Visual 3-D Secure marks required by Azul on home, security policy, and checkout.
 * Mastercard uses the official ID Check mark provided for merchant review.
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

  // Official Mastercard ID Check mark (square asset from Azul / Mastercard).
  const size = Math.round(width * 0.72);
  return (
    <View
      style={[styles.mcOfficialShell, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel="Mastercard ID Check"
    >
      <Image
        source={require("@/assets/images/payment/mastercard-id-check.png")}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
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
  mcOfficialShell: {
    backgroundColor: "#000000",
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
