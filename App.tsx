import React from 'react';
import IconGenerator from './components/IconGenerator';
import { useAuth } from './hooks/useAuth';
import GoogleIcon from './components/icons/GoogleIcon';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const { user, login, logout, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              AI Icon Generator
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              Your one-stop solution for AI-powered icon creation.
            </p>
          </div>
          <div>
            {user ? (
              <button
                onClick={logout}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={login}
                disabled={loading}
                className="bg-white text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded-md shadow-sm hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Spinner /> : <GoogleIcon className="w-5 h-5" />}
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        <main>
          <IconGenerator />
        </main>
      </div>
    </div>
  );
};

export default App;