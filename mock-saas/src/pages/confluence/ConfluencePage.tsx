import { useState } from 'react';
import { Search, FileText, ChevronRight, Star, Clock, Home } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  space: string;
  content: string;
  lastUpdated: string;
}

export function ConfluencePage() {
  const [pages] = useState<Page[]>([
    { 
        id: '1', 
        title: 'Project Phoenix Architecture', 
        space: 'Engineering',
        content: '# Project Phoenix\n\n## Overview\nProject Phoenix aims to unify the browser experience. \n\n### Key Components\n* Electron Shell\n* React UI\n* LangChain Agent',
        lastUpdated: '2 hours ago'
    },
    { 
        id: '2', 
        title: 'Q4 Marketing Strategy', 
        space: 'Marketing',
        content: '# Q4 Strategy\n\nFocus on enterprise decision makers. \n\n## Channels\n1. LinkedIn\n2. TechCrunch\n3. Industry Events',
        lastUpdated: '1 day ago'
    },
    { 
        id: '3', 
        title: 'Employee Onboarding', 
        space: 'HR',
        content: '# Welcome!\n\nWelcome to the team. Here is your checklist:\n- [ ] Setup Email\n- [ ] Join Slack\n- [ ] Read Handbook',
        lastUpdated: '3 days ago'
    },
  ]);
  const [selectedPageId, setSelectedPageId] = useState<string>('1');
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
        {/* Top Nav */}
        <nav className="h-14 border-b bg-white flex items-center px-4 justify-between sticky top-0 z-10">
            <div className="flex items-center gap-6">
                <div className="font-bold text-blue-700 text-lg flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center text-white text-xs">C</div>
                    Confluence
                </div>
                <div className="text-sm font-medium text-slate-600">Spaces</div>
                <div className="text-sm font-medium text-slate-600">People</div>
                <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Create</button>
            </div>
            <div className="relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-8 pr-3 py-1.5 border rounded-md bg-slate-50 text-sm w-64 focus:bg-white focus:border-blue-500 focus:outline-none" placeholder="Search" />
            </div>
        </nav>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-50 border-r flex flex-col">
                <div className="p-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold mb-6">
                        <Home size={18} /> Home
                    </div>
                    
                    <div className="mb-6">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Recent</div>
                        {pages.map(page => (
                            <div 
                                key={page.id}
                                onClick={() => setSelectedPageId(page.id)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${selectedPageId === page.id ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-200'}`}
                            >
                                <FileText size={14} />
                                <span className="truncate">{page.title}</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Spaces</div>
                        {['Engineering', 'Marketing', 'HR', 'Design'].map(space => (
                            <div key={space} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm text-slate-700 hover:bg-slate-200">
                                <div className="w-4 h-4 bg-slate-300 rounded text-[10px] flex items-center justify-center font-bold text-slate-600">{space[0]}</div>
                                {space}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto">
                {selectedPage ? (
                    <div className="animate-in fade-in duration-300">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                            <span>{selectedPage.space}</span>
                            <ChevronRight size={14} />
                            <span>Pages</span>
                            <ChevronRight size={14} />
                            <span className="text-slate-800">{selectedPage.title}</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-bold text-slate-900 mb-4">{selectedPage.title}</h1>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-8">
                            <span className="flex items-center gap-1">Created by <span className="font-medium text-blue-600">John Doe</span></span>
                            <span className="flex items-center gap-1"><Clock size={12} /> Last updated {selectedPage.lastUpdated}</span>
                            <button className="flex items-center gap-1 text-slate-500 hover:text-yellow-500"><Star size={12} /> Save for later</button>
                        </div>

                        {/* Content (Mock Markdown) */}
                        <div className="prose prose-slate max-w-none">
                            {selectedPage.content.split('\n').map((line, i) => {
                                if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 pb-2 border-b">{line.replace('# ', '')}</h1>
                                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>
                                if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>
                                if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-1">{line.replace(/^[*|-] /, '')}</li>
                                if (line.match(/^\d\./)) return <li key={i} className="ml-4 list-decimal mb-1">{line.replace(/^\d\./, '')}</li>
                                if (line === '') return <br key={i} />
                                return <p key={i} className="mb-2 text-slate-700 leading-relaxed">{line}</p>
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">Select a page to view</div>
                )}
            </main>
        </div>
    </div>
  );
}
