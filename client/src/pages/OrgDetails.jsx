import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OrgDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, membersRes, projectsRes] = await Promise.all([
        api.get(`/organizations/${id}`),
        api.get(`/organizations/${id}/members`),
        api.get(`/projects?organizationId=${id}`)
      ]);
      setOrg(orgRes.data.data.organization);
      setMembers(membersRes.data.data.members);
      setProjects(projectsRes.data.data.projects);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    try {
      await api.post('/projects', { name: newProjectName, organizationId: id });
      setNewProjectName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error creating project');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!newMemberEmail) return;
    try {
      await api.post(`/organizations/${id}/members`, { email: newMemberEmail, role: 'MEMBER' });
      setNewMemberEmail('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error inviting member');
    }
  };

  const myRole = members.find(m => m.user.id === user.id)?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading organization details...</div>;
  if (!org) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Manage projects and team members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Projects</h2>
          
          {canManage && (
            <form onSubmit={handleCreateProject} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New Project Name"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                Create
              </button>
            </form>
          )}

          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {projects.map(project => (
              <li key={project.id} className="py-3 flex justify-between items-center">
                <Link to={`/projects/${project.id}`} className="font-medium text-indigo-600 hover:underline text-sm">
                  {project.name}
                </Link>
                <span className="text-xs text-gray-500">{project._count?.tasks || 0} tasks</span>
              </li>
            ))}
            {projects.length === 0 && <li className="py-4 text-xs text-gray-500 text-center">No projects yet</li>}
          </ul>
        </div>

        {/* Members Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Team Members</h2>
          
          {canManage && (
            <form onSubmit={handleInvite} className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="User Email to Invite"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                Invite
              </button>
            </form>
          )}

          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {members.map(member => (
              <li key={member.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wide font-medium">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
