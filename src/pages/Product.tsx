import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ArrowRight, Heart, ShieldCheck, Truck, RefreshCw, Plus } from 'lucide-react';
import { api, money, track } from '../services/api';
import type { Product as ProductType } from '../services/types';
import { useShop } from '../store/shop';
import {
  Loading,
  ErrorNotice,
  ProductVisual,
  Dialog,
  ButtonLink,
  ArrowLink,
} from '../components/ui';
export default function Product() {
  const { slug } = useParams();
  const result = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<ProductType>(`/products/${slug}`),
  });
  const p = result.data;
  const [color, setColor] = useState(''),
    [storage, setStorage] = useState(''),
    [added, setAdded] = useState(false);
  const { add, toggleWishlist, wishlist, toggleCompare, compare } = useShop();
  useEffect(() => {
    setColor('');
    setStorage('');
    if (p) track('product_viewed', p.id);
  }, [p?.id]);
  if (result.isLoading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (result.error || !p)
    return (
      <div className="container page">
        <ErrorNotice error={result.error} />
      </div>
    );
  const colors = [...new Map(p.variants.map((v) => [v.color, v])).values()];
  const selectedColor = color || p.variants[0]?.color;
  const options = p.variants.filter((v) => v.color === selectedColor);
  const v = options.find((v) => v.storage === (storage || p.variants[0]?.storage)) ?? options[0];
  if (!v)
    return (
      <div className="container page">
        <ErrorNotice
          error={
            new Error(
              'This product has no available configurations. Contact support for assistance.',
            )
          }
        />
      </div>
    );
  const available = v.stock.reduce((s, i) => s + i.available, 0);
  const choose = (kind: 'color' | 'storage', value: string) => {
    if (kind === 'color') setColor(value);
    else setStorage(value);
    track('variant_selected', v.id);
  };
  const addToBag = () => {
    add(p, v);
    setAdded(true);
    track('add_to_cart', v.id);
  };
  return (
    <div className="container page product-page">
      <nav className="breadcrumbs">
        <Link to="/store">Store</Link>
        <span>/</span>
        <Link to={`/${p.category.slug}`}>{p.category.name}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <ProductVisual
            image={v.image ?? p.image}
            name={`${p.name}, ${v.color}`}
            className={`detail-visual color-${v.color.toLowerCase().replaceAll(' ', '-')}`}
          />
          <div className="gallery-caption">
            <span>{p.name}</span>
            <span>Illustrative studio render</span>
          </div>
          <div className="product-benefits">
            <span>
              <ShieldCheck size={19} />
              Warranty information
            </span>
            <span>
              <Truck size={19} />
              Delivery & pickup
            </span>
            <span>
              <RefreshCw size={19} />
              Upgrade possibilities
            </span>
          </div>
        </div>
        <div className="product-config">
          <span className="eyebrow">{p.badge ?? 'FIND YOUR EXTRAORDINARY'}</span>
          <h1>{p.name}</h1>
          <p className="product-tagline">{p.tagline}</p>
          <p className="detail-price">{money(v.price)}</p>
          <span className={`availability ${available ? '' : 'unavailable'}`}>
            <span className="availability-dot" />
            {available
              ? v.preorder
                ? 'Available to reserve'
                : 'In stock · Ready for your next chapter'
              : 'Currently unavailable'}
          </span>
          <fieldset>
            <legend>
              Color. <span>{v.color}</span>
            </legend>
            <div className="color-selectors">
              {colors.map((c) => (
                <button
                  key={c.color}
                  aria-label={c.color}
                  aria-pressed={v.color === c.color}
                  className={v.color === c.color ? 'chosen' : ''}
                  style={{ '--swatch': c.colorHex } as React.CSSProperties}
                  onClick={() => choose('color', c.color)}
                >
                  <span />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              Configuration. <span>Room for your world.</span>
            </legend>
            <div className="storage-selectors">
              {options.map((option) => (
                <button
                  key={option.id}
                  className={v.id === option.id ? 'chosen' : ''}
                  aria-pressed={v.id === option.id}
                  onClick={() => choose('storage', option.storage)}
                >
                  <strong>{option.storage}</strong>
                  <span>{money(option.price)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Link className="trade-in-option" to="/trade-in">
            <RefreshCw size={20} />
            <span>
              <strong>Have a device to trade in?</strong>
              <small>See what it could be worth.</small>
            </span>
            <Plus size={20} />
          </Link>
          {v.preorder && (
            <div className="notice">
              Booking deposit: {money(v.deposit)}. Pay at the store to confirm your allocation.
            </div>
          )}
          <div className="purchase-actions">
            <button className="button" disabled={!available} onClick={addToBag}>
              {v.preorder ? 'Reserve your device' : 'Add to bag'}
              <ArrowRight size={17} />
            </button>
            <button
              className="icon-button wishlist-large"
              aria-label="Save to wishlist"
              aria-pressed={wishlist.includes(p.id)}
              onClick={() => toggleWishlist(p.id)}
            >
              <Heart fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} size={21} />
            </button>
          </div>
          <p className="fine-print">
            Final availability and delivery timing are confirmed at checkout. SKU: {v.sku}
          </p>
          <button className="text-button" onClick={() => toggleCompare(p.id)}>
            {compare.includes(p.id) ? <Check size={16} /> : <Plus size={16} />}Add to comparison
          </button>
        </div>
      </div>
      <section className="product-story">
        <span className="eyebrow">THE DETAILS MAKE THE DIFFERENCE</span>
        <h2>Made for more.</h2>
        <p>{p.description}</p>
        <div className="spec-grid">
          {Object.entries(p.specs).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="faq">
        <h2>A few things you might be wondering.</h2>
        {[
          [
            'How do I reserve this device?',
            'Choose your color and configuration, add it to your bag, and complete checkout. Your reservation is held for 24 hours for store payment.',
          ],
          [
            'Can I trade in my current device?',
            'Yes. Get an estimate online, then bring your device for inspection. Once you accept the final quote, the value can be applied to an eligible order.',
          ],
          [
            'What about warranty and repair?',
            'Your order and device information live in your account. Coverage should be confirmed with the store before purchase. Repair requests and quotes are managed from the same account.',
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <Plus size={18} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <div className="mobile-purchase-bar">
        <div>
          <strong>{money(v.price)}</strong>
          <small>
            {v.storage} · {v.color}
          </small>
        </div>
        <button className="button" disabled={!available} onClick={addToBag}>
          Add to bag
        </button>
      </div>
      <Dialog open={added} onClose={() => setAdded(false)} title="A great choice.">
        <div className="added-product">
          <ProductVisual image={p.image} name={p.name} />
          <div>
            <h3>{p.name}</h3>
            <p>
              {v.color} · {v.storage}
            </p>
            <strong>{money(v.price)}</strong>
          </div>
        </div>
        <ButtonLink to="/cart">View your bag</ButtonLink>
        <button className="text-button" onClick={() => setAdded(false)}>
          Keep exploring
        </button>
      </Dialog>
    </div>
  );
}
