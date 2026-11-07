import { PaymentMethodsView } from "@/components/account/payment-methods-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("paymentMethods");

export default function Page() {
  return <PaymentMethodsView />;
}
