import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Target, Package, CheckCircle, Clock, Filter, Search } from 'lucide-react';

const STAGES = [
    { name: 'New Lead', color: '#94a3b8' },
    { name: 'Follow-up', color: '#3b82f6' },
    { name: 'Quotation', color: '#8b5cf6' },
    { name: 'Order Won', color: '#10b981' },
    { name: 'Order Lost', color: '#ef4444' }
];

const SalesPipelinePage = () => {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    assigned_staff:profiles(full_name)
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStageValue = (stageName: string) => {
        return leads
            .filter(l => l.status === stageName)
            .reduce((sum, l) => sum + (Number(l.expected_value) || 0), 0);
    };

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.assigned_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    const totalValue = leads.reduce((sum, l) => sum + (Number(l.expected_value) || 0), 0);
    const wonValue = leads.filter(l => l.status === 'Order Won').reduce((sum, l) => sum + (Number(l.expected_value) || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Sales Pipeline</h1>
                    <p className="text-zinc-400">Company-wide lead progression and forecasting</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search leads or staff..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Total Pipeline</p>
                        <p className="text-2xl font-bold text-white">
                            ₹{(totalValue / 100000).toFixed(2)}L
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Total Won</p>
                        <p className="text-2xl font-bold text-white">
                            ₹{(wonValue / 100000).toFixed(2)}L
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {STAGES.map(stage => {
                    const stageLeads = filteredLeads.filter(l => l.status === stage.name);
                    const stageVal = getStageValue(stage.name);

                    return (
                        <div key={stage.name} className="flex-shrink-0 w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                    <h2 className="font-bold text-zinc-300 text-sm uppercase tracking-wider">{stage.name}</h2>
                                    <span className="bg-zinc-900 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full border border-zinc-800">
                                        {stageLeads.length}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-zinc-500">
                                    ₹{(stageVal / 1000).toFixed(0)}K
                                </span>
                            </div>

                            <div className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-900/50 p-2 min-h-[500px] flex flex-col gap-3">
                                {stageLeads.length > 0 ? (
                                    stageLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-zinc-700 hover:shadow-lg transition-all cursor-default group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                                    {lead.name}
                                                </h3>
                                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">
                                                    {lead.client_type}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-zinc-500">Assigned To</span>
                                                    <span className="text-zinc-300 font-medium">{lead.assigned_staff?.full_name || 'Unassigned'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-zinc-600">Expected Value</span>
                                                    <span className="text-sm font-bold text-white">₹{(Number(lead.expected_value) || 0).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {lead.last_visit_date && (
                                                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2">
                                                    <Clock size={10} className="text-zinc-600" />
                                                    <span className="text-[10px] text-zinc-600">
                                                        Last Visit: {new Date(lead.last_visit_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-20">
                                        <Package size={24} className="text-zinc-500" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Empty Stage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SalesPipelinePage;
