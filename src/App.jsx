import { Route, Routes } from 'react-router-dom';
import { ActiveGoalProvider } from './context/ActiveGoalContext.jsx';
import Layout from './components/layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import LogEntryPage from './pages/LogEntryPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <ActiveGoalProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/log" element={<LogEntryPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </ActiveGoalProvider>
  );
}
