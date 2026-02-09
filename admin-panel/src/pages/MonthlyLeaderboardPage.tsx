import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Award, TrendingUp, Target, Users, Calendar, Trophy, Medal } from 'lucide-react';

const MonthlyLeaderboardPage = () => {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7) + '-01');

    useEffect(() => {
        fetchLeaderboard();
    }, [selectedMonth]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('monthly_sales_summary')
                .select(`
                    *,
                    staff:profiles(full_name)
                `)
                .eq('month', selectedMonth)
                .order('total_order_value', { ascending: false });

            if (error) throw error;
            setMetrics(data || []);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Monthly Leaderboard</h1>
                    <p className="text-zinc-400">Territory performance and top sales achievers</p>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
                    <Calendar size={18} className="text-zinc-500 ml-2" />
                    <input
                        type="month"
                        className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold uppercase cursor-pointer"
                        value={selectedMonth.slice(0, 7)}
                        onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                    />
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
                {/* 2nd Place */}
                {metrics[1] && (
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl text-center relative order-2 md:order-1 h-64 flex flex-col justify-center">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-zinc-400 rounded-2xl flex items-center justify-center border-4 border-zinc-950 shadow-xl">
                            <Medal size={24} className="text-zinc-950" />
                        </div>
                        <p className="text-xl font-bold text-white mt-4">{metrics[1]?.staff?.full_name}</p>
                        <p className="text-sm text-zinc-500 mb-4 tracking-widest uppercase font-bold">Runner Up</p>
                        <p className="text-2xl font-bold text-zinc-300">₹{(metrics[1]?.total_order_value / 1000).toFixed(0)}K</p>
                        <div className="mt-4 flex justify-center gap-4 text-xs font-bold">
                            <span className="text-blue-500 uppercase">{metrics[1]?.total_leads_tapped} Taps</span>
                            <span className="text-green-500 uppercase">{metrics[1]?.total_orders_closed} Won</span>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {metrics[0] && (
                    <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-[40px] text-center relative order-1 md:order-2 h-80 flex flex-col justify-center scale-105 shadow-2xl shadow-blue-500/5">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-500 rounded-3xl flex items-center justify-center border-4 border-zinc-950 shadow-2xl rotate-12">
                            <Trophy size={32} className="text-zinc-900" />
                        </div>
                        <p className="text-2xl font-bold text-white mt-4">{metrics[0]?.staff?.full_name}</p>
                        <p className="text-sm text-yellow-500 mb-4 tracking-widest uppercase font-bold">Monthly Champion</p>
                        <p className="text-4xl font-bold text-white">₹{(metrics[0]?.total_order_value / 100000).toFixed(2)}L</p>
                        <div className="mt-6 flex justify-center gap-6 text-sm font-bold">
                            <div className="flex flex-col items-center">
                                <span className="text-blue-400">{metrics[0]?.total_leads_tapped}</span>
                                <span className="text-[10px] text-zinc-500 uppercase">Leads</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-green-400">{metrics[0]?.total_orders_closed}</span>
                                <span className="text-[10px] text-zinc-500 uppercase">Orders</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {metrics[2] && (
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl text-center relative order-3 h-56 flex flex-col justify-center">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-700 rounded-2xl flex items-center justify-center border-4 border-zinc-950 shadow-xl">
                            <Medal size={24} className="text-zinc-950" />
                        </div>
                        <p className="text-lg font-bold text-white mt-4">{metrics[2]?.staff?.full_name}</p>
                        <p className="text-[11px] text-zinc-500 mb-3 tracking-widest uppercase font-bold">Third Place</p>
                        <p className="text-xl font-bold text-zinc-400">₹{(metrics[2]?.total_order_value / 1000).toFixed(0)}K</p>
                        <div className="mt-4 flex justify-center gap-3 text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase">{metrics[2]?.total_leads_tapped} Taps</span>
                            <span className="text-zinc-500 uppercase">{metrics[2]?.total_orders_closed} Won</span>
                        </div>
                    </div>
                )}
            </div>

            {/* List for rest of staff */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20">
                    <h2 className="text-xl font-bold text-white">Full Ranking</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/30 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Staff Member</th>
                                <th className="px-6 py-4">Total Tapped</th>
                                <th className="px-6 py-4">Orders Won</th>
                                <th className="px-6 py-4">Order Value</th>
                                <th className="px-6 py-4 text-right">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {metrics.map((staff, idx) => (
                                <tr key={staff.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-zinc-500">#{idx + 1}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-zinc-200">{staff.staff?.full_name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 font-medium">{staff.total_leads_tapped}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-zinc-300 font-medium">{staff.total_orders_closed}</span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-white">₹{staff.total_order_value.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-32 bg-zinc-800 h-1 rounded-full overflow-hidden ml-auto">
                                            <div
                                                className="bg-green-500 h-full"
                                                style={{ width: `${Math.min(100, (staff.total_order_value / (metrics[0]?.total_order_value || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {metrics.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-600">
                                        No performance records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MonthlyLeaderboardPage;
