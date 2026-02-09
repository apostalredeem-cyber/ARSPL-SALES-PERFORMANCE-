import { useEffect, useState } from 'react';
import { Users, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
    totalEmployees: number;
    activeNow: number;
    deviations: number;
    completionRate: number;
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
        completionRate: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
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

            setStats({
                totalEmployees: employeeCount || 0,
                activeNow: activeCount || 0,
                deviations: deviationCount || 0,
                completionRate
            });

            // Transform recent attendance to activity format
            if (recentAttendance) {
                const activities: RecentActivity[] = recentAttendance.map((att: any) => ({
                    id: att.id,
                    user_name: att.profiles?.full_name || 'Unknown User',
                    action: 'Checked in',
                    location: 'Field Location',
                    timestamp: new Date(att.check_in).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })
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
        { label: 'Total Employees', value: stats.totalEmployees.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Active Now', value: stats.activeNow.toString(), icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Deviations', value: stats.deviations.toString(), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
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

                {/* System Health */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-zinc-200 mb-6">Device Health</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">
                                <span>GPS Precision</span>
                                <span>98%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="w-[98%] h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">
                                <span>Battery Avg.</span>
                                <span>64%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="w-[64%] h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">
                                <span>Sync Lag</span>
                                <span>1.2s</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="w-[15%] h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
