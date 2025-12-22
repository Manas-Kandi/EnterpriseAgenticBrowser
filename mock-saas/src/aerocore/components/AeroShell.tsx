import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, Users, Box, Radio, LayoutDashboard, Settings, FileBarChart, Globe } from 'lucide-react';

// Inline utility if needed
const classNames = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

const apps = [
  { name: 'Admin', path: '/aerocore/admin', icon: Settings },
  { name: 'Dispatch', path: '/aerocore/dispatch', icon: Radio },
  { name: 'Fleet', path: '/aerocore/fleet', icon: LayoutDashboard },
  { name: 'Security', path: '/aerocore/security', icon: Shield },
  { name: 'HR', path: '/aerocore/hr', icon: Users },
  { name: 'Logistics', path: '/aerocore/cargo', icon: Box },
  { name: 'Portal', path: '/aerocore/portal', icon: Globe },
  { name: 'DataLake', path: '/aerocore/data', icon: FileBarChart },
];

export function AeroShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex" data-aerocore-shell>
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col" data-aerocore-sidebar>
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-lg tracking-wide uppercase text-sky-400">AeroCore</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">Apps</div>
            {apps.map(app => {
                const isActive = location.pathname.startsWith(app.path);
                return (
                    <Link
                        key={app.name}
                        to={app.path}
                        data-testid={`aero-nav-${app.name.toLowerCase()}`}
                        className={classNames(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive 
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                    >
                        <app.icon size={18} />
                        {app.name}
                    </Link>
                )
            })}
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">U</div>
                <div className="text-sm">
                    <div className="text-slate-200">Admin User</div>
                    <div className="text-xs text-slate-500">System Admin</div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
         <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
            <h1 className="text-sm font-medium text-slate-400">
                AeroCore Systems <span className="mx-2">/</span> <span className="text-slate-100">{apps.find(a => location.pathname.startsWith(a.path))?.name || 'Home'}</span>
            </h1>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    SYSTEM ONLINE
                </div>
            </div>
         </header>
         <div className="flex-1 overflow-auto p-6">
            <Outlet />
         </div>
      </main>
    </div>
  );
}
