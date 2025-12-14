import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { JiraPage } from './pages/jira/JiraPage';
import { ConfluencePage } from './pages/confluence/ConfluencePage';
import { TrelloPage } from './pages/trello/TrelloPage';

// AeroCore Imports
import { AeroProvider } from './aerocore/lib/store';
import { AeroShell } from './aerocore/components/AeroShell';
import { AdminPage } from './aerocore/pages/admin/AdminPage';
import { DispatchPage } from './aerocore/pages/dispatch/DispatchPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/jira" element={<JiraPage />} />
        <Route path="/confluence" element={<ConfluencePage />} />
        <Route path="/trello" element={<TrelloPage />} />
        
        {/* AeroCore Suite */}
        <Route path="/aerocore/*" element={
            <AeroProvider>
                <Routes>
                    <Route element={<AeroShell />}>
                        <Route path="admin" element={<AdminPage />} />
                        <Route path="dispatch" element={<DispatchPage />} />
                        <Route path="fleet" element={<div className="p-10 text-slate-400">Fleet Management (Coming Soon)</div>} />
                        <Route path="security" element={<div className="p-10 text-slate-400">SecurePerimeter (Coming Soon)</div>} />
                        <Route path="hr" element={<div className="p-10 text-slate-400">WorkforceHub (Coming Soon)</div>} />
                        <Route path="cargo" element={<div className="p-10 text-slate-400">CargoFlow (Coming Soon)</div>} />
                        <Route path="data" element={<div className="p-10 text-slate-400">DataLake (Coming Soon)</div>} />
                    </Route>
                </Routes>
            </AeroProvider>
        } />

        <Route path="/" element={
            <div className="p-10 font-sans">
                <h1 className="text-2xl font-bold mb-4">Mock SaaS Suite</h1>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Legacy Apps</h2>
                        <ul className="list-disc ml-5 space-y-2">
                            <li><a href="/jira" className="text-blue-600 hover:underline">Jira Software</a></li>
                            <li><a href="/confluence" className="text-blue-600 hover:underline">Confluence</a></li>
                            <li><a href="/trello" className="text-blue-600 hover:underline">Trello</a></li>
                        </ul>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-lg text-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center font-bold">A</div>
                            <h2 className="text-lg font-bold text-sky-400">AeroCore Enterprise Systems</h2>
                        </div>
                        <p className="text-slate-400 mb-4 text-sm">Autonomous logistics and security suite.</p>
                        <ul className="grid grid-cols-2 gap-4">
                            <li><a href="/aerocore/admin" className="block p-3 bg-slate-800 rounded hover:bg-slate-700 hover:text-sky-300 transition-colors">Admin Console</a></li>
                            <li><a href="/aerocore/dispatch" className="block p-3 bg-slate-800 rounded hover:bg-slate-700 hover:text-sky-300 transition-colors">Dispatch (Beta)</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
