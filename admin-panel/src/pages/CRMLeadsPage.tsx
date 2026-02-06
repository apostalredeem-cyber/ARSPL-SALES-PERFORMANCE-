import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Briefcase, MapPin, Search, Plus, Filter, MoreHorizontal, UserCheck, Clock } from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    status: string;
    assigned_staff_id: string;
    area_id: string;
    last_visit_date: string;
    priority_score: number;
    profiles: { full_name: string };
    areas: { name: string };
}

const CRMLeadsPage: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *,
                profiles:assigned_staff_id (full_name),
                areas:area_id (name)
            `)
            .order('created_at', { ascending: false });

        if (data) setLeads(data as any);
        setLoading(false);
    }

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'follow-up': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'conversion': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    if (loading) return <div className="p-8 text-zinc-500">Loading CRM Pipeline...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">CRM Pipeline</h2>
                    <p className="text-zinc-500 mt-1">Track leads, assignments, and conversion progress.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search leads..."
                            className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-600 w-64"
                        />
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-500 transition-colors">
                        <Plus className="w-4 h-4" /> New Lead
                    </button>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Lead Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Area</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Assigned To</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Last Visit</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Priority</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {filteredLeads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-zinc-800/20 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-colors">
                                            <Briefcase className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-zinc-200">{lead.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-zinc-600" />
                                        {lead.areas?.name || 'Unassigned'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="w-3 h-3 text-zinc-600" />
                                        {lead.profiles?.full_name || 'Not Assigned'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-500 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        {lead.last_visit_date ? new Date(lead.last_visit_date).toLocaleDateString() : 'Never'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < lead.priority_score ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CRMLeadsPage;
