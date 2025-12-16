import { User, Code, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface OnboardingPageProps {
    onSelectMode: (mode: 'personal' | 'dev') => void;
}

export function OnboardingPage({ onSelectMode }: OnboardingPageProps) {
    const [selected, setSelected] = useState<'personal' | 'dev' | null>(null);

    const handleConfirm = () => {
        if (selected) {
            onSelectMode(selected);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="max-w-4xl w-full flex flex-col items-center gap-12">
                
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                        Welcome to <span className="font-semibold">Enterprise Browser</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                        Choose how you want to use this browser. You can switch modes later in Settings.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    
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

                </div>

                <div className="h-16 flex items-center">
                    {selected && (
                        <button
                            onClick={handleConfirm}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all animate-in slide-in-from-bottom-4 duration-300"
                        >
                            Get Started
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
