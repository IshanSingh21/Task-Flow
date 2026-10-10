import { useState } from 'react';
import { useOrg } from '../context/OrgContext';
import api from '../services/api';

export default function Organizations() {
  const { organizations, fetchOrganizations, selectOrganization, currentOrg } = useOrg();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/organizations', { name });
      setName('');
      await fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Organizations</h1>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Organization</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            required
            placeholder="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !name}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <h2 className="text-lg font-medium text-gray-900 mb-4">Your Organizations</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {organizations.map(org => (
            <li key={org.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-500">Role: {org.members?.[0]?.role}</p>
              </div>
              <div className="flex gap-2">
                {currentOrg?.id !== org.id && (
                  <button
                    onClick={() => selectOrganization(org)}
                    className="text-xs px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Select Active
                  </button>
                )}
                {currentOrg?.id === org.id && (
                  <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-800 rounded font-medium">
                    Active
                  </span>
                )}
              </div>
            </li>
          ))}
          {organizations.length === 0 && (
            <li className="p-4 text-center text-gray-500 text-sm">No organizations found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
