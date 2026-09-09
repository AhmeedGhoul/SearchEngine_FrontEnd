import { useState, useRef, useEffect } from 'react';
import apiService from '../services/api';
import './KeywordExtractor.css';

const CATEGORY_LABELS = {
  topic:  { label: 'Topic',  color: 'cat-topic'  },
  entity: { label: 'Entity', color: 'cat-entity' },
  action: { label: 'Action', color: 'cat-action' },
  style:  { label: 'Style',  color: 'cat-style'  },
};

const STEP_ICONS = {
  download: '⬇️',
  audio:    '🎵',
  asr:      '🎤',
  vlm:      '🖼️',
  compress: '🗜️',
  llm:      '🧠',
  done:     '✅',
  error:    '❌',
};

const STEP_LABELS = {
  download: 'Downloading video',
  audio:    'Audio extraction',
  asr:      'Speech recognition',
  vlm:      'Visual analysis',
  compress: 'Evidence compression',
  llm:      'Keyword generation',
  done:     'Complete',
  error:    'Failed',
};

export default function KeywordExtractor() {
  const [videoPath, setVideoPath]     = useState('');
  const [runAsr, setRunAsr]           = useState(true);
  const [runVlm, setRunVlm]           = useState(true);
  const [language, setLanguage]       = useState('auto');

  const [status, setStatus]           = useState('idle');
  const [steps, setSteps]             = useState([]);
  const [currentStep, setCurrentStep] = useState('');
  const [keywords, setKeywords]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [copied, setCopied]           = useState(false);
  const [filterCat, setFilterCat]     = useState('all');

  const esRef      = useRef(null);
  const logEndRef  = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  useEffect(() => () => esRef.current?.close(), []);

  const reset = () => {
    esRef.current?.close();
    esRef.current = null;
    setStatus('idle');
    setSteps([]);
    setCurrentStep('');
    setKeywords([]);
    setStats(null);
    setErrorMsg('');
    setCopied(false);
    setFilterCat('all');
  };

  const handleAnalyze = async () => {
    const path = videoPath.trim();
    if (!path) return;

    reset();
    setStatus('running');
    setSteps([{ step: 'start', message: `Starting analysis for: ${path}` }]);

    let jobId;
    try {
      const res = await apiService.startKeywordAnalysis({
        videoPath: path,
        runAsr,
        runVlm,
        language,
      });
      jobId = res.job_id;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to start analysis');
      return;
    }

    esRef.current = apiService.streamKeywordProgress(jobId, {
      onStep: (data) => {
        setCurrentStep(data.step);
        setSteps(prev => [...prev, data]);
      },
      onDone: (result) => {
        setKeywords(result?.keywords || []);
        setStats({
          wordCount:    result?.asr_word_count    ?? 0,
          vlmBatches:   result?.vlm_batch_count   ?? 0,
          durationSecs: result?.duration_seconds  ?? 0,
        });
        setStatus('done');
        setCurrentStep('done');
        setSteps(prev => [...prev, { step: 'done', message: `Generated ${result?.keywords?.length ?? 0} keywords` }]);
      },
      onError: (err) => {
        setStatus('error');
        setErrorMsg(typeof err === 'string' ? err : 'Pipeline error');
        setCurrentStep('error');
        setSteps(prev => [...prev, { step: 'error', message: typeof err === 'string' ? err : 'Pipeline error' }]);
      },
    });
  };

  const handleCopy = () => {
    const filtered = filterCat === 'all'
      ? keywords
      : keywords.filter(k => k.category === filterCat);
    const text = filtered.map(k => k.kw).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredKeywords = filterCat === 'all'
    ? keywords
    : keywords.filter(k => k.category === filterCat);

  const categoryCounts = keywords.reduce((acc, k) => {
    acc[k.category] = (acc[k.category] || 0) + 1;
    return acc;
  }, {});

  const formatDuration = (secs) => {
    if (!secs) return ' ';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="kw-container">

      <div className="kw-panel kw-input-panel">
        <h2 className="kw-panel-title">Video Analysis</h2>
        <p className="kw-panel-desc">
          Paste a YouTube URL to download and analyze, or a local filename from the candidates folder.
        </p>

        <div className="kw-path-row">
          <label className="kw-label">YouTube URL or full video path</label>
          <div className="kw-path-input-wrap">
            <textarea
              className="kw-path-input kw-path-textarea"
              rows={2}
              placeholder="https://youtube.com/watch?v=... or /path/to/video.mp4"
              value={videoPath}
              onChange={e => setVideoPath(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && status !== 'running') {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
              disabled={status === 'running'}
            />
          </div>
        </div>

        <div className="kw-options-row">
          <div className="kw-toggles">
            <label className={`kw-toggle ${runAsr ? 'on' : ''}`}>
              <input type="checkbox" checked={runAsr} onChange={e => setRunAsr(e.target.checked)} disabled={status === 'running'} />
              ASR
            </label>
            <label className={`kw-toggle ${runVlm ? 'on' : ''}`}>
              <input type="checkbox" checked={runVlm} onChange={e => setRunVlm(e.target.checked)} disabled={status === 'running'} />
              VLM
            </label>
          </div>

          <div className="kw-lang-wrap">
            <label className="kw-label">Language</label>
            <select
              className="kw-lang-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              disabled={status === 'running'}
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="ar">Arabic</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>

        <div className="kw-action-row">
          {status === 'running' ? (
            <button className="kw-btn kw-btn-stop" onClick={reset}>
              Stop
            </button>
          ) : (
            <button
              className="kw-btn kw-btn-primary"
              onClick={handleAnalyze}
              disabled={!videoPath.trim()}
            >
              Extract Keywords
            </button>
          )}
          {(status === 'done' || status === 'error') && (
            <button className="kw-btn kw-btn-ghost" onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

      {status !== 'idle' && (
        <div className="kw-panel kw-progress-panel">
          <h3 className="kw-panel-title">
            Pipeline Progress
            {status === 'running' && <span className="kw-spinner" />}
          </h3>
          <div className="kw-log">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`kw-log-entry ${s.step === 'error' ? 'kw-log-error' : s.step === 'done' ? 'kw-log-done' : 'kw-log-step'}`}
              >
                <span className="kw-log-icon">
                  {STEP_ICONS[s.step] || '⚙️'}
                </span>
                <span className="kw-log-label">
                  {STEP_LABELS[s.step] || s.step}
                </span>
                <span className="kw-log-msg">{s.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {status === 'error' && errorMsg && (
            <div className="kw-error-box">{errorMsg}</div>
          )}
        </div>
      )}

      {status === 'done' && stats && (
        <div className="kw-panel kw-stats-panel">
          <div className="kw-stat">
            <span className="kw-stat-val">{formatDuration(stats.durationSecs)}</span>
            <span className="kw-stat-label">Video duration</span>
          </div>
          <div className="kw-stat">
            <span className="kw-stat-val">{stats.wordCount}</span>
            <span className="kw-stat-label">Words spoken</span>
          </div>
          <div className="kw-stat">
            <span className="kw-stat-val">{stats.vlmBatches}</span>
            <span className="kw-stat-label">VLM batches</span>
          </div>
          <div className="kw-stat kw-stat-highlight">
            <span className="kw-stat-val">{keywords.length}</span>
            <span className="kw-stat-label">Keywords found</span>
          </div>
        </div>
      )}

      {status === 'done' && keywords.length > 0 && (
        <div className="kw-panel kw-results-panel">
          <div className="kw-results-header">
            <h3 className="kw-panel-title">Keywords</h3>
            <div className="kw-filter-tabs">
              <button
                className={`kw-filter-tab ${filterCat === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCat('all')}
              >
                All ({keywords.length})
              </button>
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <button
                  key={cat}
                  className={`kw-filter-tab ${filterCat === cat ? 'active' : ''} ${CATEGORY_LABELS[cat]?.color || ''}`}
                  onClick={() => setFilterCat(cat)}
                >
                  {CATEGORY_LABELS[cat]?.label || cat} ({count})
                </button>
              ))}
            </div>
            <button className="kw-btn kw-btn-copy" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>

          <div className="kw-chips">
            {filteredKeywords.map((k, i) => (
              <span
                key={i}
                className={`kw-chip ${CATEGORY_LABELS[k.category]?.color || 'cat-topic'}`}
                onClick={() => {
                  navigator.clipboard.writeText(k.kw);
                }}
                title={`Category: ${k.category}   click to copy`}
              >
                {k.kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && keywords.length === 0 && (
        <div className="empty-state">
          <h3>No keywords generated</h3>
          <p>The pipeline ran but the LLM returned no results. Check that Ollama is running with qwen3:14b available.</p>
        </div>
      )}
    </div>
  );
}