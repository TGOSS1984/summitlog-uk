// Recent activity + photos panel, extracted from DashboardPage. Manages its
// own "show more" toggle internally so it's a complete, drop-in unit for
// both the authenticated dashboard and the public SharedDashboardPage.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TbRoute } from "react-icons/tb";
import { formatDate } from "./dashboardStats";

const MAX_VISIBLE = 5;

export function RecentActivityAndPhotos({ recentLogs, recentRoutes, photoLogs, noPhotosMessage }) {
  const [showAllLogs, setShowAllLogs] = useState(false);

  const activityFeed = useMemo(() => {
    const logEntries   = (recentLogs   || []).map((l) => ({ type: "log",   date: l.completed_date || l.updated_at, data: l }));
    const routeEntries = (recentRoutes || []).map((r) => ({ type: "route", date: r.completed_date,                data: r }));
    const all = [...logEntries, ...routeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    return showAllLogs ? all : all.slice(0, MAX_VISIBLE);
  }, [recentLogs, recentRoutes, showAllLogs]);

  const totalActivityCount = (recentLogs?.length || 0) + (recentRoutes?.length || 0);

  return (
    <div className="dashboard-story-grid">
      <article className="dashboard-story-card">
        <p className="section-kicker">Recent activity</p>
        <h3>Latest mountain logs</h3>
        <div className="dashboard-timeline">
          {activityFeed.length === 0 && <p>No recent activity yet.</p>}
          {activityFeed.map((item) => {
            if (item.type === "route") {
              const route = item.data;
              return (
                <Link to="/journal" className="dashboard-timeline-item dashboard-timeline-item--route" key={`route-${route.id}`}>
                  <span className="dashboard-timeline-route-icon"><TbRoute size={11} strokeWidth={2.5} /></span>
                  <div>
                    <strong>{route.name}</strong>
                    <small>Route · {route.mountains_count} summits · {formatDate(route.completed_date)}</small>
                  </div>
                </Link>
              );
            }
            const log = item.data;
            return (
              <Link to={log.mountain_detail?.slug ? `/mountains/${log.mountain_detail.slug}` : "#"} className="dashboard-timeline-item" key={log.id}>
                <span>{log.status === "completed" ? "✓" : "○"}</span>
                <div>
                  <strong>
                    {log.mountain_detail?.name}
                    {log.route_name && <span className="dashboard-timeline-route-badge">{log.route_name}</span>}
                  </strong>
                  <small>{log.status} / {formatDate(log.completed_date)}</small>
                </div>
              </Link>
            );
          })}
          {totalActivityCount > MAX_VISIBLE && (
            <button className="dashboard-show-more" onClick={() => setShowAllLogs(!showAllLogs)}>
              {showAllLogs ? "Show less" : `Show ${totalActivityCount - MAX_VISIBLE} more`}
            </button>
          )}
        </div>
      </article>
      <article className="dashboard-story-card">
        <p className="section-kicker">Summit memories</p>
        <h3>Recent photos</h3>
        <div className="dashboard-photo-strip">
          {photoLogs.length === 0 && <p>{noPhotosMessage}</p>}
          {photoLogs.map((log) => (
            <Link to={`/mountains/${log.mountain_detail?.slug}`} key={log.id}>
              <img src={log.uploaded_image} alt={log.mountain_detail?.name} />
            </Link>
          ))}
        </div>
      </article>
    </div>
  );
}