import { useState, type FormEvent } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { MAX_UPLOAD_SIZE, type UploadedAsset } from './media-types';

export function MediaUploader({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (asset: UploadedAsset, placement: 'cover' | 'gallery') => void;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<'cover' | 'gallery'>('cover');
  const [sourceType, setSourceType] = useState<'OWNED' | 'LICENSED'>('OWNED');
  const [sourceUrl, setSourceUrl] = useState('');
  const [credit, setCredit] = useState('');
  const [license, setLicense] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || busy || disabled) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG and WebP photographs are supported.');
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE || file.size === 0) {
      setError('Select a photograph smaller than 6 MB.');
      return;
    }
    if (sourceType === 'LICENSED' && (!sourceUrl || !credit || !license || !licenseUrl)) {
      setError('Licensed images need a source link, author credit, license and license link.');
      return;
    }
    setBusy(true);
    try {
      const metadata: Record<string, string> = {
        'Content-Type': file.type,
        'X-Requested-With': 'iPhoneBooking',
        'X-Image-Name': encodeURIComponent(file.name),
        'X-Image-Source-Type': sourceType,
        'X-Image-Source-URL': encodeURIComponent(sourceUrl.trim()),
        'X-Image-Credit': encodeURIComponent(credit.trim()),
        'X-Image-License': encodeURIComponent(license.trim()),
        'X-Image-License-URL': encodeURIComponent(licenseUrl.trim()),
        'X-Image-Alt': encodeURIComponent(altText.trim()),
      };
      const response = await fetch('/api/v1/admin/media/uploads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: metadata,
        body: file,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message || 'Upload failed. Please try again.');
      }
      onUploaded(body as UploadedAsset, placement);
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="studio-uploader" onSubmit={(event) => void upload(event)}>
      <div className="studio-upload-title">
        <ImagePlus size={19} />
        <div>
          <strong>Upload a real device photograph</strong>
          <p>JPEG, PNG or WebP · 6 MB maximum · stored privately with full source metadata</p>
        </div>
      </div>
      <label>
        Choose image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            setAltText(next?.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ') ?? '');
          }}
        />
      </label>
      {file && (
        <small>
          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </small>
      )}
      <div className="studio-fields studio-fields--two">
        <label>
          Place after upload
          <select
            value={placement}
            onChange={(event) => setPlacement(event.target.value as 'cover' | 'gallery')}
          >
            <option value="cover">Main cover image</option>
            <option value="gallery">Add to gallery</option>
          </select>
        </label>
        <label>
          Image rights
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as 'OWNED' | 'LICENSED')}
          >
            <option value="OWNED">Our own photograph / permission to publish</option>
            <option value="LICENSED">Licensed third-party photograph</option>
          </select>
        </label>
      </div>
      <label>
        Photographer or source credit
        <input
          required
          value={credit}
          maxLength={200}
          placeholder="Photographer or rights holder"
          onChange={(event) => setCredit(event.target.value)}
        />
      </label>
      <label>
        Image source URL {sourceType === 'OWNED' ? '(optional)' : '(required)'}
        <input
          type="url"
          value={sourceUrl}
          placeholder="https://..."
          required={sourceType === 'LICENSED'}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
      </label>
      {sourceType === 'LICENSED' && (
        <div className="studio-fields studio-fields--two">
          <label>
            License name
            <input
              required
              maxLength={120}
              value={license}
              placeholder="CC BY 4.0"
              onChange={(event) => setLicense(event.target.value)}
            />
          </label>
          <label>
            License URL
            <input
              required
              type="url"
              value={licenseUrl}
              placeholder="https://creativecommons.org/..."
              onChange={(event) => setLicenseUrl(event.target.value)}
            />
          </label>
        </div>
      )}
      <label>
        Accessible image description (alt text)
        <input
          required
          maxLength={250}
          value={altText}
          placeholder="Original product, front and back"
          onChange={(event) => setAltText(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={!file || busy || disabled}>
        <UploadCloud size={16} /> {busy ? 'Uploading securely…' : 'Upload image'}
      </button>
      <small>
        Uploading does not publish a photo. Save the product or history record to link it.
      </small>
    </form>
  );
}
