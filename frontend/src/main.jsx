import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

// Pages
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import AnonymousReport from './pages/AnonymousReport'
import AgentPortal from './pages/AgentPortal'
import AgentProfile from './pages/AgentProfile'
import { SecurityProvider } from './SecurityContext'

function App() {
    return (
        <SecurityProvider>
            <BrowserRouter
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                }}
            >
                <Routes>
                    <Route path="/" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/chat/:sessionId" element={<Chat />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/report" element={<AnonymousReport />} />
                    <Route path="/agent-portal" element={<AgentPortal />} />
                    <Route path="/agent/portal" element={<AgentPortal />} />
                    <Route path="/agent/profile" element={<AgentProfile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </SecurityProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
