import { Users, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

const DashboardPage: React.FC = () => {
    // const { profile } = useAuth(); // Removed unused variable

    const stats = [
        { label: 'Total Employees', value: '12', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Active Now', value: '8', icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Deviations', value: '2', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: 'Completion Rate', value: '94%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Overview</h2>
                <p className="text-zinc-500 mt-1">Monitor your field operations in real-time.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
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
                {/* Recent Activity Placeholder */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-900/50">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                    {String.fromCharCode(64 + i)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Employee {i} checked in at Client site</p>
                                    <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight">Location A • 12:{i}0 PM</p>
                                </div>
                                <div className="ml-auto px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded">LOGGED</div>
                            </div>
                        ))}
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
