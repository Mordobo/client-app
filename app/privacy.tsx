import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { PRIVACY_POLICY } from "@/constants/publicPolicies";

export default function PrivacyPage() {
  return <PublicPolicyPage policy={PRIVACY_POLICY} />;
}
