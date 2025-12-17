import { useState } from 'react';
import { ArrowRight, Building2, Upload, CheckCircle } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function SaasSetupPage() {
    const { setAppMode } = useBrowserStore();
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
        companyName: '',
        primaryColor: '#0052CC',
        ssoProvider: 'okta'
    });

    const handleComplete = () => {
        // In a real app, this would generate/save the enterprise.config.json
        // For now, we just switch to 'dev' mode but ostensibly configured
        setAppMode('dev');
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                
                {/* Header */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Building2 size={24} />
                        </div>
                        <h1 className="text-xl font-semibold">Enterprise Instance Setup</h1>
                    </div>
                    <p className="text-slate-500 text-sm">
                        Configure your white-labeled browser instance.
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-medium">1. Organization Details</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                        placeholder="e.g. Acme Corp"
                                        value={config.companyName}
                                        onChange={e => setConfig({...config, companyName: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
                                    <div className="flex gap-3">
                                        <input 
                                            type="color" 
                                            className="h-10 w-20 cursor-pointer rounded border border-slate-300 p-1"
                                            value={config.primaryColor}
                                            onChange={e => setConfig({...config, primaryColor: e.target.value})}
                                        />
                                        <div className="flex-1 px-4 py-2 bg-slate-100 rounded-lg text-slate-500 text-sm flex items-center">
                                            {config.primaryColor}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-medium">2. Integrations & SSO</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Identity Provider</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['okta', 'azure', 'google', 'onelogin'].map(provider => (
                                            <button
                                                key={provider}
                                                onClick={() => setConfig({...config, ssoProvider: provider})}
                                                className={cn(
                                                    "px-4 py-3 border rounded-lg text-sm font-medium capitalize transition-all",
                                                    config.ssoProvider === provider 
                                                        ? "border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500" 
                                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                                )}
                                            >
                                                {provider}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center">
                                    <Upload size={24} className="text-slate-400 mb-2" />
                                    <p className="text-sm font-medium text-slate-700">Upload Enterprise Config</p>
                                    <p className="text-xs text-slate-500 mt-1">Or drag and drop enterprise.config.json</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900">Instance Ready</h2>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                We have generated the build configuration for <strong>{config.companyName || 'Your Company'}</strong>.
                            </p>
                            
                            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg text-left text-xs font-mono overflow-hidden">
                                <div className="text-green-400">$ building enterprise-browser...</div>
                                <div>[info] injecting branding: {config.primaryColor}</div>
                                <div>[info] configuring sso: {config.ssoProvider}</div>
                                <div>[success] build complete: ./dist/{config.companyName?.toLowerCase().replace(/\s+/g, '-')}-browser.dmg</div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    {step > 1 ? (
                        <button 
                            onClick={() => setStep(s => s - 1)}
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            Back
                        </button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(s => s + 1)}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleComplete}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            Launch Instance
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
