import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Clock, Calendar } from 'lucide-react';

interface WorkPlan {
    id: string;
    user_id: string;
    date: string;
    tasks: string[];
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    profiles: {
        full_name: string;
    };
}

const WorkPlansPage: React.FC = () => {
    const [plans, setPlans] = useState<WorkPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        setLoading(true);
        const { data } = await supabase
            .from('work_plans')
            .select(`
        *,
        profiles (
          full_name
        )
      `)
            .order('submitted_at', { ascending: false });

        if (data) setPlans(data as any);
        setLoading(false);
    }

    async function updateStatus(id: string, status: 'approved' | 'rejected') {
        const { error } = await (supabase as any)
            .from('work_plans')
            .update({ status })
            .eq('id', id);

        if (!error) {
            setPlans(plans.map(p => p.id === id ? { ...p, status } : p));
        }
    }

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading work plans...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Daily Work Plans</h2>
                <p className="text-zinc-500 mt-1">Review and approve employee daily tasks.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {plans.length === 0 ? (
                    <div className="col-span-full p-12 bg-zinc-900/50 border border-zinc-900 rounded-3xl text-center text-zinc-500">
                        No work plans submitted yet.
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all overflow-hidden relative">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center font-bold text-lg text-zinc-400">
                                        {plan.profiles.full_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{plan.profiles.full_name}</h3>
                                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-1">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plan.date}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(plan.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase border ${plan.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    plan.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    }`}>
                                    {plan.status}
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2">Planned Tasks</p>
                                {plan.tasks.map((task, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-900/50 text-zinc-300 text-sm">
                                        <div className="w-5 h-5 bg-blue-500/10 flex items-center justify-center rounded text-[10px] font-bold text-blue-500">{i + 1}</div>
                                        {task}
                                    </div>
                                ))}
                            </div>

                            {plan.status === 'pending' && (
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => updateStatus(plan.id, 'approved')}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all text-sm"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => updateStatus(plan.id, 'rejected')}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-all text-sm"
                                    >
                                        <X className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WorkPlansPage;
