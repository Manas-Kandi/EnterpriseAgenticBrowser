import { User, Code, Check, Lock, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface OnboardingPageProps {
    onSelectMode: (mode: 'personal' | 'dev' | 'saas') => void;
}

export function OnboardingPage({ onSelectMode }: OnboardingPageProps) {
    const [selected, setSelected] = useState<'personal' | 'dev' | 'saas' | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleConfirm = () => {
        if (selected === 'dev') {
            setShowPassword(true);
        } else if (selected) {
            onSelectMode(selected);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded password for MVP
        if (password === 'dev123') {
            onSelectMode('dev');
        } else {
            setError(true);
        }
    };

    if (showPassword) {
        return (
            <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-2xl relative">
                    <button 
                        onClick={() => setShowPassword(false)}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                            <Lock size={32} />
                        </div>
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-semibold">Developer Access</h2>
                            <p className="text-muted-foreground">Enter password to unlock Developer Mode</p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
                            <input
                                type="password"
                                autoFocus
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                                className={cn(
                                    "w-full px-4 py-3 bg-background border rounded-lg outline-none focus:ring-2 transition-all",
                                    error 
                                        ? "border-destructive focus:ring-destructive/20" 
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                )}
                                placeholder="Enter password"
                            />
                            {error && <p className="text-sm text-destructive text-center">Incorrect password</p>}
                            
                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Unlock
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
            <div className="max-w-6xl w-full flex flex-col items-center gap-12">
                
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                        Welcome to <span className="font-semibold">Enterprise Browser</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                        Choose how you want to use this browser. You can switch modes later in Settings.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    
                    {/* Personal Card */}
                    <button
                        onClick={() => setSelected('personal')}
                        className={cn(
                            "group relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02]",
                            selected === 'personal' 
                                ? "border-blue-500 bg-blue-500/5 shadow-xl shadow-blue-500/10" 
                                : "border-border bg-card hover:border-blue-500/50 hover:bg-secondary/30"
                        )}
                    >
                        {selected === 'personal' && (
                            <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
                                <Check size={16} />
                            </div>
                        )}
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
                            selected === 'personal' ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-500"
                        )}>
                            <User size={40} />
                        </div>
                        <h3 className="text-2xl font-medium mb-2">Personal Use</h3>
                        <p className="text-center text-muted-foreground">
                            A clean, fast browser for your daily needs. No enterprise clutter. Just you and the web.
                        </p>
                    </button>

                    {/* Developer Card */}
                    <button
                        onClick={() => setSelected('dev')}
                        className={cn(
                            "group relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02]",
                            selected === 'dev' 
                                ? "border-zinc-500 bg-zinc-500/5 shadow-xl shadow-zinc-500/10" 
                                : "border-border bg-card hover:border-zinc-500/50 hover:bg-secondary/30"
                        )}
                    >
                        {selected === 'dev' && (
                            <div className="absolute top-4 right-4 bg-zinc-500 text-white rounded-full p-1">
                                <Check size={16} />
                            </div>
                        )}
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
                            selected === 'dev' ? "bg-zinc-500 text-white" : "bg-secondary text-muted-foreground group-hover:bg-zinc-500/20 group-hover:text-zinc-500"
                        )}>
                            <Code size={40} />
                        </div>
                        <h3 className="text-2xl font-medium mb-2">Developer Mode</h3>
                        <p className="text-center text-muted-foreground">
                            Full access to Mock SaaS environment, Agent Tools, and Enterprise integrations.
                        </p>
                    </button>

                    {/* SaaS Platform Card */}
                    <button
                        onClick={() => setSelected('saas')}
                        className={cn(
                            "group relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02]",
                            selected === 'saas' 
                                ? "border-purple-500 bg-purple-500/5 shadow-xl shadow-purple-500/10" 
                                : "border-border bg-card hover:border-purple-500/50 hover:bg-secondary/30"
                        )}
                    >
                        {selected === 'saas' && (
                            <div className="absolute top-4 right-4 bg-purple-500 text-white rounded-full p-1">
                                <Check size={16} />
                            </div>
                        )}
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
                            selected === 'saas' ? "bg-purple-500 text-white" : "bg-secondary text-muted-foreground group-hover:bg-purple-500/20 group-hover:text-purple-500"
                        )}>
                            <Building2 size={40} />
                        </div>
                        <h3 className="text-2xl font-medium mb-2">SaaS Platform</h3>
                        <p className="text-center text-muted-foreground">
                            Build and configure your own custom browser instance for your organization.
                        </p>
                    </button>

                </div>

                <div className="h-16 flex items-center">
                    {selected && (
                        <button
                            onClick={handleConfirm}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            Get Started
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
