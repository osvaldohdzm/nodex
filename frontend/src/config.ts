// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.4:8000';

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    endpoints: {
      login: `${API_BASE_URL}/token`,
      graphData: `${API_BASE_URL}/graph-data/`,
      loadJson: `${API_BASE_URL}/graph/load-json`,
      deleteNode: (nodeId: string) => `${API_BASE_URL}/graph/node/${nodeId}`,
    },
  },
  // Add other configuration as needed
} as const;

export default config; 