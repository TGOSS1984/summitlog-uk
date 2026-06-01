import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TbSearch, TbMountain, TbX, TbArrowRight } from "react-icons/tb";
import { searchMountains } from "../../lib/api";

function getCollectionName(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((m) => m.collection?.name)
      .filter(Boolean)
      .join(" / ");
  }
  return mountain.collection?.name || "";
}

function SearchModal({ isOpen, onClose }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const inputRef = useRef(null);
  const listRef  = useRef(null);
  const navigate = useNavigate();

  // Reset and focus whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setLoading(false);
      // Small delay so the element is mounted before focusing
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Debounced search — fires 280ms after the user stops typing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchMountains(query);
        const list = Array.isArray(data) ? data : data.results || [];
        setResults(list.slice(0, 8));
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Keep active result scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(".search-modal__result--active");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        navigate(`/mountains/${results[activeIndex].slug}`);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, results, activeIndex, navigate, onClose]);

  function handleSelect(mountain) {
    navigate(`/mountains/${mountain.slug}`);
    onClose();
  }

  if (!isOpen) return null;

  const showResults = query.trim().length > 0;

  return (
    <div
      className="search-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search mountains"
    >
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>

        {/* Input row */}
        <div className="search-modal__input-wrap">
          <TbSearch size={18} strokeWidth={1.8} className="search-modal__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="search-modal__input"
            placeholder="Search peaks — Helvellyn, Ben Nevis, Snowdon…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              className="search-modal__clear"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <TbX size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Results */}
        {showResults && (
          <div className="search-modal__results" ref={listRef}>
            {loading && (
              <p className="search-modal__status">Searching…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="search-modal__status">
                No mountains found for <strong>"{query}"</strong>
              </p>
            )}
            {!loading && results.map((mountain, i) => {
              const collection = getCollectionName(mountain);
              return (
                <button
                  key={mountain.id}
                  className={`search-modal__result${i === activeIndex ? " search-modal__result--active" : ""}`}
                  onClick={() => handleSelect(mountain)}
                  onMouseEnter={() => setActiveIndex(i)}
                  tabIndex={-1}
                >
                  <span className="search-modal__result-icon" aria-hidden="true">
                    <TbMountain size={16} strokeWidth={1.5} />
                  </span>
                  <span className="search-modal__result-body">
                    <strong className="search-modal__result-name">{mountain.name}</strong>
                    <span className="search-modal__result-meta">
                      {mountain.height_m}m
                      {mountain.region?.name && ` · ${mountain.region.name}`}
                      {collection && ` · ${collection}`}
                    </span>
                  </span>
                  <TbArrowRight size={14} strokeWidth={2} className="search-modal__result-arrow" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {/* Footer — keyboard hints */}
        <div className="search-modal__footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
