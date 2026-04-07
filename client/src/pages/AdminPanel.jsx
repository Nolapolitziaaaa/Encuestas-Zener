import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import Footer from '../components/Layout/Footer';
import AdminDashboard from '../components/Admin/AdminDashboard';
import TemplateList from '../components/Admin/TemplateList';
import TemplateBuilder from '../components/Admin/TemplateBuilder';
import FormManager from '../components/Admin/FormManager';
import UserManagement from '../components/Admin/UserManagement';
import ReportsDashboard from '../components/Admin/ReportsDashboard';
import ReportsDetails from '../components/Admin/ReportsDetails';

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="templates" element={<TemplateList />} />
            <Route path="templates/new" element={<TemplateBuilder />} />
            <Route path="templates/:id/edit" element={<TemplateBuilder />} />
            <Route path="forms" element={<FormManager />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="reports" element={<ReportsDashboard />} />
            <Route path="reports/details" element={<ReportsDetails />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}
