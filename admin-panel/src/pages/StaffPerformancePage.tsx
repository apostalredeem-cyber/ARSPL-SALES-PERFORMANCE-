import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Target, Package, CheckCircle, Users, Award, Calendar, ExternalLink } from 'lucide-react';

const StaffPerformancePage = () => {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [recentReports, setRecentReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7) + '-01');

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Monthly Summary Metrics
            const { data: summaryData, error: summaryError } = await supabase
                .from('monthly_sales_summary')
                .select(`
                    *,
                    staff:profiles(full_name)
                `)
                .eq('month', selectedMonth)
                .order('total_order_value', { ascending: false });

            if (summaryError) throw summaryError;
            setMetrics(summaryData || []);

            // 2. Fetch Recent Visit Reports for context
            const { data: reportData, error: reportError } = await supabase
                .from('visit_reports')
                .select(`
                    *,
                    meeting:work_plan_meetings(
                        lead:leads(name)
                    ),
                    staff:profiles(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (reportError) throw reportError;
            setRecentReports(reportData || []);

        } catch (err) {
            console.error('Error fetching performance data:', err);
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

    const totalOrdersMonthly = metrics.reduce((sum, m) => sum + (m.total_orders_closed || 0), 0);
    const totalValueMonthly = metrics.reduce((sum, m) => sum + (Number(m.total_order_value) || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Staff Performance</h1>
                    <p className="text-zinc-400">KPI tracking, order conversion, and territory ranking</p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <Users size={24} />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Leads Tapped</p>
                    </div>
                    <p className="text-4xl font-bold text-white">
                        {metrics.reduce((sum, m) => sum + (m.total_leads_tapped || 0), 0)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">Active outreach this month</p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                            <Target size={24} />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Orders Won</p>
                    </div>
                    <p className="text-4xl font-bold text-white">{totalOrdersMonthly}</p>
                    <p className="text-xs text-zinc-500 mt-2">Successful conversions</p>
                </div>

                <div className="bg-zinc-910/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Revenue Achieved</p>
                    </div>
                    <p className="text-4xl font-bold text-white">₹{(totalValueMonthly / 100000).toFixed(2)}L</p>
                    <p className="text-xs text-zinc-500 mt-2">Closed deal value</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking Table */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Award className="text-yellow-500" size={20} />
                            Leaderboard
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950/30 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Tapped</th>
                                    <th className="px-6 py-4">Value</th>
                                    <th className="px-6 py-4 text-right">Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {metrics.map((staff, idx) => (
                                    <tr key={staff.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-zinc-200">{staff.staff?.full_name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 font-medium">{staff.total_leads_tapped}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-white">₹{(staff.total_order_value / 1000).toFixed(0)}K</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden ml-auto">
                                                <div
                                                    className="bg-blue-600 h-full transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, (staff.total_order_value / (metrics[0]?.total_order_value || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {metrics.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                                            No summary data available for this month.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Reports Area */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="text-green-500" size={20} />
                            Recent Field Reports
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {recentReports.map((report) => (
                            <div key={report.id} className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 flex justify-between items-center group hover:border-zinc-700 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-zinc-200">{report.meeting?.lead?.name || 'Unknown Client'}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${report.outcome === 'Order Confirmed' ? 'bg-green-500/10 text-green-500' :
                                                report.outcome === 'No Interest' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {report.outcome}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                        <span className="font-medium text-zinc-400">{report.staff?.full_name}</span>
                                        <span>•</span>
                                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">₹{(Number(report.order_value) || 0).toLocaleString()}</p>
                                    <button className="text-zinc-600 group-hover:text-blue-500 transition-colors">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPerformancePage;
