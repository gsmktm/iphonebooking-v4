import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { ErrorNotice } from '../../components/ui';
import type { Action, Row } from './resource-types';

const types = ['hero', 'text', 'faq', 'cta', 'section'] as const;
const homeSections = [
  'spotlights',
  'finder',
  'saved',
  'iphones',
  'ecosystem',
  'why',
  'trade-in',
  'repair',
  'network',
  'intelligence',
  'journey',
  'reviews',
  'news',
  'final',
];
interface Block {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  key?: string;
  enabled?: boolean;
}
interface Draft {
  title: string;
  slug: string;
  description: string;
  published: boolean;
  updatedAt?: string;
  blocks: Block[];
}
function readDraft(row: Row = {}): Draft {
  return {
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? ''),
    published: row.published === true,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
    blocks: (Array.isArray(row.blocks) ? row.blocks : []).map((block) => ({
      ...block,
      id: crypto.randomUUID(),
      href: block.href ?? '',
    })),
  };
}
export default function ContentEditor({
  action,
  onComplete,
}: {
  action: Action;
  onComplete: () => void;
}) {
  const [draft, setDraft] = useState(() => readDraft(action.initial));
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [removed, setRemoved] = useState<{ block: Block; index: number } | null>(null);
  const client = useQueryClient();
  const update = (id: string, patch: Partial<Block>) =>
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  const move = (index: number, offset: number) =>
    setDraft((d) => {
      const blocks = [...d.blocks];
      [blocks[index], blocks[index + offset]] = [blocks[index + offset], blocks[index]];
      return { ...d, blocks };
    });
  return (
    <form
      className="content-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api(action.path, {
            method: action.method,
            body: JSON.stringify({
              title: draft.title,
              description: draft.description,
              published: draft.published,
              ...(action.method === 'POST'
                ? { slug: draft.slug }
                : { expectedUpdatedAt: draft.updatedAt }),
              blocks: draft.blocks.map(({ type, title, body, href, key, enabled }) => ({
                type,
                title,
                body,
                ...(href ? { href } : {}),
                ...(type === 'section' ? { key, enabled: enabled !== false } : {}),
              })),
            }),
          });
          await Promise.all([
            client.invalidateQueries({ queryKey: ['admin', 'content'] }),
            client.invalidateQueries({ queryKey: ['content'] }),
            client.invalidateQueries({ queryKey: ['home'] }),
          ]);
          onComplete();
        } catch (cause) {
          setError(cause as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Page title
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        {action.method === 'POST' && (
          <label>
            URL slug
            <input
              required
              minLength={2}
              maxLength={120}
              pattern="[a-z0-9-]+"
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
            <small>Lowercase letters, numbers and hyphens.</small>
          </label>
        )}
        <label>
          SEO description
          <textarea
            maxLength={300}
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        {draft.slug === 'home' && (
          <p className="notice">
            The homepage uses the first hero block for its headline, introduction and primary
            destination. Add a homepage section block to customize the heading, description and
            destination, or hide a storefront section. Product, stock, review and article data come
            from the database.
          </p>
        )}
        <h3>Content blocks</h3>
        {!draft.blocks.length && <p>Add a block to start this page.</p>}
        {draft.blocks.map((block, index) => (
          <section
            className="content-block-editor"
            key={block.id}
            aria-label={`Block ${index + 1}`}
          >
            <div className="content-block-toolbar">
              <strong>Block {index + 1}</strong>
              <div>
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === 0}
                  aria-label={`Move block ${index + 1} up`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === draft.blocks.length - 1}
                  aria-label={`Move block ${index + 1} down`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove block ${index + 1}`}
                  onClick={() => {
                    setRemoved({ block, index });
                    setDraft({ ...draft, blocks: draft.blocks.filter((b) => b.id !== block.id) });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <label htmlFor={`${block.id}-type`}>Block type</label>
            <select
              id={`${block.id}-type`}
              value={block.type}
              onChange={(e) => update(block.id, { type: e.target.value })}
            >
              {!types.some((type) => type === block.type) && (
                <option value={block.type}>{block.type}</option>
              )}
              {types.map((type) => (
                <option value={type} key={type}>
                  {
                    {
                      hero: 'Hero',
                      text: 'Text',
                      faq: 'Question & answer',
                      cta: 'Call to action',
                      section: 'Homepage section',
                    }[type]
                  }
                </option>
              ))}
            </select>
            {block.type === 'section' && (
              <>
                <label>
                  Homepage section
                  <select
                    required
                    value={block.key ?? ''}
                    onChange={(e) => update(block.id, { key: e.target.value })}
                  >
                    <option value="">Choose a section</option>
                    {homeSections.map((key) => (
                      <option key={key} value={key}>
                        {key.replaceAll('-', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={block.enabled !== false}
                    onChange={(e) => update(block.id, { enabled: e.target.checked })}
                  />
                  Show this section on the homepage
                </label>
              </>
            )}
            <label>
              {block.type === 'faq' ? 'Question' : 'Heading'}
              <input
                maxLength={200}
                value={block.title}
                onChange={(e) => update(block.id, { title: e.target.value })}
              />
            </label>
            <label>
              {block.type === 'faq' ? 'Answer' : 'Body'}
              <textarea
                maxLength={5000}
                rows={4}
                value={block.body}
                onChange={(e) => update(block.id, { body: e.target.value })}
              />
            </label>
            <label>
              Link destination (optional)
              <input
                maxLength={500}
                pattern="/[^/].*|/"
                placeholder="/store"
                value={block.href}
                onChange={(e) => update(block.id, { href: e.target.value })}
              />
            </label>
          </section>
        ))}
        {removed && (
          <p role="status">
            Block removed.{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                const blocks = [...draft.blocks];
                blocks.splice(removed.index, 0, removed.block);
                setDraft({ ...draft, blocks });
                setRemoved(null);
              }}
            >
              Undo removal
            </button>
          </p>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={draft.blocks.length >= 30}
          onClick={() =>
            setDraft({
              ...draft,
              blocks: [
                ...draft.blocks,
                { id: crypto.randomUUID(), type: 'text', title: '', body: '', href: '' },
              ],
            })
          }
        >
          <Plus size={16} />
          Add block
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
          />
          Published on the website
        </label>
      </fieldset>
      {error && <ErrorNotice error={error} />}
      {error instanceof ApiError && error.code === 'CONTENT_CHANGED' && (
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const latest = await api<Row>(action.path);
              setSavedDraft(draft);
              setDraft(readDraft(latest));
              setError(null);
            } catch (cause) {
              setError(cause as Error);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load latest saved version
        </button>
      )}
      {savedDraft && (
        <p role="status">
          Saved version loaded. Your previous edits are still available.{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setDraft({ ...savedDraft, updatedAt: draft.updatedAt });
              setSavedDraft(null);
            }}
          >
            Restore my edits for review
          </button>
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? 'Saving…' : 'Save page'}
      </button>
    </form>
  );
}
