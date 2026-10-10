import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const OrgContext = createContext();

export const OrgProvider = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
    }
  }, [user]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/organizations');
      setOrganizations(data.data.organizations);
      if (data.data.organizations.length > 0 && !currentOrg) {
        setCurrentOrg(data.data.organizations[0]);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = (org) => {
    setCurrentOrg(org);
  };

  return (
    <OrgContext.Provider value={{ organizations, currentOrg, selectOrganization, loading, fetchOrganizations }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
