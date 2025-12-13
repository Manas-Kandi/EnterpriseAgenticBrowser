import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { JiraPage } from './pages/jira/JiraPage';
import { ConfluencePage } from './pages/confluence/ConfluencePage';
import { TrelloPage } from './pages/trello/TrelloPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/jira" element={<JiraPage />} />
        <Route path="/confluence" element={<ConfluencePage />} />
        <Route path="/trello" element={<TrelloPage />} />
        <Route path="/" element={
            <div className="p-10 font-sans">
                <h1 className="text-2xl font-bold mb-4">Mock SaaS Suite</h1>
                <ul className="list-disc ml-5 space-y-2">
                    <li><a href="/jira" className="text-blue-600 hover:underline">Jira Software</a></li>
                    <li><a href="/confluence" className="text-blue-600 hover:underline">Confluence</a></li>
                    <li><a href="/trello" className="text-blue-600 hover:underline">Trello</a></li>
                </ul>
            </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
