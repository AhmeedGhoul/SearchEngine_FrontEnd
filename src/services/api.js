const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  get baseUrl() { return BASE_URL; }
  async request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, options);

    let data = null;

    try {
      data = await res.json();
    } catch {
      // Response wasn't JSON - non-JSON error responses
    }

    if (!res.ok) {
      throw new Error(
        data?.detail ||
        data?.message ||
        `Request failed (${res.status})`
      );
    }

    return data;
  }

  async searchVideos(params) {
    return this.request('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
  }

  async searchChannels(query) {
    return this.request(`/api/channels/search?q=${encodeURIComponent(query)}`);
  }

  async addToDownloadQueue(videos) {
    return this.request('/api/download/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videos }),
    });
  }

  async getQueueStatus() {
    return this.request('/api/download/queue');
  }

  async healthCheck() {
    return this.request('/health');
  }

  async generateFingerprints() {
    return this.request('/api/fingerprint/generate', { method: 'POST' });
  }

  async createFingerprintProject(name) {
    return this.request(`/api/fingerprint/project/create?name=${encodeURIComponent(name)}`, { method: 'POST' });
  }

  async listFingerprintProjects() {
    return this.request('/api/fingerprint/projects');
  }

  async populateFingerprintArchive(projectId) {
    return this.request(`/api/fingerprint/archive/populate?project_id=${projectId}`, { method: 'POST' });
  }

  async searchFingerprint(projectId, videoFilename) {
    return this.request(`/api/fingerprint/search?project_id=${projectId}&video_filename=${encodeURIComponent(videoFilename)}`, { method: 'POST' });
  }

  async getFingerprintReport(projectId, reportId) {
    return this.request(`/api/fingerprint/report/${projectId}/${reportId}`);
  }

  async listCandidateVideos() {
    return this.request('/api/fingerprint/candidates');
  }

  async fingerprintSingleVideo(filename) {
    return this.request(`/api/fingerprint/process-video?filename=${encodeURIComponent(filename)}`, { method: 'POST' });
  }

  async findSimilarVideos(filename) {
    return this.request(`/api/fingerprint/find-similar?filename=${encodeURIComponent(filename)}`);
  }

  async startKeywordAnalysis({ videoPath, runAsr = true, runVlm = true, language = 'auto' }) {
    return this.request('/api/keywords/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoPath,
        run_asr: runAsr,
        run_vlm: runVlm,
        language,
      }),
    });
  }

  async getKeywordStatus(jobId) {
    return this.request(`/api/keywords/status/${jobId}`);
  }

  async getKeywordResult(jobId) {
    return this.request(`/api/keywords/result/${jobId}`);
  }

  streamKeywordProgress(jobId, { onStep, onDone, onError } = {}) {
    const es = new EventSource(`${BASE_URL}/api/keywords/stream/${jobId}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.step === 'done') {
          onDone?.(data.result);
          es.close();
        } else if (data.step === 'error') {
          onError?.(data.error);
          es.close();
        } else {
          onStep?.(data);
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      onError?.('Connection lost');
      es.close();
    };

    return es;
  }
}

export default new ApiService();
