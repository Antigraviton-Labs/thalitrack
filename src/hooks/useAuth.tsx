'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AuthUser } from '@/types';

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

interface RegisterData {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'student' | 'messOwner';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const storedToken = localStorage.getItem('thalitrack_token') || sessionStorage.getItem('thalitrack_token');
        if (!storedToken) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${storedToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser({
                    userId: data.data.user.id,
                    email: data.data.user.email,
                    name: data.data.user.name,
                    role: data.data.user.role,
                });
                setToken(storedToken);
            } else {
                localStorage.removeItem('thalitrack_token');
                sessionStorage.removeItem('thalitrack_token');
                setUser(null);
                setToken(null);
            }
        } catch {
            localStorage.removeItem('thalitrack_token');
            sessionStorage.removeItem('thalitrack_token');
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (email: string, password: string, rememberMe: boolean = false) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                if (rememberMe) {
                    localStorage.setItem('thalitrack_token', data.data.token);
                } else {
                    sessionStorage.setItem('thalitrack_token', data.data.token);
                }
                setToken(data.data.token);
                setUser({
                    userId: data.data.user.id,
                    email: data.data.user.email,
                    name: data.data.user.name,
                    role: data.data.user.role,
                });
                return { success: true };
            }

            return { success: false, error: data.error || 'Login failed' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const register = async (registerData: RegisterData) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('thalitrack_token', data.data.token);
                setToken(data.data.token);
                setUser({
                    userId: data.data.user.id,
                    email: data.data.user.email,
                    name: data.data.user.name,
                    role: data.data.user.role,
                });
                return { success: true };
            }

            return { success: false, error: data.error || 'Registration failed' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('thalitrack_token');
        sessionStorage.removeItem('thalitrack_token');
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, token, isLoading, login, register, logout, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
