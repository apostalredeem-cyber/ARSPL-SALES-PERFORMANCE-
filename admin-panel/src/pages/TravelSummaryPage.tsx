import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, TrendingUp, Calendar, User, IndianRupee } from 'lucide-react';

interface TravelSummary {
    id: string;
    staff_id: string;
    date: string;
    total_km: number;
    travel_amount: number;
    gps_log_count: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    approved_at: string | null;
    profiles: {
        full_name: string;
    };
}

const TravelSummaryPage: React.FC = () => {
    const [summaries, setSummaries] = useState<TravelSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        fetchSummaries();
    }, [filter]);

    async function fetchSummaries() {
        setLoading(true);
        let query = supabase
            .from('daily_travel_summary')
            .select(`
                *,
                profiles (
                    full_name
                )
            `)
            .order('date', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data } = await query;

        if (data) setSummaries(data as any);
        setLoading(false);
    }

    async function updateStatus(id: string, status: 'approved' | 'rejected') {
        const { error } = await (supabase as any)
            .from('daily_travel_summary')
            .update({
                status,
                approved_at: status === 'approved' ? new Date().toISOString() : null,
            })
            .eq('id', id);

        if (!error) {
            setSummaries(summaries.map(s => s.id === id ? { ...s, status } : s));
        }
    }

    const totalPending = summaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.travel_amount, 0);
    const totalApproved = summaries.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.travel_amount, 0);

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading travel summaries...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Travel Allowance Management</h2>
                <p className="text-zinc-500 mt-1">Review and approve staff travel allowances based on GPS tracking.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending Approval</span>
                    </div>
                    <div className="text-3xl font-bold text-white">₹{totalPending.toFixed(2)}</div>
                    <div className="text-sm text-zinc-500 mt-1">{summaries.filter(s => s.status === 'pending').length} entries</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Approved</span>
                    </div>
                    <div className="text-3xl font-bold text-white">₹{totalApproved.toFixed(2)}</div>
                    <div className="text-sm text-zinc-500 mt-1">{summaries.filter(s => s.status === 'approved').length} entries</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <IndianRupee className="w-5 h-5 text-purple-500" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total</span>
                    </div>
                    <div className="text-3xl font-bold text-white">₹{(totalPending + totalApproved).toFixed(2)}</div>
                    <div className="text-sm text-zinc-500 mt-1">{summaries.length} total entries</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Travel Summary Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Staff</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Distance</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">GPS Logs</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {summaries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        No travel summaries found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                summaries.map((summary) => (
                                    <tr key={summary.id} className="hover:bg-zinc-950/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-bold text-zinc-400">
                                                    {summary.profiles.full_name[0]}
                                                </div>
                                                <span className="font-semibold text-white">{summary.profiles.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <Calendar className="w-4 h-4 text-zinc-500" />
                                                {new Date(summary.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                                <span className="font-semibold text-white">{summary.total_km.toFixed(2)} km</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <IndianRupee className="w-4 h-4 text-green-500" />
                                                <span className="font-bold text-white">₹{summary.travel_amount.toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-zinc-400">{summary.gps_log_count} logs</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase border ${summary.status === 'approved'
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                        : summary.status === 'rejected'
                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                    }`}
                                            >
                                                {summary.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {summary.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => updateStatus(summary.id, 'approved')}
                                                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                                                        title="Approve"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(summary.id, 'rejected')}
                                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all"
                                                        title="Reject"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TravelSummaryPage;
