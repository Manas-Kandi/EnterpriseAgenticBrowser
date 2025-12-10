import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, CheckCircle2, Circle, Clock } from 'lucide-react';

interface Issue {
  id: string;
  key: string;
  summary: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
}

export function JiraPage() {
  const [issues, setIssues] = useState<Issue[]>([
    { id: '1', key: 'PROJ-1', summary: 'Fix login page layout', status: 'To Do', assignee: 'jdoe', priority: 'High' },
    { id: '2', key: 'PROJ-2', summary: 'Update API documentation', status: 'In Progress', assignee: 'smitchell', priority: 'Medium' },
    { id: '3', key: 'PROJ-3', summary: 'Investigate server crash', status: 'Done', assignee: 'jdoe', priority: 'High' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSummary, setNewSummary] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary) return;
    
    setIssues(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        key: `PROJ-${prev.length + 1}`,
        summary: newSummary,
        status: 'To Do',
        assignee: 'Unassigned',
        priority: 'Medium'
      }
    ]);
    setNewSummary('');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="h-14 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="font-bold text-blue-600 text-lg flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">J</div>
            Jira Software
          </div>
          <div className="text-sm font-medium text-gray-600">Projects</div>
          <div className="text-sm font-medium text-gray-600">Filters</div>
          <div className="text-sm font-medium text-gray-600">Dashboards</div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create
          </button>
        </div>
        <div className="relative">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-8 pr-3 py-1.5 border rounded bg-gray-100 text-sm w-48 focus:bg-white focus:border-blue-500 focus:outline-none transition-all" placeholder="Search" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
            <div>
                <div className="text-sm text-gray-500 mb-1">Projects / PROJ</div>
                <h1 className="text-2xl font-semibold text-gray-800">Kanban Board</h1>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Group By: None</span>
            </div>
        </div>

        {/* Board Columns */}
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            {['To Do', 'In Progress', 'Done'].map(status => (
                <div key={status} className="bg-gray-100 rounded-lg p-2 flex flex-col gap-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-2">
                        {status} <span className="ml-1 bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600">{issues.filter(i => i.status === status).length}</span>
                    </div>
                    {issues.filter(i => i.status === status).map(issue => (
                        <div key={issue.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer group">
                            <div className="text-sm font-medium text-gray-800 mb-2 group-hover:text-blue-600">{issue.summary}</div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {status === 'Done' ? <CheckCircle2 size={16} className="text-green-600" /> : 
                                     status === 'In Progress' ? <Clock size={16} className="text-blue-600" /> :
                                     <Circle size={16} className="text-gray-400" />}
                                    <span className="text-xs text-gray-500 font-mono">{issue.key}</span>
                                </div>
                                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                                    {issue.assignee[0].toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 text-gray-500 hover:bg-gray-200 p-2 rounded text-sm transition-colors mt-1"
                    >
                        <Plus size={16} /> Create issue
                    </button>
                </div>
            ))}
        </div>
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[500px] p-6 animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-semibold mb-4">Create Issue</h2>
                <form onSubmit={handleCreate}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select className="w-full border rounded px-3 py-2 text-sm bg-gray-50" disabled>
                            <option>PROJ (Software Project)</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                        <select className="w-full border rounded px-3 py-2 text-sm bg-gray-50">
                            <option>Task</option>
                            <option>Bug</option>
                            <option>Story</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Summary <span className="text-red-500">*</span></label>
                        <input 
                            autoFocus
                            className="w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={newSummary}
                            onChange={e => setNewSummary(e.target.value)}
                            placeholder="What needs to be done?"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!newSummary}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
