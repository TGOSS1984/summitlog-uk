import { Link, NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  TbMountain,
  TbMap2,
  TbLayoutDashboard,
  TbUser,
  TbChevronDown,
  TbMenu2,
  TbX,
  TbCompass,
  TbFlag,
  TbTrophy,
  TbBook,
  TbPhoto,
} from "react-icons/tb";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setExploreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
      <div className="container site-header__inner">

        {/* Logo */}
        <Link to="/" className="site-logo" onClick={() => setMobileOpen(false)}>
          <span className="site-logo__emblem" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" width="20" height="20">
              <polyline
                points="9,30 16,18 22,23 28,13 35,30"
                stroke="#d0aa62"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="site-logo__wordmark">
            <span className="site-logo__primary">Summit</span>
            <span className="site-logo__secondary">Log</span>
            <span className="site-logo__region">UK</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="site-nav" aria-label="Main navigation">

          {/* Explore Dropdown */}
          <div className="site-nav__dropdown" ref={dropdownRef}>
            <button
              className={`site-nav__dropdown-trigger${exploreOpen ? " active" : ""}`}
              onClick={() => setExploreOpen(!exploreOpen)}
              aria-expanded={exploreOpen}
            >
              <TbCompass size={16} strokeWidth={1.8} />
              Explore
              <TbChevronDown
                size={14}
                strokeWidth={2}
                className={`dropdown-chevron${exploreOpen ? " open" : ""}`}
              />
            </button>
            {exploreOpen && (
              <div className="site-nav__dropdown-panel" role="menu">
                <NavLink
                  to="/mountains"
                  className="dropdown-item"
                  onClick={() => setExploreOpen(false)}
                >
                  <span className="dropdown-item__icon"><TbMountain size={18} strokeWidth={1.5} /></span>
                  <span>
                    <strong>Mountains</strong>
                    <small>Browse all UK peaks</small>
                  </span>
                </NavLink>
                <NavLink
                  to="/map"
                  className="dropdown-item"
                  onClick={() => setExploreOpen(false)}
                >
                  <span className="dropdown-item__icon"><TbMap2 size={18} strokeWidth={1.5} /></span>
                  <span>
                    <strong>Map</strong>
                    <small>Interactive summit map</small>
                  </span>
                </NavLink>
                <div className="dropdown-divider" />
                <NavLink
                  to="/dashboard"
                  className="dropdown-item"
                  onClick={() => setExploreOpen(false)}
                >
                  <span className="dropdown-item__icon"><TbTrophy size={18} strokeWidth={1.5} /></span>
                  <span>
                    <strong>Collections</strong>
                    <small>Wainwrights, Munros & more</small>
                  </span>
                </NavLink>
                <NavLink
                  to="/journal"
                  className="dropdown-item"
                  onClick={() => setExploreOpen(false)}
                >
                  <span className="dropdown-item__icon"><TbBook size={18} strokeWidth={1.5} /></span>
                  <span>
                    <strong>Journal</strong>
                    <small>Your mountain diary</small>
                  </span>
                </NavLink>
                <NavLink to="/gallery" className="dropdown-item" onClick={() => setExploreOpen(false)}>
                  <span className="dropdown-item__icon"><TbPhoto size={18} strokeWidth={1.5} /></span>
                  <span>
                    <strong>Gallery</strong>
                    <small>Your summit photos</small>
                  </span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/dashboard" className="site-nav__link">
            <TbLayoutDashboard size={16} strokeWidth={1.8} />
            Dashboard
          </NavLink>

        </nav>

        {/* Right side */}
        <div className="site-header__right">
          <NavLink to="/account" className="site-header__account" aria-label="Account">
            <TbUser size={18} strokeWidth={1.8} />
            <span className="site-header__account-label">Account</span>
          </NavLink>

          <button
            className="site-header__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <TbX size={22} /> : <TbMenu2 size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-nav">
          <nav className="mobile-nav__links">
            <NavLink to="/" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbFlag size={18} strokeWidth={1.5} />
              Home
            </NavLink>
            <NavLink to="/mountains" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbMountain size={18} strokeWidth={1.5} />
              Mountains
            </NavLink>
            <NavLink to="/map" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbMap2 size={18} strokeWidth={1.5} />
              Map
            </NavLink>
            <NavLink to="/dashboard" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbLayoutDashboard size={18} strokeWidth={1.5} />
              Dashboard
            </NavLink>
            <NavLink to="/journal" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbBook size={18} strokeWidth={1.5} />
              Journal
            </NavLink>
            <NavLink to="/gallery" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbPhoto size={18} strokeWidth={1.5} />
              Gallery
            </NavLink>
            <NavLink to="/account" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
              <TbUser size={18} strokeWidth={1.5} />
              Account
            </NavLink>
            
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
