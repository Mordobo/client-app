import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { REFUND_POLICY } from "@/constants/publicPolicies";

export default function RefundsPage() {
  return <PublicPolicyPage policy={REFUND_POLICY} />;
}
