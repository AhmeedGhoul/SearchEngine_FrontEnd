import { useState, useEffect, useRef } from 'react';
import './ChannelAutocomplete.css';

const ChannelAutocomplete = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setChannels([]); setShowDropdown(false); return; }
    const timer = setTimeout(() => fetchChannels(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchChannels = async (q) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/channels/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        setShowDropdown(data.channels.length > 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
  };

  const handleSelect = (channel) => {
    onSelect(channel);
    setQuery('');
    setChannels([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setChannels([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="channel-autocomplete" ref={wrapperRef}>
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => channels.length > 0 && setShowDropdown(true)}
          placeholder="Type channel name to add..."
          className="form-control"
        />
        {loading && <span className="autocomplete-spinner">⟳</span>}
        {query && <button type="button" onClick={handleClear} className="autocomplete-clear">×</button>}
      </div>

      {showDropdown && (
        <div className="autocomplete-dropdown">
          {channels.map((c) => (
            <div key={c.id} className="autocomplete-item" onClick={() => handleSelect(c)}>
              <div className="channel-item">
                {c.thumbnail ? (
                  <img 
                    src={`http://localhost:8000${c.thumbnail}`}
                    alt={c.title} 
                    className="channel-thumbnail"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  <div className="channel-thumbnail channel-thumbnail-placeholder">
                    {c.title ? c.title[0].toUpperCase() : '?'}
                  </div>
                )}
                <div className="channel-info">
                  <div className="channel-title">{c.title}</div>
                  {c.description && <div className="channel-description">{c.description}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelAutocomplete;
