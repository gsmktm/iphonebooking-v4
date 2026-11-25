import { useSearchParams } from 'react-router-dom';
import { PaymentPanel } from '../features/checkout/PaymentPanel';
import { PageIntro, ButtonLink } from '../components/ui';

export default function PaymentFailure() {
  const [params] = useSearchParams();
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="CHECKOUT SUPPORT"
        title="Let’s check your payment."
        description="An interrupted checkout does not determine payment status. View the server-verified status of your reservation before starting another payment."
      />
      {params.get('order') && <PaymentPanel orderId={params.get('order')!} />}
      <div className="button-row">
        <ButtonLink to="/account/orders">Your reservations</ButtonLink>
        <ButtonLink secondary to="/track">
          Track with your receipt key
        </ButtonLink>
        <ButtonLink secondary to="/cart">
          Return to your bag
        </ButtonLink>
      </div>
    </div>
  );
}
