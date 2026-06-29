function RowSkeleton() {
  return (
    <div className="collection-mountain-row collection-row-skeleton">
      <div className="skeleton-pill" style={{ width: 42, height: 42, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "grid", gap: 6 }}>
        <div className="skeleton-line skeleton-line--title" style={{ width: "45%" }} />
        <div className="skeleton-line skeleton-line--short" style={{ width: "25%" }} />
      </div>
      <div className="skeleton-pill" style={{ width: 80 }} />
    </div>
  );
}

export default RowSkeleton;