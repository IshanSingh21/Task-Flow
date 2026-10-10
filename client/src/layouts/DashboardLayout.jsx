import { Outlet, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { LogOut, FolderGit2, Users, LayoutDashboard } from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { organizations, currentOrg, selectOrganization } = useOrg();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <LayoutDashboard size={24} />
            TaskFlow
          </h1>
        </div>

        {/* Org Selector */}
        <div className="p-4 border-b border-gray-200">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Organization
          </label>
          <select 
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-indigo-500 focus:border-indigo-500 block p-2 text-sm"
            value={currentOrg?.id || ''}
            onChange={(e) => {
              const org = organizations.find(o => o.id === e.target.value);
              if (org) selectOrganization(org);
            }}
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
            {organizations.length === 0 && <option value="">No organizations</option>}
          </select>
          <Link to="/organizations" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
            Manage Organizations
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            <li>
              <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
            </li>
            {currentOrg && (
              <>
                <li>
                  <Link to={`/organizations/${currentOrg.id}`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                    <FolderGit2 size={18} /> Projects
                  </Link>
                </li>
                <li>
                  <Link to={`/organizations/${currentOrg.id}/members`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                    <Users size={18} /> Team
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 w-full"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
