import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Session expired or invalid, clearing local storage.');
            localStorage.clear();
            // Optional: redirect to login if not already there
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// QKD API
export const qkdAPI = {
    initiate: (numBits = 2048, eavesdropper = false, sessionName = null, engine = 'qiskit') =>
        api.post('/api/qkd/initiate', { num_bits: numBits, eavesdropper, session_name: sessionName, engine }),

    getResult: (sessionId) =>
        api.get(`/api/qkd/result/${sessionId}`),

    getVisualization: (sessionId) =>
        api.get(`/api/qkd/visualization/${sessionId}`),

    getMetrics: (sessionId) =>
        api.get(`/api/qkd/metrics/${sessionId}`),
};

// Report API
export const reportAPI = {
    submitAnonymous: (payload) =>
        api.post('/api/report/anonymous', payload),

    // Agent Portal Endpoints
    getAgentInbox: () =>
        api.get('/api/report/agent/inbox'),

    getAgentStats: () =>
        api.get('/api/report/agent/stats'),

    decryptReport: (reportId) =>
        api.post(`/api/report/agent/decrypt/${reportId}`),

    getAuditLogs: () =>
        api.get('/api/report/agent/audit'),

    deleteReport: (reportId) =>
        api.delete(`/api/report/agent/delete/${reportId}`),

    updateReportStatus: (reportId, status) =>
        api.patch(`/api/report/agent/status/${reportId}`, { status }),
};

// Chat API
export const chatAPI = {
    createSession: (userId, participantIds, sessionName = null, enableEavesdropper = false) =>
        api.post('/api/chat/session', {
            user_id: userId,
            participant_ids: participantIds,
            session_name: sessionName,
            enable_eavesdropper: enableEavesdropper,
        }),

    sendMessage: (sessionId, senderId, message) =>
        api.post('/api/chat/message', {
            session_id: sessionId,
            sender_id: senderId,
            message,
        }),

    getHistory: (sessionId, userId) =>
        api.get(`/api/chat/history/${sessionId}`, { params: { user_id: userId } }),

    getUserSessions: (userId) =>
        api.get(`/api/chat/sessions/${userId}`),

    getSessionInfo: (sessionId) =>
        api.get(`/api/chat/session/${sessionId}`),

    decryptMessage: (sessionId, userId, ciphertext, nonce, senderId) =>
        api.post(`/api/chat/decrypt/${sessionId}`, {
            user_id: userId,
            ciphertext,
            nonce,
            sender_id: senderId,
        }),

    deleteSession: (sessionId, userId) =>
        api.delete(`/api/chat/session/${sessionId}`, { params: { user_id: userId } }),

    simulateAttack: (sessionId, eavesdrop = true) =>
        api.post(`/api/chat/session/${sessionId}/attack`, null, { params: { eavesdrop } }),
};

// Attack Lab API
export const attackAPI = {
    simulateEavesdropper: (numBits = 2048, attackIntensity = 1.0) =>
        api.post('/api/attack/eavesdrop', { num_bits: numBits, attack_intensity: attackIntensity }),

    simulateTampering: (sessionId, tamperType = 'ciphertext') =>
        api.post('/api/attack/tamper', { session_id: sessionId, tamper_type: tamperType }),

    getSimulation: (simulationId) =>
        api.get(`/api/attack/simulation/${simulationId}`),

    whyECCFails: () =>
        api.get('/api/attack/educational/why-ecc-fails'),

    howBB84Protects: () =>
        api.get('/api/attack/educational/how-bb84-protects'),
};

// Auth API
export const authAPI = {
    login: (redirectUri = null) =>
        api.post('/api/auth/login', { redirect_uri: redirectUri }),

    loginWithEmail: (email, password) =>
        api.post('/api/auth/login/email', { email, password }),

    register: (name, email, password) =>
        api.post('/api/auth/register', { name, email, password }),

    agentLoginWithEmail: (email, password) =>
        api.post('/api/auth/agent/login/email', { email, password }),

    agentRegister: (name, email, password, role = "Agent") =>
        api.post('/api/auth/agent/register', { name, email, password, role }),

    callback: (code, state) =>
        api.post('/api/auth/callback', { code, state }),

    getCurrentUser: () =>
        api.get('/api/auth/me'),

    logout: () =>
        api.post('/api/auth/logout'),

    getProfile: () =>
        api.get('/api/auth/profile'),

    getAgents: () =>
        api.get('/api/auth/agents'),

    rotateKeys: () =>
        api.post('/api/auth/rotate-keys'),
};

export default api;
