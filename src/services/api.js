const BASE_URL = 'http://localhost:8000';

class ApiService {
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
}

export default new ApiService();
