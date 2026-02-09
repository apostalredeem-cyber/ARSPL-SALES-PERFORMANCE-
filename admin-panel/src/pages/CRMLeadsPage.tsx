import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, MapPin, Search, Plus, UserCheck, Clock, Calendar, TrendingUp } from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    status: string;
    assigned_staff_id: string;
    client_type: string;
    expected_value: number;
    last_visit_date: string;
    address: string;
    profiles: { full_name: string };
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
        const { data } = await supabase
            .from('leads')
            .select(`
                *,
                profiles:assigned_staff_id (full_name)
            `)
            .order('created_at', { ascending: false });

        if (data) setLeads(data as any);
        setLoading(false);
    }

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New Lead': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
            case 'Follow-up': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Quotation': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'Order Won': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'Order Lost': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">CRM Leads</h2>
                    <p className="text-zinc-500 mt-1">Global directory of all sales prospects and active leads.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search leads..."
                            className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-600 w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/30 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Lead Details</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Assigned To</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Expected Value</th>
                                <th className="px-6 py-4">Last Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-zinc-200 block">{lead.name}</span>
                                                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight truncate max-w-[150px] block">
                                                    {lead.address || 'No Address'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">
                                            {lead.client_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-[10px] font-bold text-blue-500">
                                                {lead.profiles?.full_name?.[0] || 'U'}
                                            </div>
                                            {lead.profiles?.full_name || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(lead.status)}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                                            <TrendingUp size={14} className="text-zinc-500" />
                                            ₹{(Number(lead.expected_value) || 0).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Calendar size={14} />
                                            {lead.last_visit_date ? new Date(lead.last_visit_date).toLocaleDateString() : 'No Visits'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-600">
                                        No leads found matching your search.
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

export default CRMLeadsPage;
