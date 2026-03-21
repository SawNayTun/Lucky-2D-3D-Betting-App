// Use the current origin if available (for web), otherwise fallback to the shared URL (for mobile apps if needed)
export const API_BASE_URL = typeof window !== 'undefined' && window.location.origin !== 'null' && !window.location.origin.includes('localhost')
  ? window.location.origin
  : 'https://ais-pre-cgyocgwk25n23pzcln6mgk-42917369617.asia-east1.run.app';
