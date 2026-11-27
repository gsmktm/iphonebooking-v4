import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Copy, ImagePlus, Save, Search } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../services/types';
import { Loading, ErrorNotice } from '../../components/ui';
import { MediaUploader } from './MediaUploader';
import type { UploadedAsset } from './media-types';

type MediaList = { items: UploadedAsset[]; total: number; page: number; pageCount: number };

function PhotoMetadataEditor({ item, onSaved }: { item: UploadedAsset; onSaved: () => void }) {
  const [sourceType, setSourceType] = useState(item.sourceType);
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl || '');
  const [sourceCredit, setSourceCredit] = useState(item.sourceCredit);
  const [license, setLicense] = useState(item.license || '');
  const [licenseUrl, setLicenseUrl] = useState(item.licenseUrl || '');
  const [altText, setAltText] = useState(item.altText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/media/' + encodeURIComponent(item.id), {
        method: 'PATCH',
        body: JSON.stringify({
          sourceType,
          sourceUrl: sourceUrl || null,
          sourceCredit,
          license: license || null,
          licenseUrl: licenseUrl || null,
          altText,
        }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save media credit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="studio-edit-form" onSubmit={(event) => void save(event)}>
      <div className="studio-asset-preview">
        <img src={item.url} alt={altText} />
      </div>
      <div className="studio-fields studio-fields--two">
        <label>
          Image rights
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as UploadedAsset['sourceType'])}
          >
            <option value="OWNED">Original owned photograph</option>
            <option value="LICENSED">Licensed third-party photograph</option>
          </select>
        </label>
        <label>
          Photographer / rights holder{' '}
          <input
            required
            value={sourceCredit}
            onChange={(event) => setSourceCredit(event.target.value)}
          />
        </label>
        <label>
          Original source link{' '}
          <input
            type="url"
            required={sourceType === 'LICENSED'}
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </label>
        <label>
          License{' '}
          <input
            value={license}
            required={sourceType === 'LICENSED'}
            onChange={(event) => setLicense(event.target.value)}
          />
        </label>
        <label>
          License URL{' '}
          <input
            type="url"
            value={licenseUrl}
            required={sourceType === 'LICENSED'}
            onChange={(event) => setLicenseUrl(event.target.value)}
          />
        </label>
        <label>
          Alt text{' '}
          <input required value={altText} onChange={(event) => setAltText(event.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        <Save size={16} /> {busy ? 'Saving…' : 'Save photo source'}
      </button>
    </form>
  );
}

export default function MediaLibraryStudio({ user }: { user: User }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UploadedAsset | null>(null);
  const [notice, setNotice] = useState('');
  const canEdit = user.permissions.includes('*') || user.permissions.includes('product.update');
  const qc = useQueryClient();
  const media = useQuery({
    queryKey: ['admin-media', page, query],
    queryFn: () =>
      api<MediaList>(
        '/admin/media?' +
          new URLSearchParams({
            page: String(page),
            q: query,
          }).toString(),
      ),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-media'] });
    setEditing(null);
  };
  return (
    <div className="studio-section">
      <header className="studio-editor-heading">
        <div>
          <span className="eyebrow">PRIVATE MEDIA STORAGE · FULL SOURCE HISTORY</span>
          <h2>Product Media Library</h2>
          <p>
            Images stored in a private bucket, with source credit and licensing metadata in the
            database.
          </p>
        </div>
      </header>
      {canEdit && (
        <MediaUploader
          onUploaded={(asset) => {
            setNotice(
              'Uploaded ' +
                asset.originalName +
                '. Copy its media path or link it in a product editor to publish.',
            );
            void refresh();
          }}
        />
      )}
      {notice && (
        <p className="studio-success" role="status">
          <CheckCircle size={16} /> {notice}
        </p>
      )}
      <form
        className="studio-search"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <Search size={17} />
        <input
          aria-label="Search images"
          placeholder="Search photo filename or photographer…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="button secondary">Search media</button>
      </form>
      {media.isLoading && <Loading />}
      {media.error && <ErrorNotice error={media.error} />}
      <div className="studio-library-grid">
        {media.data?.items.map((item) => (
          <article className="studio-library-card" key={item.id}>
            <div className="studio-library-image">
              <img src={item.url} alt={item.altText} loading="lazy" />
            </div>
            <div className="studio-library-info">
              <h3>{item.originalName}</h3>
              <small>
                {item.sourceCredit} ·{' '}
                {item.sourceType === 'OWNED' ? 'Original photo' : item.license || 'License pending'}
              </small>
              <small>
                {(item.byteSize / 1024).toFixed(0)} KB · {item.mimeType}
              </small>
              <div className="studio-media-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(item.url);
                      setNotice('Copied the media path. Paste it into a product image field.');
                    } catch {
                      setNotice('Media path: ' + item.url);
                    }
                  }}
                >
                  <Copy size={15} /> Copy path
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(editing?.id === item.id ? null : item)}
                  >
                    Edit source
                  </button>
                )}
              </div>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Original photo source
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {editing && canEdit && (
        <section className="studio-edit-source-panel">
          <div className="studio-editor-heading">
            <h3>
              <ImagePlus size={18} /> Edit metadata · {editing.originalName}
            </h3>
            <button type="button" onClick={() => setEditing(null)}>
              Close
            </button>
          </div>
          <PhotoMetadataEditor key={editing.id} item={editing} onSaved={() => void refresh()} />
        </section>
      )}
      <div className="studio-pagination">
        <button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {media.data?.pageCount ?? 1} · {media.data?.total ?? 0} image files
        </span>
        <button
          disabled={Boolean(!media.data || page >= media.data.pageCount)}
          onClick={() => setPage((v) => v + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
