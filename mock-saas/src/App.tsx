import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JiraPage } from './pages/jira/JiraPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/jira" element={<JiraPage />} />
        <Route path="/" element={<div className="p-10"><h1>Mock SaaS Home</h1><ul><li><a href="/jira" className="text-blue-500 hover:underline">Go to Jira</a></li></ul></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
