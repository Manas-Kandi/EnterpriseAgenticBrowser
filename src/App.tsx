import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { BrowserChrome } from '@/components/browser/BrowserChrome';
import { BrowserView } from '@/components/browser/BrowserView';

function App() {
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
