import { ArrowLink, ButtonLink } from '../../components/ui';
import { t } from '../../app/i18n';
import './home-hero.css';

export default function HomeHero({
  title,
  body,
  href,
}: {
  title?: string;
  body?: string;
  href?: string;
}) {
  return (
    <section className="campaign-hero" aria-labelledby="campaign-title">
      <div className="container campaign-inner">
        <div className="campaign-copy">
          <span className="eyebrow">
            <span className="red-dot" />
            {t('brandLine')}
          </span>
          <h1 id="campaign-title">{title ?? t('heroTitle')}</h1>
          <p>{body ?? t('heroText')}</p>
          <div className="campaign-actions">
            <ButtonLink to={href ?? '/store'}>{t('heroCta')}</ButtonLink>
            <ArrowLink to="/compare">{t('heroCompare')}</ArrowLink>
          </div>
          <span className="campaign-signoff">{t('heroSignoff')}</span>
        </div>
      </div>
      <img
        src="/images/himalayan-banner.png"
        className="campaign-art"
        alt={t('heroImageAlt')}
        fetchPriority="high"
        decoding="async"
        width={1916}
        height={821}
      />
    </section>
  );
}
