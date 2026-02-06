import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

interface Expense {
    id: string;
    user_id: string;
    amount: number;
    category: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    created_at: string;
    profiles: {
        full_name: string;
    };
}

const ExpensesPage: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        setLoading(true);
        const { data } = await supabase
            .from('expenses')
            .select(`
        *,
        profiles (
          full_name
        )
      `)
            .order('created_at', { ascending: false });

        if (data) setExpenses(data as any);
        setLoading(false);
    }

    async function updateStatus(id: string, status: 'approved' | 'rejected' | 'paid') {
        const { error } = await (supabase as any)
            .from('expenses')
            .update({ status })
            .eq('id', id);

        if (!error) {
            setExpenses(expenses.map((e: Expense) => e.id === id ? { ...e, status } : e));
        }
    }

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading expenses...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Expense Claims</h2>
                    <p className="text-zinc-500 mt-1">Review and manage reimbursement requests.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                            placeholder="Search expenses..."
                            className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-600"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-950/50 border-b border-zinc-800">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Employee</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No expenses logged yet.</td>
                            </tr>
                        ) : (
                            expenses.map((exp: Expense) => (
                                <tr key={exp.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs text-zinc-400">
                                                {exp.profiles.full_name[0]}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-200">{exp.profiles.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-white">₹{exp.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{exp.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-500">{new Date(exp.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${exp.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            exp.status === 'approved' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                exp.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${exp.status === 'paid' ? 'bg-green-500' :
                                                exp.status === 'approved' ? 'bg-blue-500' :
                                                    exp.status === 'rejected' ? 'bg-red-500' : 'bg-zinc-500'
                                                }`} />
                                            {exp.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {exp.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(exp.id, 'approved')}
                                                        className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                                        title="Approve"
                                                    >
                                                        <CheckIcon />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(exp.id, 'rejected')}
                                                        className="p-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                                        title="Reject"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </>
                                            )}
                                            {exp.status === 'approved' && (
                                                <button
                                                    onClick={() => updateStatus(exp.id, 'paid')}
                                                    className="px-3 py-1.5 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Mark as Paid
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
);

const CloseIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
);

export default ExpensesPage;
