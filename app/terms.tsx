import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { TERMS_POLICY } from "@/constants/publicPolicies";

export default function TermsPage() {
  return <PublicPolicyPage policy={TERMS_POLICY} />;
}
