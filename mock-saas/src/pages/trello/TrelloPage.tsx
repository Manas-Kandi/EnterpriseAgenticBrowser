import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Bell } from 'lucide-react';

interface Card {
  id: string;
  title: string;
  labels: string[];
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export function TrelloPage() {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'col-1',
      title: 'Backlog',
      cards: [
        { id: 'c1', title: 'Research competitors', labels: ['green'] },
        { id: 'c2', title: 'Design new logo', labels: ['blue', 'yellow'] },
      ]
    },
    {
      id: 'col-2',
      title: 'Doing',
      cards: [
        { id: 'c3', title: 'Implement Auth', labels: ['red'] },
      ]
    },
    {
      id: 'col-3',
      title: 'Done',
      cards: [
        { id: 'c4', title: 'Project Setup', labels: ['green'] },
      ]
    }
  ]);

  const [draggedCard, setDraggedCard] = useState<{ card: Card, sourceColId: string } | null>(null);

  const handleDragStart = (card: Card, sourceColId: string) => {
    setDraggedCard({ card, sourceColId });
  };

  const handleDrop = (targetColId: string) => {
    if (!draggedCard) return;
    if (draggedCard.sourceColId === targetColId) {
        setDraggedCard(null);
        return;
    }

    setColumns(prev => prev.map(col => {
        if (col.id === draggedCard.sourceColId) {
            return { ...col, cards: col.cards.filter(c => c.id !== draggedCard.card.id) };
        }
        if (col.id === targetColId) {
            return { ...col, cards: [...col.cards, draggedCard.card] };
        }
        return col;
    }));
    setDraggedCard(null);
  };

  return (
    <div className="min-h-screen bg-sky-700 font-sans flex flex-col overflow-hidden">
        {/* Nav */}
        <nav className="h-12 bg-black/20 backdrop-blur-sm flex items-center px-4 justify-between text-white">
            <div className="flex items-center gap-4">
                <div className="font-bold text-lg flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                    <div className="w-5 h-5 bg-white/20 rounded flex justify-center items-center">T</div>
                    Trello
                </div>
                <button className="text-sm font-medium bg-white/20 px-3 py-1 rounded hover:bg-white/30">Workspaces</button>
                <button className="text-sm font-medium bg-white/20 px-3 py-1 rounded hover:bg-white/30">Recent</button>
                <button className="text-sm font-medium bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">Create</button>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70" />
                    <input className="pl-7 pr-2 py-1 bg-white/20 rounded text-sm text-white placeholder-white/70 focus:bg-white focus:text-slate-900 w-48 outline-none" placeholder="Search" />
                </div>
                <Bell size={18} className="cursor-pointer hover:rotate-12 transition-transform" />
                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">JD</div>
            </div>
        </nav>

        {/* Board Header */}
        <div className="h-12 px-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold">Product Roadmap</h1>
                <button className="p-1 hover:bg-white/20 rounded"><Star size={16} /></button>
                <div className="h-4 w-[1px] bg-white/30" />
                <button className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30">Board</button>
            </div>
            <button className="text-sm flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded"><MoreHorizontal size={16} /> Show Menu</button>
        </div>

        {/* Board Canvas */}
        <div className="flex-1 overflow-x-auto p-4 flex items-start gap-4">
            {columns.map(col => (
                <div 
                    key={col.id} 
                    className="w-72 bg-[#f1f2f4] rounded-xl flex-shrink-0 max-h-full flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.id)}
                >
                    <div className="p-3 font-semibold text-sm text-slate-700 flex justify-between items-center">
                        {col.title}
                        <MoreHorizontal size={16} className="text-slate-500 cursor-pointer hover:bg-slate-200 rounded p-0.5" />
                    </div>
                    
                    <div className="px-2 pb-2 flex-1 overflow-y-auto space-y-2">
                        {col.cards.map(card => (
                            <div 
                                key={card.id}
                                draggable
                                onDragStart={() => handleDragStart(card, col.id)}
                                className="bg-white p-2.5 rounded-lg shadow-sm border-b border-slate-200 cursor-pointer hover:border-blue-500 group active:rotate-2 transition-transform"
                            >
                                <div className="flex gap-1 mb-1.5">
                                    {card.labels.map((label, i) => (
                                        <div key={i} className={`h-2 w-8 rounded-full ${label === 'green' ? 'bg-green-500' : label === 'blue' ? 'bg-blue-500' : label === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    ))}
                                </div>
                                <div className="text-sm text-slate-700">{card.title}</div>
                            </div>
                        ))}
                    </div>

                    <div className="p-2 pt-0">
                        <button className="w-full flex items-center gap-2 p-2 text-slate-500 hover:bg-slate-200 rounded-lg text-sm transition-colors text-left">
                            <Plus size={16} /> Add a card
                        </button>
                    </div>
                </div>
            ))}
            
            <div className="w-72 bg-white/20 rounded-xl flex-shrink-0 p-3 text-white placeholder-white cursor-pointer hover:bg-white/30 transition-colors flex items-center gap-2">
                <Plus size={16} /> Add another list
            </div>
        </div>
    </div>
  );
}

// Helper component for icon
function Star({ size }: { size: number }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}
