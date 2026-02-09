import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, TrendingUp, Clock, CheckCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
    totalEmployees: number;
    activeNow: number;
    deviations: number;
    completionRate: number;
    pipelineValue: number;
    revenueWon: number;
}

interface RecentActivity {
    id: string;
    user_name: string;
    action: string;
    location: string;
    timestamp: string;
}

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalEmployees: 0,
        activeNow: 0,
        deviations: 0,
        completionRate: 0,
        pipelineValue: 0,
        revenueWon: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            // Fetch total employees
            const { count: employeeCount } = await (supabase as any)
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Fetch active attendance (checked in but not checked out)
            const { count: activeCount } = await (supabase as any)
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .is('check_out', null)
                .eq('status', 'active');

            // Fetch today's deviations
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = today.slice(0, 7) + '-01';
            const { count: deviationCount } = await (supabase as any)
                .from('deviations')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today);

            // Fetch recent attendance for activity feed
            const { data: recentAttendance } = await (supabase as any)
                .from('attendance')
                .select(`
                    id,
                    check_in,
                    profiles:user_id (full_name)
                `)
                .order('check_in', { ascending: false })
                .limit(5);

            // Calculate completion rate (work plans approved vs total)
            const { count: totalPlans } = await (supabase as any)
                .from('work_plans')
                .select('*', { count: 'exact', head: true })
                .gte('date', today);

            const { count: approvedPlans } = await (supabase as any)
                .from('work_plans')
                .select('*', { count: 'exact', head: true })
                .gte('date', today)
                .eq('status', 'approved');

            const completionRate = totalPlans && totalPlans > 0
                ? Math.round((approvedPlans || 0) / totalPlans * 100)
                : 0;

            // NEW: Fetch CRM Stats
            const { data: leadsData } = await (supabase as any)
                .from('leads')
                .select('expected_value, status');

            const pipelineValue = leadsData?.reduce((sum: number, l: any) => sum + (Number(l.expected_value) || 0), 0) || 0;
            const revenueWon = leadsData?.filter((l: any) => l.status === 'Order Won').reduce((sum: number, l: any) => sum + (Number(l.expected_value) || 0), 0) || 0;

            // NEW: Fetch Top Performers for mini-card
            const { data: performers } = await (supabase as any)
                .from('monthly_sales_summary')
                .select(`total_order_value, staff:profiles(full_name)`)
                .eq('month', currentMonth)
                .order('total_order_value', { ascending: false })
                .limit(3);

            setTopPerformers(performers || []);

            setStats({
                totalEmployees: employeeCount || 0,
                activeNow: activeCount || 0,
                deviations: deviationCount || 0,
                completionRate: 0, // Simplified or recycled
                pipelineValue,
                revenueWon
            });

            // Transform recent attendance to activity format
            if (recentAttendance) {
                const activities: RecentActivity[] = recentAttendance.map((att: any) => ({
                    id: att.id,
                    user_name: att.profiles?.full_name || 'Unknown User',
                    action: 'Started Duty',
                    location: 'Field',
                    timestamp: new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setRecentActivity(activities);
            }
        } catch (err) {
            console.error('Master Dashboard Error:', err);
        } finally {
            setLoading(false);
        }
    }

    const statCards = [
        { label: 'Active Personnel', value: stats.activeNow.toString(), icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Total Pipeline', value: `₹${(stats.pipelineValue / 100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Monthly Won', value: `₹${(stats.revenueWon / 100000).toFixed(1)}L`, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Staff Alerts', value: stats.deviations.toString(), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Overview</h2>
                <p className="text-zinc-500 mt-1">Monitor your field operations in real-time.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.label} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm hover:border-zinc-700 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                                {stat.value}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-900/50">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                        {activity.user_name[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{activity.user_name} {activity.action}</p>
                                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight">{activity.location} • {activity.timestamp}</p>
                                    </div>
                                    <div className="ml-auto px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded">LOGGED</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-zinc-500 py-8">
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Top Sales Performers
                    </h3>
                    <div className="space-y-6">
                        {topPerformers.length > 0 ? (
                            topPerformers.map((performer, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">
                                        <span>{performer.staff?.full_name}</span>
                                        <span>₹{(performer.total_order_value / 1000).toFixed(0)}K</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${idx === 0 ? 'bg-yellow-500' : 'bg-blue-500'} shadow-[0_0_8px_rgba(59,130,246,0.3)]`}
                                            style={{ width: `${Math.min(100, (performer.total_order_value / (topPerformers[0]?.total_order_value || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-zinc-600">
                                <p className="text-xs font-bold uppercase tracking-widest">No Sales Recorded</p>
                            </div>
                        )}
                        <Link to="/leaderboard" className="block text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors pt-4">
                            View Full Leaderboard →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
