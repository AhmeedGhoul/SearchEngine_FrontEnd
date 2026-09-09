import { useState, useRef, useEffect } from 'react';
import './TagInput.css';

const TagInput = ({ 
  value = '', 
  onChange, 
  name, 
  placeholder = '', 
  withSuggestions = false,
  suggestionType = 'ml'
}) => {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parsedTags = value.split(',').map(t => t.trim()).filter(Boolean);
      setTags(parsedTags);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (word) => {
    if (!word || word.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.datamuse.com/words?${suggestionType}=${encodeURIComponent(word)}&max=10`
      );
      const data = await response.json();
      setSuggestions(data.map(item => item.word));
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      onChange({ target: { name, value: newTags.join(', ') } });
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
    onChange({ target: { name, value: newTags.join(', ') } });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    if (withSuggestions && val.trim().length >= 2) {
      fetchSuggestions(val.trim());
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleInputFocus = () => {
    if (withSuggestions && inputValue.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="tag-input-container">
      {tags.length > 0 && (
        <div className="tags-list">
          {tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(index)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="form-control tag-input"
        />
        {loading && <span className="input-loader">⟳</span>}
      </div>

      {withSuggestions && showSuggestions && suggestions.length > 0 && (
        <div ref={dropdownRef} className="suggestions-dropdown">
          <div className="suggestions-header">Suggestions</div>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;