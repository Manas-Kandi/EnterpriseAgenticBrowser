import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';

function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Browser Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {/* Mock Navigation Bar */}
          <div className="h-12 border-b border-border flex items-center px-4 gap-4 bg-background">
             <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
             </div>
             <div className="flex-1 bg-secondary/50 h-8 rounded-md px-3 flex items-center text-sm text-muted-foreground">
                https://jira.atlassian.com/browse/PROJ-123
             </div>
          </div>

          {/* Web Content Placeholder */}
          <div className="flex-1 p-8 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Ready to Browse</h2>
                <p>Select an app from the agent command palette to begin.</p>
            </div>
          </div>
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
