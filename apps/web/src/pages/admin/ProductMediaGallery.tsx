import { ArrowDown, ArrowUp, Crown, Trash2 } from 'lucide-react';

export function ProductMediaGallery({
  cover,
  gallery,
  onCover,
  onGallery,
  disabled = false,
}: {
  cover: string;
  gallery: string[];
  onCover: (url: string) => void;
  onGallery: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const items = [...new Set([cover, ...gallery].filter(Boolean))];
  const reorder = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onCover(next[0]);
    onGallery(next.slice(1));
  };
  const remove = (image: string) => {
    const next = items.filter((item) => item !== image);
    onCover(next[0] ?? '');
    onGallery(next.slice(1));
  };

  return (
    <div className="studio-gallery">
      <h3>Product gallery</h3>
      <p>Choose a cover, rearrange views or remove a link. Original storage files are preserved.</p>
      {!items.length && <p className="studio-empty-media">No photos yet. Upload a real device image below.</p>}
      <div className="studio-gallery-grid">
        {items.map((url, index) => (
          <div className="studio-photo-tile" key={url}>
            <div className="studio-photo-preview">
              <img src={url} alt={'Product gallery view ' + (index + 1)} loading="lazy" />
            </div>
            <div className="studio-photo-info">
              <small>{index === 0 ? 'COVER PHOTO' : 'GALLERY ' + index}</small>
              <span title={url}>{url}</span>
            </div>
            {!disabled && (
              <div className="studio-photo-actions">
                <button type="button" aria-label={'Make photo ' + (index + 1) + ' cover'} disabled={index === 0} onClick={() => { onCover(url); onGallery(items.filter((item) => item !== url)); }}>
                  <Crown size={15} />
                </button>
                <button type="button" aria-label={'Move photo ' + (index + 1) + ' earlier'} disabled={index === 0} onClick={() => reorder(index, -1)}>
                  <ArrowUp size={15} />
                </button>
                <button type="button" aria-label={'Move photo ' + (index + 1) + ' later'} disabled={index === items.length - 1} onClick={() => reorder(index, 1)}>
                  <ArrowDown size={15} />
                </button>
                <button type="button" aria-label={'Remove photo ' + (index + 1)} onClick={() => remove(url)}>
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
