import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shield, Edit2, Save, X, Search } from 'lucide-react';

interface Profile {
    id: string;
    full_name: string;
    role: 'admin' | 'employee';
    created_at: string;
}

const EmployeesPage: React.FC = () => {
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Profile>>({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (data) setEmployees(data as any);
        setLoading(false);
    }

    async function handleSave(id: string) {
        const { error } = await (supabase as any)
            .from('profiles')
            .update(editForm)
            .eq('id', id);

        if (!error) {
            setEmployees(employees.map(emp => emp.id === id ? { ...emp, ...editForm } : emp));
            setEditingId(null);
        }
    }

    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading employees...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Employee Directory</h2>
                    <p className="text-zinc-500 mt-1">Manage staff accounts, roles and permissions.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name..."
                        className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-600 w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((emp) => (
                    <div key={emp.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold text-zinc-400">
                                {emp.full_name?.[0] || 'U'}
                            </div>
                            <div className="flex gap-2">
                                {editingId === emp.id ? (
                                    <>
                                        <button onClick={() => handleSave(emp.id)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                                            <Save className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setEditingId(emp.id);
                                            setEditForm({ full_name: emp.full_name, role: emp.role });
                                        }}
                                        className="p-2 bg-zinc-800/50 text-zinc-500 rounded-lg hover:bg-zinc-800 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            {editingId === emp.id ? (
                                <div className="space-y-4">
                                    <input
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-600 outline-none"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-600 outline-none"
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'employee' })}
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-1">{emp.full_name}</h3>
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4">
                                        <Shield className={`w-3 h-3 ${emp.role === 'admin' ? 'text-blue-500' : 'text-zinc-600'}`} />
                                        {emp.role}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            <span>Joined: {new Date(emp.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                ID: {emp.id.slice(0, 8)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeesPage;
