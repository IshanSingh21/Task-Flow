import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import api from '../services/api';

export default function Dashboard() {
  const { currentOrg, organizations } = useOrg();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      fetchProjects();
    }
  }, [currentOrg]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects?organizationId=${currentOrg.id}`);
      setProjects(data.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to TaskFlow!</h2>
        <p className="text-gray-600 mb-8">Get started by creating your first organization.</p>
        <Link to="/organizations" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700">
          Create Organization
        </Link>
      </div>
    );
  }

  if (!currentOrg) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{currentOrg.name} Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your projects and tasks</p>
        </div>
        <Link to={`/organizations/${currentOrg.id}`} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
          New Project
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-gray-500 mb-4">No projects found in this organization.</p>
          <Link to={`/organizations/${currentOrg.id}`} className="text-indigo-600 font-medium hover:underline">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              )}
              <div className="flex justify-between items-center text-xs text-gray-500 mt-4">
                <span>{project._count?.tasks || 0} tasks</span>
                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
