import { Link, NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-logo">
          <span className="site-logo__mark">▲</span>
          <span>SummitLog UK</span>
        </Link>

        <nav className="site-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/mountains">Mountains</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/account">Account</NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;