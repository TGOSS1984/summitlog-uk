// Dashboard panels, extracted from DashboardPage's main JSX so they can be
// reused by the upcoming public SharedDashboardPage without duplicating
// markup. Pure presentational components — all data comes in via props.

import { Link } from "react-router-dom";
import { TbMountain, TbStar } from "react-icons/tb";
import { TIER_COLORS, TOTAL_POSSIBLE_BADGES } from "./dashboardStats";

export function AchievementPanel({ achievements, earnedBadgeCount, achievementPercent }) {
  return (
    <div className="dashboard-achievement-panel">
      <div className="dashboard-achievement-summary">
        <div>
          <p className="section-kicker">Achievements</p>
          <h2>Summit achievements</h2>
        </div>
        <div className="dashboard-achievement-score">
          <strong>{earnedBadgeCount} / {TOTAL_POSSIBLE_BADGES}</strong>
          <span>badges earned</span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${achievementPercent}%` }} />
        </div>
        <p>{TOTAL_POSSIBLE_BADGES - earnedBadgeCount} badges remaining</p>
        <div className="achievement-tier-legend">
          {["Bronze", "Silver", "Gold"].map((tier) => (
            <span key={tier} className="achievement-tier-legend__item">
              <i className="achievement-tier-dot achievement-tier-dot--earned" style={{ background: TIER_COLORS[tier] }} />
              {tier}
            </span>
          ))}
        </div>
      </div>
      <div className="dashboard-achievement-list">
        {achievements.map((ach) => {
          const AchIcon    = ach.icon || TbStar;
          const badgeColor = ach.activeTier ? TIER_COLORS[ach.activeTier.label] : "rgba(127,181,179,0.12)";
          const badgeFg    = ach.activeTier ? "#fff" : "var(--color-teal-deep)";
          return (
            <article key={ach.id} className={`dashboard-achievement-item${ach.activeTierIndex >= 0 ? " achieved" : ""}`}>
              <div>
                <div className="dashboard-achievement-item__header">
                  <h3>{ach.title}</h3>
                  <div className="achievement-tier-dots">
                    {ach.tiers.map((tier, i) => (
                      <span
                        key={tier.label}
                        className="achievement-tier-dot"
                        style={{ background: i <= ach.activeTierIndex ? TIER_COLORS[tier.label] : "rgba(4,57,59,0.1)", border: i <= ach.activeTierIndex ? "none" : "1px solid rgba(4,57,59,0.15)" }}
                        title={`${tier.label}: ${tier.target.toLocaleString()}`}
                      />
                    ))}
                  </div>
                </div>
                {ach.allComplete ? (
                  <p className="achievement-complete">All tiers complete! 🏆</p>
                ) : (
                  <>
                    <p>{ach.nextTier?.description}</p>
                    <div className="progress-track" style={{ marginTop: "0.5rem" }}>
                      <span style={{ width: `${ach.percent}%` }} />
                    </div>
                  </>
                )}
                <small>
                  {ach.current.toLocaleString()}
                  {!ach.allComplete && ` / ${ach.nextTier?.target.toLocaleString()}`}
                  {ach.activeTier && (
                    <span className={`achievement-tier-label achievement-tier-label--${ach.activeTier.label.toLowerCase()}`}>{ach.activeTier.label}</span>
                  )}
                </small>
              </div>
              <strong className="dashboard-achievement-badge" style={{ background: badgeColor, color: badgeFg }}>
                <AchIcon size={16} strokeWidth={ach.activeTierIndex >= 0 ? 2.5 : 1.5} />
              </strong>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function RegionProgressPanel({ regionStats }) {
  return (
    <div className="dashboard-region-panel">
      <div>
        <p className="section-kicker">UK progress</p>
        <h2>Region completion</h2>
        <p>See how your completed and planned summits are building across each mountain area.</p>
      </div>
      <div className="dashboard-region-grid">
        {regionStats.map((region) => (
          <Link to={`/regions/${region.name.toLowerCase().replace(/ /g, "-")}`} className="dashboard-region-card" key={region.name}>
            <div>
              <p className="section-kicker">{region.name}</p>
              <h3>{region.completed} / {region.total}</h3>
              <span>{region.planned} planned</span>
            </div>
            <strong>{region.percent}%</strong>
            <div className="progress-track"><span style={{ width: `${region.percent}%` }} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CollectionProgressPanel({ collectionStats }) {
  return (
    <div className="collection-progress-panel">
      <div>
        <p className="section-kicker">Collection progress</p>
        <h2>Progress by mountain list</h2>
      </div>
      <div className="collection-progress-list collection-progress-list--premium">
        {collectionStats.map((collection) => {
          const remaining = Math.max(collection.total - collection.completed, 0);
          return (
            <Link to={`/collections/${collection.slug}`} className="collection-progress-card collection-progress-card--premium" key={collection.id}>
              <div className="collection-progress-card__icon"><TbMountain size={20} strokeWidth={1.5} /></div>
              <div className="collection-progress-card__main">
                <p className="section-kicker">{collection.name}</p>
                <h3>{collection.completed} / {collection.total}</h3>
                <p>{remaining} remaining to complete this collection.</p>
                <div className="progress-track"><span style={{ width: `${collection.percent}%` }} /></div>
              </div>
              <strong className="collection-progress-card__percent">{collection.percent}%</strong>
            </Link>
          );
        })}
      </div>
    </div>
  );
}