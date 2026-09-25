import { useLocation } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import type { Order } from '../services/types';
import { money } from '../services/api';
import { PageIntro, ButtonLink, Empty } from '../components/ui';
export default function Confirmation() {
  const { state } = useLocation();
  const order = (state as { order?: Order } | null)?.order;
  if (!order)
    return (
      <div className="container page">
        <Empty
          title="Find your reservation."
          description="Your saved reservations are available in your account."
          link="/account/orders"
          action="View your orders"
        />
      </div>
    );
  const download = () => {
    const file = new Blob(
      [
        `iPhoneBooking — UNPAID RESERVATION\nOrder: ${order.number}\nTotal: ${money(order.total)}\nDue at store: ${money(order.dueNow)}\nPrivate receipt key: ${order.trackingToken}\n\nNo payment has been collected. Reservation expires in 24 hours.\nTrack: ${location.origin}/track\nKeep this key private. It allows access to order status and account claiming.`,
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
        title="Your next chapter is reserved."
        description="No payment has been collected. Complete payment with store staff within 24 hours to keep your reservation."
      />
      <div className="record-card">
        <h2>{order.number}</h2>
        <div className="summary-row">
          <span>Product total</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="summary-row">
          <span>Due at store</span>
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
          Save reservation receipt
        </button>
      </div>
      <div className="button-row">
        <ButtonLink to="/account/orders">Your orders</ButtonLink>
        <ButtonLink secondary to="/track">
          Track reservation
        </ButtonLink>
      </div>
    </div>
  );
}
