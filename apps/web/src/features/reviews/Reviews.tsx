import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, BadgeCheck, MessageSquare } from 'lucide-react';
import { api, post, date } from '../../services/api';
import type { CustomerReview, User } from '../../services/types';
import { ErrorNotice, Loading } from '../../components/ui';

export function Rating({ value }: { value: number }) {
  return (
    <span className="review-rating" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={15}
          aria-hidden="true"
          fill={star <= Math.round(value) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: CustomerReview }) {
  return (
    <article className="review-card">
      <Rating value={review.rating} />
      <h3>{review.title}</h3>
      <p>{review.body}</p>
      <div className="review-author">
        <span className="review-avatar" aria-hidden="true">
          {review.author.charAt(0)}
        </span>
        <div>
          <strong>{review.author}</strong>
          <span>
            <BadgeCheck size={13} aria-hidden="true" /> Verified purchase
          </span>
        </div>
      </div>
      <div className="review-meta">
        <Link to={`/products/${review.product.slug}`}>{review.product.name}</Link>
        <time dateTime={review.createdAt}>{date(review.createdAt)}</time>
      </div>
    </article>
  );
}

interface ReviewResponse {
  rows: CustomerReview[];
  total: number;
  average: number | null;
  page: number;
  pages: number;
  canReview: boolean;
  ownReview: { id: string; status: string; title: string } | null;
}

export default function ProductReviews({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [rating, setRating] = useState(5);
  const client = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User | null>('/auth/me') });
  const result = useQuery({
    queryKey: ['reviews', slug, page, me.data?.id],
    queryFn: () =>
      api<ReviewResponse>(`/products/${encodeURIComponent(slug)}/reviews?page=${page}`),
  });
  return (
    <section className="product-reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FROM PEOPLE WHO OWN IT</span>
          <h2 id="reviews-title">Real devices. Real experiences.</h2>
        </div>
        {result.data?.average != null && (
          <div className="review-summary">
            <Rating value={result.data.average} />
            <span>
              {result.data.average.toFixed(1)} · {result.data.total} reviews
            </span>
          </div>
        )}
      </div>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          {result.data?.rows.length ? (
            <div className="review-grid">
              {result.data.rows.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="review-empty">
              <MessageSquare size={24} aria-hidden="true" />
              <div>
                <h3>Be the first to share your experience.</h3>
                <p>
                  Customers can review this device after their purchase is delivered. Every
                  published review comes from a verified order.
                </p>
              </div>
            </div>
          )}
          {result.data && result.data.pages > 1 && (
            <div className="pagination">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {result.data.pages}
              </span>
              <button
                className="button secondary"
                disabled={page >= result.data.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
          {result.data?.ownReview ? (
            <p className="notice" role="status">
              Your review “{result.data.ownReview.title}”{' '}
              {result.data.ownReview.status === 'PUBLISHED'
                ? 'is published.'
                : result.data.ownReview.status === 'PENDING'
                  ? 'is awaiting moderation.'
                  : 'was not published. Contact support if you need help.'}
            </p>
          ) : result.data?.canReview ? (
            <details className="review-compose">
              <summary>Share your experience</summary>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  const fields = new FormData(event.currentTarget);
                  setBusy(true);
                  setError(undefined);
                  try {
                    await post(`/products/${encodeURIComponent(slug)}/reviews`, {
                      rating,
                      title: fields.get('title'),
                      body: fields.get('body'),
                    });
                    await Promise.all([
                      client.invalidateQueries({ queryKey: ['reviews', slug] }),
                      client.invalidateQueries({ queryKey: ['home'] }),
                    ]);
                  } catch (cause) {
                    setError(cause);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <fieldset disabled={busy}>
                  <legend>Your verified purchase review</legend>
                  <label>
                    Rating
                    <select
                      value={rating}
                      onChange={(event) => setRating(Number(event.target.value))}
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value} {value === 1 ? 'star' : 'stars'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Review title
                    <input name="title" required minLength={3} maxLength={120} />
                  </label>
                  <label>
                    Your experience
                    <textarea name="body" required minLength={20} maxLength={2000} rows={4} />
                  </label>
                  <p className="fine-print">
                    Reviews are moderated before publication. Your first name appears publicly.
                    Leave order numbers and personal contact details out of your review.
                  </p>
                  {!!error && <ErrorNotice error={error} />}
                  <button className="button" aria-busy={busy} disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit review'}
                  </button>
                </fieldset>
              </form>
            </details>
          ) : (
            <p className="fine-print">
              {me.data ? (
                'Review eligibility is linked to delivered orders in your account.'
              ) : (
                <Link
                  className="underlined"
                  to={`/login?redirect=${encodeURIComponent(`/products/${slug}#reviews`)}`}
                >
                  Sign in to review a delivered purchase.
                </Link>
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}
