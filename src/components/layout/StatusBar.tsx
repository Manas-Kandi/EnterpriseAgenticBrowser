import { Globe, Lock } from 'lucide-react';

export function StatusBar() {
  return (
    <footer className="h-8 bg-secondary/50 border-t border-border flex items-center px-4 justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1"><Globe size={12} /> Ready</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1"><Lock size={12} /> Secure Connection</span>
      </div>
    </footer>
  );
}
