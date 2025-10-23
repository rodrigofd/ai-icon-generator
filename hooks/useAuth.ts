import { useContext } from 'react';
import { UserContext } from '../context/UserContext';

export const useAuth = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  const { user, setUser, loading, setLoading } = context;

  // Mock login function
  const login = () => {
    setLoading(true);
    // Simulate API call to Google OAuth
    setTimeout(() => {
      const mockUser = {
        id: '12345-mock-user',
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
      };
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      setLoading(false);
    }, 1000);
  };

  // Mock logout function
  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return { user, login, logout, loading: loading };
};
