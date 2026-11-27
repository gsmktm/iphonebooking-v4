import { displaySpecValue } from '../services/product-spec';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ArrowRight, Heart, ShieldCheck, Truck, RefreshCw, Plus } from 'lucide-react';
import { api, money, track } from '../services/api';
import type { Product as ProductType } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import { useShop } from '../store/shop';
import { useRecentDevices } from '../store/recent';
import ProductReviews from '../features/reviews/Reviews';
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
  const [params, setParams] = useSearchParams();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const result = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<ProductType & { related: ProductType[] }>(`/products/${slug}`),
  });
  const credits = useQuery({
    queryKey: ['product-photo-credits', slug],
    queryFn: () =>
      api<{
        url: string;
        sourceType: string;
        sourceCredit: string;
        sourceUrl: string | null;
        license: string | null;
        licenseUrl: string | null;
        altText: string;
      }[]>('/media/credits?slug=' + encodeURIComponent(slug ?? '')),
    enabled: Boolean(slug),
  });
  const p = result.data;
  const [color, setColor] = useState(''),
    [storage, setStorage] = useState(''),
    [added, setAdded] = useState(false);
  const { add, toggleWishlist, wishlist, toggleCompare, compare } = useShop();
  useEffect(() => {
    setColor('');
    setStorage('');
    if (p) {
      track('product_viewed', p.id);
      useRecentDevices.getState().record(p.id);
    }
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
  const requested = p.variants.find((v) => v.id === params.get('variant'));
  const selectedColor = color || requested?.color || p.variants[0]?.color;
  const options = p.variants.filter((v) => v.color === selectedColor);
  const v =
    options.find((v) => v.storage === (storage || requested?.storage || p.variants[0]?.storage)) ??
    options[0];
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
    const next =
      kind === 'color'
        ? (p.variants.find((option) => option.color === value && option.storage === v.storage) ??
          p.variants.find((option) => option.color === value))
        : p.variants.find((option) => option.color === v.color && option.storage === value);
    if (next) setParams({ variant: next.id }, { replace: true });
    setGalleryIndex(0);
    track('variant_selected', next?.id ?? v.id);
  };
  const gallery = [...new Set([v.image ?? p.image, ...p.gallery])];
  const currentPhotoCredit = credits.data?.find((credit) => credit.url === (gallery[galleryIndex] ?? gallery[0]));
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
        <Link to={`/store?category=${p.category.slug}`}>{p.category.name}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <ProductVisual
            image={gallery[galleryIndex] ?? gallery[0]}
            name={`${p.name}, ${v.color}`}
            className={`detail-visual color-${v.color.toLowerCase().replaceAll(' ', '-')}`}
          />
          <div className="gallery-thumbnails" aria-label="Product gallery">
            {gallery.length > 1 &&
              gallery.map((image, i) => (
                <button
                  key={image}
                  aria-label={`View product image ${i + 1}`}
                  aria-pressed={galleryIndex === i}
                  onClick={() => setGalleryIndex(i)}
                >
                  <ProductVisual image={image} name={`${p.name}, view ${i + 1}`} />
                </button>
              ))}
          </div>
          <div className="gallery-caption">
            <span>{p.name}</span>
            <span>{gallery[galleryIndex]?.startsWith('/api/v1/media/') ? 'Original device photograph' : 'Illustrative studio render'}</span>
          </div>
          {currentPhotoCredit && (
            <div className="product-photo-attribution">
              Photo: {currentPhotoCredit.sourceCredit}
              {currentPhotoCredit.sourceUrl && (
                <>
                  {' · '}
                  <a href={currentPhotoCredit.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Original image source
                  </a>
                </>
              )}
              {currentPhotoCredit.license && (
                <>
                  {' · '}
                  {currentPhotoCredit.licenseUrl ? (
                    <a href={currentPhotoCredit.licenseUrl} target="_blank" rel="noopener noreferrer">
                      {currentPhotoCredit.license}
                    </a>
                  ) : (
                    currentPhotoCredit.license
                  )}
                </>
              )}
            </div>
          )}
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
              Booking deposit: {money(v.deposit)}. Payment options are shown after you reserve.
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
              <strong>{displaySpecValue(value)}</strong>
            </div>
          ))}
        </div>
      </section>
      <ProductReviews key={p.id} slug={p.slug} />
      <section className="faq">
        <h2>A few things you might be wondering.</h2>
        {[
          [
            'How do I reserve this device?',
            'Choose your color and configuration, add it to your bag, and complete checkout. Your unpaid reservation is normally held for 24 hours. Available payment options appear after you reserve.',
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
      {!!p.related?.length && (
        <section className="related-products">
          <h2>A few more possibilities.</h2>
          <div className="product-grid">
            {p.related.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
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
