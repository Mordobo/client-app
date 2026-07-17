import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { DELIVERY_POLICY } from "@/constants/publicPolicies";

export default function DeliveryPage() {
  return <PublicPolicyPage policy={DELIVERY_POLICY} />;
}
