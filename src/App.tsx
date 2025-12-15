import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { BrowserChrome } from '@/components/browser/BrowserChrome';
import { BrowserView } from '@/components/browser/BrowserView';
import { useEffect } from 'react';
import { useBrowserStore } from '@/lib/store';

function App() {
  const { addTab, removeTab, updateTab, activeTabId } = useBrowserStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+T: New Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      
      // CMD+W: Close Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) removeTab(activeTabId);
      }

      // CMD+R: Reload
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        if (activeTabId) updateTab(activeTabId, { action: 'reload' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, removeTab, updateTab, activeTabId]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Browser Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <BrowserChrome />
          <BrowserView />
        </main>
        
        {/* Agent Sidebar */}
        <Sidebar />
      </div>
      
      {/* Global Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
