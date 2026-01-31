import React from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton({ isAuthenticated = false, user = null, onLogin, onLogout }) {
    if (isAuthenticated && user) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.name || user.email}</span>
                </div>
                <button onClick={onLogout} className="btn-secondary flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </div>
        );
    }

    return (
        <button onClick={onLogin} className="btn-primary flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
        </button>
    );
}
