import React from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Map as MapIcon,
    ClipboardList,
    FileText,
    LogOut,
    Users,
    Settings
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: MapIcon, label: 'Live Map', path: '/map' },
        { icon: ClipboardList, label: 'Work Plans', path: '/work-plans' },
        { icon: Users, label: 'Employees', path: '/employees' },
        { icon: FileText, label: 'Reports', path: '/reports' },
    ];

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <MapIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">ARSPL Tracker</span>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-blue-600/10 text-blue-500 font-medium'
                                            : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-zinc-900">
                    <div className="mb-6 px-4">
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Signed in as</p>
                        <p className="text-sm font-medium text-zinc-300 truncate">{profile?.full_name || 'Admin User'}</p>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-auto bg-zinc-950">
                <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-40">
                    <h1 className="text-lg font-semibold text-zinc-200">
                        {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-zinc-500 hover:bg-zinc-900 rounded-lg transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </header>
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
