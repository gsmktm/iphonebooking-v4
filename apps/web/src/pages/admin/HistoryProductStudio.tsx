import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, Plus, Save, Search } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../services/types';
import { ErrorNotice, Loading } from '../../components/ui';
import { MediaUploader } from './MediaUploader';
import { ProductMediaGallery } from './ProductMediaGallery';
import type { HistoricProduct } from './media-types';

type Page = { items: HistoricProduct[]; total: number; page: number; pageCount: number };
type Family = HistoricProduct['family'];

function ArchiveForm({
  record,
  canEdit,
  canCreate,
  onSaved,
  onCancel,
}: {
  record: HistoricProduct | null;
  canEdit: boolean;
  canCreate: boolean;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(record?.name ?? '');
  const [slug, setSlug] = useState(record?.slug ?? '');
  const [family, setFamily] = useState<Family>(record?.family ?? 'iphone');
  const [year, setYear] = useState(record?.introducedYear.toString() ?? '2007');
  const [modelNumbers, setModelNumbers] = useState(record?.modelNumbers ?? '');
  const [capacity, setCapacity] = useState(record?.capacity ?? '');
  const [chip, setChip] = useState(record?.chip ?? '');
  const [sourceUrl, setSourceUrl] = useState(record?.sourceUrl ?? 'https://support.apple.com/');
  const [referenceUrl, setReferenceUrl] = useState(record?.referenceUrl ?? '');
  const [cover, setCover] = useState(record?.imageUrl ?? '');
  const [gallery, setGallery] = useState(record?.gallery ?? []);
  const [imageSourceUrl, setImageSourceUrl] = useState(record?.imageSourceUrl ?? '');
  const [imageCredit, setImageCredit] = useState(record?.imageCredit ?? '');
  const [imageLicense, setImageLicense] = useState(record?.imageLicense ?? '');
  const [imageLicenseUrl, setImageLicenseUrl] = useState(record?.imageLicenseUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const qc = useQueryClient();
  const canSave = record ? canEdit : canCreate;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const data = {
        name: name.trim(),
        family,
        introducedYear: Number(year),
        modelNumbers: modelNumbers.trim() || null,
        capacity: capacity.trim() || null,
        chip: chip.trim() || null,
        sourceUrl: sourceUrl.trim(),
        referenceUrl: referenceUrl.trim() || null,
        imageUrl: cover || null,
        imageSourceUrl: imageSourceUrl.trim() || null,
        imageCredit: imageCredit.trim() || null,
        imageLicense: imageLicense.trim() || null,
        imageLicenseUrl: imageLicenseUrl.trim() || null,
        gallery: [...new Set(gallery.filter((item) => item !== cover))],
      };
      const result = await api<HistoricProduct>(
        record ? '/admin/studio/history/' + encodeURIComponent(record.id) : '/admin/studio/history',
        {
          method: record ? 'PATCH' : 'POST',
          body: JSON.stringify(
            record ? { ...data, expectedUpdatedAt: record.updatedAt } : { slug, ...data },
          ),
        },
      );
      setSuccess('Historical record saved with verified image provenance and an audit entry.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['studio-history'] }),
        qc.invalidateQueries({ queryKey: ['apple-history'] }),
        qc.invalidateQueries({ queryKey: ['apple-history-device'] }),
      ]);
      onSaved(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save history record.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="studio-form-panel">
      <button className="studio-back" type="button" onClick={onCancel}><ArrowLeft size={16} /> All historical models</button>
      <form className="studio-edit-form" onSubmit={(event) => void save(event)}>
        <header className="studio-editor-heading">
          <div>
            <span className="eyebrow">APPLE PRODUCT HISTORY · EDITORIAL RECORD</span>
            <h2>{record ? 'Edit ' + record.name : 'Add a historical model'}</h2>
            <p>History is separate from local shop stock and prices. Keep original Apple research sources.</p>
          </div>
          {canSave && <button className="button" type="submit" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save history'}</button>}
        </header>
        <div className="studio-fields studio-fields--two">
          <label>Device name <input value={name} required maxLength={200} disabled={!canSave} onChange={(event) => setName(event.target.value)} /></label>
          <label>Identifier (URL slug)
            <input value={slug} required disabled={Boolean(record) || !canSave} maxLength={120} pattern="[a-z0-9-]+" onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
          </label>
          <label>Apple product family
            <select value={family} disabled={!canSave} onChange={(event) => setFamily(event.target.value as Family)}>
              <option value="iphone">iPhone</option>
              <option value="mac">Mac</option>
              <option value="ipad">iPad</option>
              <option value="ipod">iPod</option>
            </select>
          </label>
          <label>Year introduced
            <input type="number" required min="1984" max="2100" value={year} disabled={!canSave} onChange={(event) => setYear(event.target.value)} />
          </label>
          <label>Model numbers / identifiers <input value={modelNumbers} disabled={!canSave} onChange={(event) => setModelNumbers(event.target.value)} /></label>
          <label>Original storage / capacities <input value={capacity} disabled={!canSave} onChange={(event) => setCapacity(event.target.value)} /></label>
          <label>Chip (where verified) <input value={chip} disabled={!canSave} onChange={(event) => setChip(event.target.value)} /></label>
          <label>Official Apple source URL
            <input type="url" required value={sourceUrl} disabled={!canSave} onChange={(event) => setSourceUrl(event.target.value)} />
          </label>
          <label>Secondary GSMArena / history URL (optional)
            <input type="url" value={referenceUrl} disabled={!canSave} onChange={(event) => setReferenceUrl(event.target.value)} />
          </label>
        </div>
        <div className="studio-photo-section">
          <ProductMediaGallery
            cover={cover}
            gallery={gallery}
            onCover={setCover}
            onGallery={setGallery}
            disabled={!canSave}
          />
          <div className="studio-photo-sources">
            <h3>Image source and reproduction rights</h3>
            <p>For Commons images enter the original file source, photographer and its license. Uploaded photos inherit their saved media-library credits.</p>
            <label>Image URL or uploaded media path
              <input value={cover} disabled={!canSave} placeholder="/api/v1/media/... or https://thumb.wikimedia.org/..." onChange={(event) => setCover(event.target.value)} />
            </label>
            <div className="studio-fields studio-fields--two">
              <label>Original image source URL <input type="url" disabled={!canSave} value={imageSourceUrl} onChange={(event) => setImageSourceUrl(event.target.value)} /></label>
              <label>Photographer / copyright holder <input disabled={!canSave} value={imageCredit} onChange={(event) => setImageCredit(event.target.value)} /></label>
              <label>License / permission <input disabled={!canSave} value={imageLicense} onChange={(event) => setImageLicense(event.target.value)} /></label>
              <label>License URL <input type="url" disabled={!canSave} value={imageLicenseUrl} onChange={(event) => setImageLicenseUrl(event.target.value)} /></label>
            </div>
          </div>
          {canSave && <MediaUploader onUploaded={(asset, placement) => {
            if (placement === 'cover') {
              if (cover && cover !== asset.url && cover.startsWith('/api/')) {
                setGallery((prev) => [...new Set([...prev, cover])]);
              }
              setCover(asset.url);
              setImageSourceUrl(asset.sourceUrl ?? '');
              setImageCredit(asset.sourceCredit);
              setImageLicense(asset.license ?? '');
              setImageLicenseUrl(asset.licenseUrl ?? '');
            } else setGallery((prev) => [...new Set([...prev, asset.url])].slice(0, 16));
          }} />}
        </div>
        {record && (
          <Link to={'/history/apple/device/' + record.slug} target="_blank" rel="noopener noreferrer" className="studio-source-link">
            <BookOpen size={15} /> View published archival record
          </Link>
        )}
        {error && <p className="studio-error" role="alert">{error}</p>}
        {success && <p className="studio-success" role="status"><CheckCircle size={16} /> {success}</p>}
        {canSave && <button type="submit" className="button" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save historical model'}</button>}
      </form>
    </div>
  );
}

export default function HistoryProductStudio({ user }: { user: User }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canEdit = user.permissions.includes('*') || user.permissions.includes('product.update');
  const canCreate = user.permissions.includes('*') || user.permissions.includes('product.create');
  const list = useQuery({
    queryKey: ['studio-history', family, page, query],
    queryFn: () => api<Page>('/admin/studio/history?' + new URLSearchParams({
      page: String(page), q: query, ...(family ? { family } : {}),
    }).toString()),
  });
  const detail = useQuery({
    queryKey: ['studio-history-device', selected],
    queryFn: () => api<HistoricProduct>('/admin/studio/history/' + encodeURIComponent(selected ?? '')),
    enabled: Boolean(selected),
  });
  return (
    <div className="studio-section">
      {creating ? (
        <ArchiveForm key="create" record={null} canEdit={canEdit} canCreate={canCreate} onSaved={(id) => { setCreating(false); setSelected(id); }} onCancel={() => setCreating(false)} />
      ) : selected ? (
        detail.isLoading ? <Loading /> : detail.error || !detail.data ? <ErrorNotice error={detail.error} /> : (
          <ArchiveForm key={detail.data.id + ':' + detail.data.updatedAt} record={detail.data} canEdit={canEdit} canCreate={canCreate} onSaved={() => void detail.refetch()} onCancel={() => setSelected(null)} />
        )
      ) : (
        <>
          <header className="studio-editor-heading">
            <div><span className="eyebrow">APPLE DEVICE HISTORY</span><h2>Historical product editor</h2><p>Edit source-backed model facts and license-attributed archival photographs.</p></div>
            {canCreate && <button className="button" onClick={() => setCreating(true)}><Plus size={16} /> Add history record</button>}
          </header>
          <form className="studio-search" onSubmit={(event) => { event.preventDefault(); setQuery(search); setPage(1); }}>
            <Search size={17} /><input value={search} aria-label="Search historical devices" placeholder="Find model / generation…" onChange={(event) => setSearch(event.target.value)} />
            <select value={family} aria-label="Product family" onChange={(event) => { setFamily(event.target.value); setPage(1); }}>
              <option value="">All families</option>
              <option value="iphone">iPhone</option>
              <option value="mac">Mac</option>
              <option value="ipad">iPad</option>
              <option value="ipod">iPod</option>
            </select>
            <button className="button secondary">Search</button>
          </form>
          {list.isLoading && <Loading />}
          {list.error && <ErrorNotice error={list.error} />}
          <div className="studio-product-list">
            {list.data?.items.map((entry) => (
              <button key={entry.id} type="button" className="studio-product-row" onClick={() => setSelected(entry.id)}>
                <span className="studio-row-image">{entry.imageUrl && <img src={entry.imageUrl} alt="" loading="lazy" />}</span>
                <span className="studio-row-info"><strong>{entry.name}</strong><small>{entry.family.toUpperCase()} · {entry.introducedYear} · {entry.imageLicense ? 'licensed photo' : 'photo pending'}</small></span>
                <span className="studio-row-arrow">Edit ›</span>
              </button>
            ))}
          </div>
          <div className="studio-pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {list.data?.pageCount ?? 1} · {list.data?.total ?? 0} historical models</span>
            <button disabled={Boolean(!list.data || page >= list.data.pageCount)} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
