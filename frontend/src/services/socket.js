// Same-network real-time: when app is at http://localhost:5173/, WS uses same backend (localhost:8000)
function getWebSocketUrl(sessionId) {
    const wsUrlEnv = import.meta.env.VITE_WS_URL;
    if (wsUrlEnv) {
        const base = wsUrlEnv.replace(/^http/, 'ws').replace(/\/?$/, '');
        return `${base}/ws/chat/${sessionId}`;
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
        const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
        const hostPort = apiUrl.replace(/^https?:\/\//, '').replace(/\/?$/, '');
        return `${protocol}//${hostPort}/ws/chat/${sessionId}`;
    }

    // Default fallback (local development)
    const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const port = 8000;
    return `${protocol}//${host}:${port}/ws/chat/${sessionId}`;
}

class SocketService {
    constructor() {
        this.socket = null;
        this.sessionId = null;
        this.callbacks = {
            message: [],
            typing: [],
            user_joined: [],
            user_left: [],
            key_rotation: [],
            attack: []
        };
    }

    connect(sessionId) {
        if (this.socket && this.sessionId === sessionId && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this.disconnect();

        this.sessionId = sessionId;
        const url = getWebSocketUrl(sessionId);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('Quantum Secure WebSocket connected:', sessionId);
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const type = data.type;
                if (this.callbacks[type]) {
                    this.callbacks[type].forEach(cb => cb(data));
                }
            } catch (err) {
                console.error('WS parse error:', err);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection terminated');
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket security error:', error);
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.sessionId = null;
        }
    }

    sendMessage(senderId, ciphertext, nonce, messageId) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('Socket not open, message queued or dropped');
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'message',
            sender_id: senderId,
            ciphertext,
            nonce,
            message_id: messageId,
            timestamp: Date.now() / 1000
        }));
    }

    sendTyping(senderId, isTyping = true) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        this.socket.send(JSON.stringify({
            type: 'typing',
            sender_id: senderId,
            is_typing: isTyping,
            timestamp: Date.now() / 1000
        }));
    }

    sendAttack(senderId, active = true, qber = 0.25) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        this.socket.send(JSON.stringify({
            type: 'attack',
            sender_id: senderId,
            active,
            qber,
            timestamp: Date.now() / 1000
        }));
    }

    // Event system
    onMessage(callback) { this.callbacks.message.push(callback); }
    onTyping(callback) { this.callbacks.typing.push(callback); }
    onUserJoined(callback) { this.callbacks.user_joined.push(callback); }
    onUserLeft(callback) { this.callbacks.user_left.push(callback); }
    onKeyRotation(callback) { this.callbacks.key_rotation.push(callback); }
    onAttack(callback) { this.callbacks.attack.push(callback); }

    // Clear callbacks for a specific type or all
    off(type) {
        if (type) this.callbacks[type] = [];
        else Object.keys(this.callbacks).forEach(k => this.callbacks[k] = []);
    }
}

export default new SocketService();
