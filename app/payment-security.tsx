import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { SECURITY_POLICY } from "@/constants/publicPolicies";

export default function PaymentSecurityPage() {
  return <PublicPolicyPage policy={SECURITY_POLICY} showPaymentMarks />;
}
