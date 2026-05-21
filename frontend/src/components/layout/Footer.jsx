import { Link } from "react-router-dom";
import { TbMountain, TbMap2, TbLayoutDashboard, TbUser, TbBrandGithub } from "react-icons/tb";

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">

        <div className="site-footer__brand">
          <div className="site-footer__logo">
            <span className="site-footer__logo-icon"><TbMountain size={18} strokeWidth={1.5} /></span>
            <span className="site-footer__logo-text">
              <span>Summit</span><em>Log</em>
              <small>UK</small>
            </span>
          </div>
          <p>Track Wainwrights, Munros, Corbetts and every major UK peak collection — all in one place.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <p className="site-footer__nav-heading">Explore</p>
          <Link to="/mountains"><TbMountain size={14} strokeWidth={1.8} /> Mountains</Link>
          <Link to="/map"><TbMap2 size={14} strokeWidth={1.8} /> Map</Link>
          <Link to="/dashboard"><TbLayoutDashboard size={14} strokeWidth={1.8} /> Dashboard</Link>
          <Link to="/account"><TbUser size={14} strokeWidth={1.8} /> Account</Link>
        </nav>

        <div className="site-footer__bottom-row">
          <p>© {year} SummitLog UK. Built for hillwalkers.</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
