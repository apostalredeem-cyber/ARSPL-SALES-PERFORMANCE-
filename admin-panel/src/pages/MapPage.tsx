import React from 'react';
import { LiveMap } from '../components/LiveMap';
import { MapPin } from 'lucide-react';

const MapPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Live Fleet Tracker</h2>
                    <p className="text-zinc-500 mt-1">Real-time GPS visualization of all field staff.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-zinc-400">Region: All Regions</span>
                    </div>
                </div>
            </div>

            <LiveMap />
        </div>
    );
};

export default MapPage;
