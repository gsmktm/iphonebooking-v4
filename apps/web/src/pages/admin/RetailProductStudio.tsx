import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Plus, Search, Save } from 'lucide-react';
import { api, money } from '../../services/api';
import type { Category, User } from '../../services/types';
import { ErrorNotice, Loading } from '../../components/ui';
import { MediaUploader } from './MediaUploader';
import { ProductMediaGallery } from './ProductMediaGallery';
import type { RetailProduct } from './media-types';

type Page = { rows: RetailProduct[]; total: number; page: number; pageSize: number };

const paise = (amount: string) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0 || Math.round(n * 100) !== n * 100)
    throw new Error('Enter a valid NPR amount with up to two decimal places.');
  return Math.round(n * 100);
};
const asNpr = (amount: number | null | undefined) =>
  amount === null || amount === undefined ? '' : (amount / 100).toString();

function VariantEditor({
  variant,
  productId,
  canEdit,
  onSaved,
}: {
  variant?: RetailProduct['variants'][number];
  productId: string;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [color, setColor] = useState(variant?.color ?? 'Natural');
  const [colorHex, setColorHex] = useState(variant?.colorHex ?? '#d4d4d4');
  const [storage, setStorage] = useState(variant?.storage ?? '');
  const [price, setPrice] = useState(asNpr(variant?.price));
  const [comparePrice, setComparePrice] = useState(asNpr(variant?.comparePrice));
  const [deposit, setDeposit] = useState(asNpr(variant?.deposit));
  const [preorder, setPreorder] = useState(variant?.preorder ?? false);
  const [image, setImage] = useState(variant?.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = {
        price: paise(price),
        comparePrice: comparePrice ? paise(comparePrice) : null,
        deposit: deposit ? paise(deposit) : 0,
        preorder,
        image: image || null,
      };
      if (data.deposit > data.price) throw new Error('Deposit cannot exceed selling price.');
      if (variant) {
        await api('/admin/variants/' + encodeURIComponent(variant.id), {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await api('/admin/variants', {
          method: 'POST',
          body: JSON.stringify({
            productId,
            sku,
            color,
            colorHex,
            storage,
            price: data.price,
            deposit: data.deposit,
            preorder,
          }),
        });
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save configuration');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="studio-variant" onSubmit={(event) => void save(event)}>
      <div className="studio-fields studio-fields--two">
        <label>
          SKU
          <input value={sku} required={!variant} disabled={Boolean(variant) || !canEdit} maxLength={120} onChange={(event) => setSku(event.target.value)} />
        </label>
        <label>
          Storage / RAM configuration
          <input value={storage} required={!variant} disabled={Boolean(variant) || !canEdit} onChange={(event) => setStorage(event.target.value)} />
        </label>
        {!variant && (
          <>
            <label>
              Color
              <input required value={color} onChange={(event) => setColor(event.target.value)} />
            </label>
            <label>
              Color hex
              <input required type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value)} />
            </label>
          </>
        )}
        <label>
          Selling price (NPR)
          <input required type="number" min="1" step=".01" value={price} disabled={!canEdit || busy} onChange={(event) => setPrice(event.target.value)} />
        </label>
        {variant && (
          <label>
            Verified compare-at price (NPR · optional)
            <input type="number" min="1" step=".01" value={comparePrice} disabled={!canEdit || busy} onChange={(event) => setComparePrice(event.target.value)} />
          </label>
        )}
        <label>
          Deposit (NPR)
          <input type="number" min="0" step=".01" value={deposit} disabled={!canEdit || busy} onChange={(event) => setDeposit(event.target.value)} />
        </label>
      </div>
      <label className="studio-check">
        <input type="checkbox" checked={preorder} disabled={!canEdit || busy} onChange={(event) => setPreorder(event.target.checked)} />
        Accept pre-orders when availability rules allow
      </label>
      {variant && (
        <div className="studio-variant-photo">
          <label>
            Variant image path
            <input value={image} disabled={!canEdit || busy} placeholder="/api/v1/media/..." onChange={(event) => setImage(event.target.value)} />
          </label>
          {canEdit && (
            <MediaUploader
              onUploaded={(asset) => setImage(asset.url)}
            />
          )}
        </div>
      )}
      {error && <p className="studio-error" role="alert">{error}</p>}
      {canEdit && (
        <button type="submit" disabled={busy} className="button secondary">
          <Save size={15} /> {busy ? 'Saving…' : variant ? 'Save configuration' : 'Add configuration'}
        </button>
      )}
    </form>
  );
}

function RetailForm({
  product,
  canEdit,
  canCreate,
  onSaved,
  onCancel,
}: {
  product: RetailProduct | null;
  canEdit: boolean;
  canCreate: boolean;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [tagline, setTagline] = useState(product?.tagline ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [badge, setBadge] = useState(product?.badge ?? '');
  const [active, setActive] = useState(product?.active ?? false);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [cover, setCover] = useState(product?.image ?? '');
  const [gallery, setGallery] = useState(product?.gallery ?? []);
  const [specsText, setSpecsText] = useState(JSON.stringify(product?.specs ?? {}, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const qc = useQueryClient();
  const canSave = product ? canEdit : canCreate;
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (!cover) throw new Error('Upload or select a main product photograph first.');
      const specs: unknown = JSON.parse(specsText);
      if (!specs || typeof specs !== 'object' || Array.isArray(specs))
        throw new Error('Specifications must be a JSON object.');
      const data = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        tagline,
        description,
        categoryId: categoryId || categories.data?.[0]?.id || '',
        badge: badge.trim() || null,
        active,
        featured,
        image: cover,
        gallery: [...new Set(gallery.filter((value) => value !== cover))],
        specs,
      };
      const result = await api<RetailProduct>(
        product ? '/admin/products/' + encodeURIComponent(product.id) : '/admin/products',
        {
          method: product ? 'PATCH' : 'POST',
          body: JSON.stringify(product ? { ...data, expectedUpdatedAt: product.updatedAt } : data),
        },
      );
      setNotice('Product saved. Images linked to this record will be visible according to its publication status.');
      await qc.invalidateQueries({ queryKey: ['admin'] });
      await qc.invalidateQueries({ queryKey: ['product'] });
      await qc.invalidateQueries({ queryKey: ['catalog'] });
      onSaved(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Product could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="studio-form-panel">
      <button className="studio-back" type="button" onClick={onCancel}><ArrowLeft size={16} /> All products</button>
      <form className="studio-edit-form" onSubmit={(event) => void save(event)}>
        <header className="studio-editor-heading">
          <div>
            <span className="eyebrow">RETAIL PRODUCT EDITOR</span>
            <h2>{product ? 'Edit ' + product.name : 'Create a new product'}</h2>
            <p>Product images and text can be updated without changing existing orders or stock quantities.</p>
          </div>
          {canSave && <button type="submit" className="button" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save product'}</button>}
        </header>
        <div className="studio-fields studio-fields--two">
          <label>Product name <input required maxLength={100} disabled={!canSave} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>URL slug <input required maxLength={120} pattern="[a-z0-9-]+" disabled={!canSave} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></label>
          <label>Category
            <select required disabled={!canSave} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Choose a family</option>
              {categories.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Product badge <input maxLength={30} disabled={!canSave} value={badge} onChange={(event) => setBadge(event.target.value)} /></label>
        </div>
        <label>Short tagline <input maxLength={200} disabled={!canSave} value={tagline} onChange={(event) => setTagline(event.target.value)} /></label>
        <label>Full product description <textarea rows={5} maxLength={4000} disabled={!canSave} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="studio-fields studio-fields--two">
          <label className="studio-check"><input type="checkbox" checked={active} disabled={!canSave} onChange={(event) => setActive(event.target.checked)} /> Product active</label>
          <label className="studio-check"><input type="checkbox" checked={featured} disabled={!canSave} onChange={(event) => setFeatured(event.target.checked)} /> Featured on storefront</label>
        </div>
        <div className="studio-photo-section">
          <ProductMediaGallery cover={cover} gallery={gallery} onCover={setCover} onGallery={setGallery} disabled={!canSave} />
          {canSave && <MediaUploader onUploaded={(asset, placement) => {
            if (placement === 'cover') {
              if (cover && cover !== asset.url) setGallery((prev) => [...new Set([...prev, cover])]);
              setCover(asset.url);
            } else setGallery((prev) => [...new Set([...prev, asset.url])].slice(0, 16));
          }} />}
        </div>
        <details className="studio-specs">
          <summary>Technical specifications (JSON)</summary>
          <p>Supports structured specifications. Keep existing validated values unless source information has changed.</p>
          <textarea rows={9} spellCheck={false} disabled={!canSave} value={specsText} onChange={(event) => setSpecsText(event.target.value)} />
        </details>
        {notice && <p className="studio-success" role="status"><CheckCircle size={16} /> {notice}</p>}
        {error && <p className="studio-error" role="alert">{error}</p>}
        {canSave && <button className="button" type="submit" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save product'}</button>}
      </form>
      {product && (
        <section className="studio-variants">
          <div className="studio-editor-heading">
            <div><h2>Configurations and prices</h2><p>Actual selling prices are in NPR. Inventory levels are not edited here.</p></div>
            <Link to={'/products/' + product.slug} target="_blank" rel="noopener noreferrer">View storefront product</Link>
          </div>
          {product.variants.map((variant) => (
            <details key={variant.id} className="studio-variant-details">
              <summary>{variant.sku} · {variant.storage} · {money(variant.price)}</summary>
              <VariantEditor key={variant.id} variant={variant} productId={product.id} canEdit={canEdit} onSaved={() => void qc.invalidateQueries({ queryKey: ['admin'] })} />
            </details>
          ))}
          {canCreate && (
            <details className="studio-variant-details">
              <summary><Plus size={16} /> Add a new configuration</summary>
              <VariantEditor productId={product.id} canEdit={true} onSaved={() => void qc.invalidateQueries({ queryKey: ['admin'] })} />
            </details>
          )}
          {!product.variants.length && <p className="notice">New products need at least one configuration before customers can view their product page.</p>}
        </section>
      )}
    </div>
  );
}

export default function RetailProductStudio({ user }: { user: User }) {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canEdit = user.permissions.includes('*') || user.permissions.includes('product.update');
  const canCreate = user.permissions.includes('*') || user.permissions.includes('product.create');
  const listing = useQuery({
    queryKey: ['admin', 'products', page, submitted],
    queryFn: () => api<Page>('/admin/products?page=' + page + '&q=' + encodeURIComponent(submitted)),
  });
  const detail = useQuery({
    queryKey: ['admin', 'studio', 'retail', selectedId],
    queryFn: () => api<RetailProduct>('/admin/studio/products/' + encodeURIComponent(selectedId || '')),
    enabled: Boolean(selectedId),
  });
  const editKey = detail.data?.id + ':' + detail.data?.updatedAt;

  return (
    <div className="studio-section">
      {selectedId || creating ? (
        creating ? (
          <RetailForm key="new" product={null} canEdit={canEdit} canCreate={canCreate} onSaved={(id) => { setCreating(false); setSelectedId(id); }} onCancel={() => setCreating(false)} />
        ) : detail.isLoading ? <Loading /> : detail.error || !detail.data ? <ErrorNotice error={detail.error} /> : (
          <RetailForm key={editKey} product={detail.data} canEdit={canEdit} canCreate={canCreate} onSaved={() => { void detail.refetch(); }} onCancel={() => setSelectedId(null)} />
        )
      ) : (
        <>
          <header className="studio-editor-heading">
            <div><span className="eyebrow">MERCHANT CATALOG</span><h2>Retail product studio</h2><p>Edit your actual device images, galleries, descriptions and configuration prices.</p></div>
            {canCreate && <button className="button" onClick={() => setCreating(true)}><Plus size={16} /> Create product</button>}
          </header>
          <form className="studio-search" onSubmit={(event) => { event.preventDefault(); setSubmitted(search); setPage(1); }}>
            <Search size={17} /><input value={search} placeholder="Search by product name" aria-label="Search retail products" onChange={(event) => setSearch(event.target.value)} />
            <button className="button secondary">Search</button>
          </form>
          {listing.isLoading && <Loading />}
          {listing.error && <ErrorNotice error={listing.error} />}
          <div className="studio-product-list">
            {listing.data?.rows.map((product) => (
              <button key={product.id} type="button" className="studio-product-row" onClick={() => setSelectedId(product.id)}>
                <span className="studio-row-image">{product.image.startsWith('/') && <img src={product.image} alt="" loading="lazy" />}</span>
                <span className="studio-row-info"><strong>{product.name}</strong><small>{product.category?.name} · {product.variants.length} configurations · {product.active ? 'Active' : 'Draft'}</small></span>
                <span className="studio-row-arrow">Edit ›</span>
              </button>
            ))}
          </div>
          <div className="studio-pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} · {listing.data?.total ?? 0} records</span>
            <button disabled={Boolean(!listing.data || page * listing.data.pageSize >= listing.data.total)} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
