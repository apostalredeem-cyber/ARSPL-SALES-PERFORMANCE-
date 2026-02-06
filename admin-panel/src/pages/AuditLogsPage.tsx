import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database, ShieldAlert, Clock, User, ArrowRight } from 'lucide-react';

interface AuditLog {
    id: string;
    table_name: string;
    action: string;
    performed_by: string;
    timestamp: string;
    profiles: { full_name: string };
}

const AuditLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        const { data } = await supabase
            .from('audit_logs')
            .select(`
                *,
                profiles:performed_by(full_name)
            `)
            .order('timestamp', { ascending: false });

        if (data) setLogs(data as any);
        setLoading(false);
    }

    if (loading) return <div className="p-8 text-zinc-500">Loading audit trail...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Audit & Compliance</h2>
                <p className="text-zinc-500 mt-1">Real-time trail of lead edits, visit submissions, and deletions.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                {logs.length > 0 ? (
                    <div className="divide-y divide-zinc-800/50">
                        {logs.map((log) => (
                            <div key={log.id} className="p-6 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.action === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                                            log.action === 'UPDATE' ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-green-500/10 text-green-500'
                                        }`}>
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-zinc-200 uppercase text-xs tracking-widest">{log.table_name}</span>
                                            <span className="text-zinc-600 text-xs">•</span>
                                            <span className="text-zinc-400 font-medium">{log.action}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 font-medium">
                                            <User className="w-3 h-3" />
                                            {log.profiles?.full_name}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-zinc-300 text-sm font-semibold">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="text-zinc-600 text-[10px] font-bold uppercase mt-1">
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-20 text-center text-zinc-500">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        No compliance logs found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogsPage;
