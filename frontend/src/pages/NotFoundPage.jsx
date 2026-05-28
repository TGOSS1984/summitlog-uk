import { Link } from "react-router-dom";
import { TbMountainOff } from "react-icons/tb";

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section className="section section-dark not-found-hero">
        <div className="container not-found-content">
          <TbMountainOff size={72} strokeWidth={0.8} className="not-found-icon" />
          <p className="section-kicker"><span className="kicker-line" />404</p>
          <h1>Summit not found</h1>
          <p>The page you're looking for doesn't exist or has moved.</p>
          <div className="not-found-actions">
            <Link to="/" className="button-primary">Back to home</Link>
            <Link to="/mountains" className="button-secondary">Browse mountains</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;
