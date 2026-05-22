import { Link } from "react-router-dom";
import {
  TbMountain,
  TbMap2,
  TbLayoutDashboard,
  TbUser,
  TbBrandInstagram,
  TbBrandX,
  TbBrandFacebook,
  TbBrandStrava,
} from "react-icons/tb";

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">

        <div className="site-footer__brand">
          <div className="site-footer__logo">
            <span className="site-footer__logo-icon">
              <svg viewBox="0 0 44 44" fill="none" width="16" height="16">
                <polyline
                  points="9,30 16,18 22,23 28,13 35,30"
                  stroke="#d0aa62"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="site-footer__logo-text">
              <span>Summit</span><em>Log</em>
              <small>UK</small>
            </span>
          </div>
          <p>Track Wainwrights, Munros, Corbetts and every major UK peak collection — all in one place.</p>

          <div className="site-footer__socials">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <TbBrandInstagram size={18} strokeWidth={1.8} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
              <TbBrandX size={18} strokeWidth={1.8} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <TbBrandFacebook size={18} strokeWidth={1.8} />
            </a>
            <a href="https://strava.com" target="_blank" rel="noopener noreferrer" aria-label="Strava">
              <TbBrandStrava size={18} strokeWidth={1.8} />
            </a>
          </div>
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
