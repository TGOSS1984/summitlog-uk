import { Link } from "react-router-dom";
import { TbRepeat } from "react-icons/tb";
import { getMountainLogStatus, getStatusLabel } from "./mountainProgress";

// Shared mountain-list row: height badge on the left (the look from the
// regions page — kept consistent everywhere rather than collections using
// a different rank-circle layout), name + a contextual subtitle, a repeat
// count badge if summited more than once, and a status pill on the right.
// Used by CollectionDetailPage, RegionDetailPage, and the Total mountains
// page, each just supplying a different `getSubtitle` for what belongs
// under the mountain's name.
function MountainProgressRow({ mountain, logs, completionCountById, getSubtitle, rank }) {
  const mountainStatus  = getMountainLogStatus(mountain, logs);
  const completionCount = completionCountById[mountain.id] || 0;
  const subtitle        = getSubtitle ? getSubtitle(mountain) : null;
  const hasRank          = Boolean(rank);

  return (
    <Link
      to={`/mountains/${mountain.slug}`}
      className={`collection-mountain-row collection-mountain-row--${mountainStatus}`}
    >
      <span className="region-height-badge">
        {mountain.height_m}
        <small>m</small>
      </span>
      <div className="region-mountain-info">
        <strong>
          {mountain.name}
          {hasRank && (
            <span
              title={`#${rank} in the current filtered/sorted list`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 22, height: 20, padding: "0 6px", borderRadius: 999,
                background: "rgba(208,170,98,0.15)", color: "var(--color-accent)",
                fontSize: "0.65rem", fontWeight: 700, marginLeft: 8, verticalAlign: "middle",
              }}
            >
              #{rank}
            </span>
          )}
        </strong>
        {subtitle && <small className="region-mountain-collection">{subtitle}</small>}
      </div>
      {completionCount > 0 && (
        <span
          className="collection-completion-count"
          title={`Summited ${completionCount} ${completionCount === 1 ? "time" : "times"}`}
        >
          <TbRepeat size={11} strokeWidth={2} />
          ×{completionCount}
        </span>
      )}
      <em className={`collection-status collection-status--${mountainStatus}`}>
        {getStatusLabel(mountainStatus)}
      </em>
    </Link>
  );
}

export default MountainProgressRow;