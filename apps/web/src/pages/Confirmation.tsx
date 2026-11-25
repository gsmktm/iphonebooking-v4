import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import type { Order } from '../services/types';
import { money } from '../services/api';
import { PaymentPanel } from '../features/checkout/PaymentPanel';
import { PageIntro, ButtonLink, Empty } from '../components/ui';
export default function Confirmation() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  const [saved] = useState<Order | undefined>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('iphonebooking-receipt') ?? 'null') ?? undefined;
    } catch {
      return undefined;
    }
  });
  const requestedOrder = params.get('order');
  const order =
    (state as { order?: Order } | null)?.order ??
    (requestedOrder && saved?.id !== requestedOrder ? undefined : saved);
  if (!order)
    return (
      <div className="container page">
        {params.get('order') ? (
          <PaymentPanel orderId={params.get('order')!} />
        ) : (
          <Empty
            title="Find your reservation."
            description="Your saved reservations are available in your account."
            link="/account/orders"
            action="View your orders"
          />
        )}
      </div>
    );
  const download = () => {
    const file = new Blob(
      [
        `iPhoneBooking — RESERVATION RECORD\nOrder: ${order.number}\nProduct total at reservation: ${money(order.total)}\nInitial amount due: ${money(order.dueNow)}\nPrivate receipt key: ${order.trackingToken}\n\nThis is a reservation record, not proof of payment. Check the current status online. Unpaid reservations are normally held for 24 hours; unresolved provider payments need review.\nTrack: ${location.origin}/track\nKeep this key private. It allows access to order status and account claiming.`,
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.number}-reservation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="container page narrow confirmation">
      <div className="success-icon">
        <Check size={32} />
      </div>
      <PageIntro
        eyebrow="A GREAT BEGINNING"
        title={
          order.status === 'PAID'
            ? 'Your reservation is confirmed.'
            : 'Your next chapter is reserved.'
        }
        description={
          order.status === 'PAID'
            ? 'Accepted trade-in credit covers this order. Track your next steps below.'
            : 'Your reservation is saved. Review its current status below and choose an available payment option.'
        }
      />
      <div className="record-card">
        <h2>{order.number}</h2>
        <div className="summary-row">
          <span>Product total</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="summary-row">
          <span>Initial amount due</span>
          <strong>{money(order.dueNow)}</strong>
        </div>
        <label>
          Private receipt key
          <input readOnly value={order.trackingToken} />
        </label>
        <p className="fine-print">
          Save this key now. Use it to track this order or claim it in your account. Keep it
          private.
        </p>
        <button className="button secondary" onClick={download}>
          <Download size={16} />
          Save reservation record
        </button>
      </div>
      <PaymentPanel orderId={order.id} receiptKey={order.trackingToken} />
      <div className="button-row">
        <ButtonLink to="/account/orders">Your orders</ButtonLink>
        <ButtonLink secondary to="/track">
          Track reservation
        </ButtonLink>
      </div>
    </div>
  );
}
