import React from 'react';
import { useAero } from '../../lib/store';
import { Search, Clock, FileText, MessageSquare } from 'lucide-react';

export const PortalPage: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { state } = useAero();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-100">Client Portal</h1>
                    <p className="text-slate-400 mt-1">Track shipments and manage service requests.</p>
                </div>
            </header>

            {/* Placeholder content for now - will be implemented in subsequent tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-full bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-xl font-semibold text-sky-400 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Track Shipment
                    </h2>
                    <div className="flex gap-4">
                        <input 
                            type="text" 
                            placeholder="Enter Tracking Number..." 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-md font-medium transition-colors">
                            Track
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-sky-400" />
                        Recent Orders
                    </h3>
                    <p className="text-slate-400 text-sm">No recent orders found.</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        Invoices
                    </h3>
                    <p className="text-slate-400 text-sm">All payments up to date.</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-sky-400" />
                        Support
                    </h3>
                    <p className="text-slate-400 text-sm">Need help? Start a chat.</p>
                </div>
            </div>
        </div>
    );
};
