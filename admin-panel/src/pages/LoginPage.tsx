import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                        <LogIn className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-zinc-400 text-sm">Sign in to manage sales performance</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2 ml-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                                placeholder="admin@arspl.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2 ml-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-zinc-500 text-sm">
                    Apostolic Redeem Pvt. Ltd. &copy; 2026
                </p>
            </div>
        </div>
    );
}
