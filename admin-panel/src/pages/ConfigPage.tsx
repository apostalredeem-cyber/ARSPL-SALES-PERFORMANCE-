import React, { useState } from 'react';
import { Zap, Sliders, Save, Lock } from 'lucide-react';

const ConfigPage: React.FC = () => {
    const [config, setConfig] = useState({
        lockDuration: 6,
        dailyVisitLimit: 10,
        priorityScoring: 'Standard',
        autoPlanLogic: 'Distance Optimized'
    });

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Configuration</h2>
                <p className="text-zinc-500 mt-1">Global parameters for CRM, Locking, and Automation logic.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data Ownership */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-600/10 rounded-lg"><Lock className="w-5 h-5 text-blue-500" /></div>
                        <h3 className="text-lg font-bold text-white">Data Ownership</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Lead Lock Duration (Months)</label>
                            <input
                                type="number"
                                value={config.lockDuration}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:border-blue-600 outline-none"
                            />
                        </div>
                        <p className="text-xs text-zinc-600 italic">Leads created by staff will be exclusive to them for this duration.</p>
                    </div>
                </div>

                {/* Daily Limits */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-yellow-600/10 rounded-lg"><Zap className="w-5 h-5 text-yellow-500" /></div>
                        <h3 className="text-lg font-bold text-white">Daily Operations</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Max Visits Per Day</label>
                            <input
                                type="number"
                                value={config.dailyVisitLimit}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:border-blue-600 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* AI Logic */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 col-span-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-600/10 rounded-lg"><Sliders className="w-5 h-5 text-purple-500" /></div>
                        <h3 className="text-lg font-bold text-white">Auto-Plan Logic</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Optimization Strategy</label>
                            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none">
                                <option>Distance Optimized</option>
                                <option>Priority Focused</option>
                                <option>Balanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Lead Scoring Weights</label>
                            <div className="flex gap-4 items-center mt-2">
                                <div className="text-xs text-zinc-400">Time: 40%</div>
                                <div className="text-xs text-zinc-400">Value: 30%</div>
                                <div className="text-xs text-zinc-400">Repeat: 30%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                    <Save className="w-5 h-5" /> Save Configuration
                </button>
            </div>
        </div>
    );
};

export default ConfigPage;
