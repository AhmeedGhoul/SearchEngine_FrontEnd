import { useState, useRef, useEffect } from 'react';
import ChannelAutocomplete from './ChannelAutocomplete';
import TagInput from './TagInput';
import apiService from '../services/api';
import './SearchForm.css';

const defaultForm = {
  keywords: '', phrases: '', hashtags: '', include_terms: '',
  exclude_terms: '', published_after_days: '', duration: 'any',
  order: 'date', language: '', region: '', max_results: 10,
  video_type: 'video', safe_search: 'moderate', video_definition: '',
  video_caption: '', video_license: '', event_type: '', channel_ids: [],
  video_category_id: '',
};

const STEP_LABELS = {
  download: 'Downloading video',
  audio: 'Extracting audio',
  asr: 'Transcribing speech',
  vlm: 'Analyzing visuals',
  llm: 'Generating keywords',
  done: 'Done',
  error: 'Failed',
};

const SearchForm = ({ onSearch, loading }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [smartUrl, setSmartUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractStep, setExtractStep] = useState('');
  const [extractError, setExtractError] = useState('');
  const esRef = useRef(null);

  useEffect(() => () => esRef.current?.close(), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChannelSelect = (channel) => {
    if (!selectedChannels.find(c => c.id === channel.id)) {
      setSelectedChannels(prev => [...prev, channel]);
    }
  };

  const removeChannel = (channelId) => {
    setSelectedChannels(prev => prev.filter(c => c.id !== channelId));
  };

  const handleExtract = async () => {
    const url = smartUrl.trim();
    if (!url) return;

    setExtracting(true);
    setExtractError('');
    setExtractStep('Starting...');

    let jobId;
    try {
      const res = await apiService.startKeywordAnalysis({
        videoPath: url,
        runAsr: true,
        runVlm: true,
        language: 'auto',
      });
      jobId = res.job_id;
    } catch (err) {
      setExtractError(err.message || 'Failed to start');
      setExtracting(false);
      return;
    }

    esRef.current = apiService.streamKeywordProgress(jobId, {
      onStep: (data) => {
        setExtractStep(STEP_LABELS[data.step] || data.step);
      },
      onDone: (result) => {
        const keywords = (result?.keywords || []).map(k => k.kw);
        const phrases = (result?.phrases || []);
        const hashtags = (result?.hashtags || []);
        const includeTerms = (result?.include_terms || []);
        const excludeTerms = (result?.exclude_terms || []);

        if (keywords.length > 0) {
          setFormData(prev => ({
            ...prev,
            keywords: keywords.join(', '),
            phrases: phrases.join(', '),
            hashtags: hashtags.join(', '),
            include_terms: includeTerms.join(', '),
            exclude_terms: excludeTerms.join(', '),
            order: 'relevance',
            max_results: 20,
          }));

          setTimeout(() => {
            onSearch({
              keywords,
              phrases: phrases.length ? phrases : null,
              hashtags: hashtags.length ? hashtags : null,
              include_terms: includeTerms.length ? includeTerms : null,
              exclude_terms: excludeTerms.length ? excludeTerms : null,
              published_after_days: null,
              duration: 'any', order: 'relevance',
              language: null, region: null, max_results: 20,
              video_type: 'video', safe_search: 'moderate',
              video_definition: null, video_caption: null,
              video_license: null, event_type: null,
              channel_ids: null, video_category_id: null,
            });
          }, 300);
        }
        setExtractStep('done');
        setExtracting(false);
      },
      onError: (err) => {
        setExtractError(typeof err === 'string' ? err : 'Pipeline error');
        setExtractStep('error');
        setExtracting(false);
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const split = (s) => s ? s.split(',').map(k => k.trim()).filter(Boolean) : null;

    onSearch({
      keywords: split(formData.keywords),
      phrases: split(formData.phrases),
      hashtags: split(formData.hashtags),
      include_terms: split(formData.include_terms),
      exclude_terms: split(formData.exclude_terms),
      published_after_days: formData.published_after_days ? parseInt(formData.published_after_days) : null,
      duration: formData.duration,
      order: formData.order,
      language: formData.language || null,
      region: formData.region || null,
      max_results: parseInt(formData.max_results),
      video_type: formData.video_type,
      safe_search: formData.safe_search,
      video_definition: formData.video_definition || null,
      video_caption: formData.video_caption || null,
      video_license: formData.video_license || null,
      event_type: formData.event_type || null,
      channel_ids: selectedChannels.length > 0 ? selectedChannels.map(c => c.id) : null,
      video_category_id: formData.video_category_id || null,
    });
  };

  return (
    <div className="search-form-container">
      <div className="form-section smart-section">
        <h3>Smart Search</h3>
        <p className="smart-desc">
          Paste a YouTube URL or video path.
        </p>
        <div className="smart-row">
          <input
            className="form-control smart-input"
            type="text"
            placeholder="https://youtube.com/watch?v=... or C:\path\to\video.mp4"
            value={smartUrl}
            onChange={e => setSmartUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !extracting && handleExtract()}
            disabled={extracting}
          />
          <button
            type="button"
            className="btn btn-primary smart-btn"
            onClick={handleExtract}
            disabled={extracting || !smartUrl.trim()}
          >
            {extracting ? 'Analyzing...' : 'Extract & Search'}
          </button>
        </div>

        {extracting && (
          <div className="smart-progress">
            <div className="smart-progress-bar">
              <div className="smart-progress-fill" />
            </div>
            <span className="smart-progress-label">{extractStep}</span>
          </div>
        )}

        {extractError && !extracting && (
          <div className="smart-error">{extractError}</div>
        )}

        {extractStep === 'done' && !extracting && (
          <div className="smart-done">Keywords extracted   search results updated below.</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-section">
          <h3>Basic Search</h3>
          
          <div className="form-group">
            <label>Keywords</label>
            <TagInput
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Type keywords and press comma or enter"
              withSuggestions={true}
              suggestionType="ml"
            />
          </div>

          <div className="form-group">
            <label>Exact Phrases</label>
            <TagInput
              name="phrases"
              value={formData.phrases}
              onChange={handleChange}
              placeholder="Type phrases and press comma or enter"
              withSuggestions={true}
              suggestionType="ml"
            />
          </div>

          <div className="form-group">
            <label>Hashtags</label>
            <TagInput
              name="hashtags"
              value={formData.hashtags}
              onChange={handleChange}
              placeholder="Type hashtags and press comma or enter"
              withSuggestions={true}
              suggestionType="trg"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Filters</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Must Include</label>
              <TagInput
                name="include_terms"
                value={formData.include_terms}
                onChange={handleChange}
                placeholder="Required terms"
                withSuggestions={true}
                suggestionType="trg"
              />
            </div>

            <div className="form-group">
              <label>Must Exclude</label>
              <TagInput
                name="exclude_terms"
                value={formData.exclude_terms}
                onChange={handleChange}
                placeholder="Excluded terms"
                withSuggestions={true}
                suggestionType="trg"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Published Within (Days)</label>
              <input 
                type="number" 
                name="published_after_days" 
                value={formData.published_after_days} 
                onChange={handleChange} 
                placeholder="e.g., 7, 30, 365" 
                min="1" 
                className="form-control" 
              />
            </div>

            <div className="form-group">
              <label>Duration</label>
              <select name="duration" value={formData.duration} onChange={handleChange} className="form-control">
                <option value="any">Any</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4-20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Language</label>
              <input
                type="text"
                name="language"
                value={formData.language}
                onChange={handleChange}
                placeholder="ISO code (e.g., en, es, fr)"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Region</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="Country code (e.g., US, GB, FR)"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sort By</label>
              <select name="order" value={formData.order} onChange={handleChange} className="form-control">
                <option value="date">Upload Date</option>
                <option value="relevance">Relevance</option>
                <option value="viewcount">View Count</option>
                <option value="rating">Rating</option>
                <option value="title">Title</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Results</label>
              <input 
                type="number" 
                name="max_results" 
                value={formData.max_results} 
                onChange={handleChange} 
                min="1" 
                max="200" 
                className="form-control" 
              />
            </div>
          </div>
        </div>

        <details className="form-section collapsible">
          <summary className="section-header">
            <h3>Advanced Options</h3>
          </summary>

          <div className="advanced-content">
            <div className="form-row">
              <div className="form-group">
                <label>Content Type</label>
                <select name="video_type" value={formData.video_type} onChange={handleChange} className="form-control">
                  <option value="video">Videos</option>
                  <option value="channel">Channels</option>
                  <option value="playlist">Playlists</option>
                  <option value="any">All Types</option>
                </select>
              </div>

              <div className="form-group">
                <label>Safe Search</label>
                <select name="safe_search" value={formData.safe_search} onChange={handleChange} className="form-control">
                  <option value="none">None</option>
                  <option value="moderate">Moderate</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Video Quality</label>
                <select name="video_definition" value={formData.video_definition} onChange={handleChange} className="form-control">
                  <option value="">Any</option>
                  <option value="high">HD</option>
                  <option value="standard">SD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Captions</label>
                <select name="video_caption" value={formData.video_caption} onChange={handleChange} className="form-control">
                  <option value="">Any</option>
                  <option value="closedCaption">Has Captions</option>
                  <option value="none">No Captions</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>License</label>
                <select name="video_license" value={formData.video_license} onChange={handleChange} className="form-control">
                  <option value="">Any</option>
                  <option value="creativeCommon">Creative Commons</option>
                  <option value="youtube">Standard YouTube</option>
                </select>
              </div>

              <div className="form-group">
                <label>Broadcast Type</label>
                <select name="event_type" value={formData.event_type} onChange={handleChange} className="form-control">
                  <option value="">Any</option>
                  <option value="completed">Completed</option>
                  <option value="live">Live Now</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="video_category_id" value={formData.video_category_id} onChange={handleChange} className="form-control">
                <option value="">All Categories</option>
                <option value="1">Film & Animation</option>
                <option value="2">Autos & Vehicles</option>
                <option value="10">Music</option>
                <option value="15">Pets & Animals</option>
                <option value="17">Sports</option>
                <option value="19">Travel & Events</option>
                <option value="20">Gaming</option>
                <option value="22">People & Blogs</option>
                <option value="23">Comedy</option>
                <option value="24">Entertainment</option>
                <option value="25">News & Politics</option>
                <option value="26">Howto & Style</option>
                <option value="27">Education</option>
                <option value="28">Science & Technology</option>
                <option value="29">Nonprofits & Activism</option>
              </select>
            </div>

            <div className="form-group">
              <label>Channels {selectedChannels.length > 0 && `(${selectedChannels.length})`}</label>
              <ChannelAutocomplete onSelect={handleChannelSelect} />
              {selectedChannels.length > 0 && (
                <div className="channel-tags">
                  {selectedChannels.map(channel => (
                    <span key={channel.id} className="channel-tag">
                      {channel.title}
                      <button 
                        type="button"
                        onClick={() => removeChannel(channel.id)}
                        className="tag-remove"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setFormData(defaultForm);
              setSelectedChannels([]);
            }} 
            className="btn btn-secondary" 
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;