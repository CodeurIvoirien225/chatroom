import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, LogOut, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (user?.id) {
      try {
        await fetch('https://chatroom-backend-e1n0.onrender.com/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
      } catch (error) {
        console.error('Erreur lors de la déconnexion serveur:', error);
      }
    }
  
    setUser(null);
    toast.success('Déconnexion réussie');
    navigate('/');
  };
  
  const avatarUrl = user?.avatar_url || null;

  return (
    <>
      {/* Bouton menu mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-30 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        w-16 bg-gray-800 flex flex-col items-center py-4 space-y-6`}>

        <button 
          onClick={() => {
            navigate('/profile');
            setMobileMenuOpen(false);
          }}
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${user?.email?.charAt(0).toUpperCase() || 'U'}&background=random`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>

        {/* Navigation Icons */}
        <div className="flex flex-col space-y-4 flex-grow">
          <button 
            className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
            title="Accueil"
            onClick={() => {
              navigate('/chat');
              setMobileMenuOpen(false);
            }}
          >
            <Home className="w-5 h-5" />
          </button>
          
          <button 
            className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            title="Toutes les salles"
            onClick={() => {
              navigate('/rooms');
              setMobileMenuOpen(false);
            }}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

         
        </div>

        {/* Déconnexion */}
        <div className="mt-auto">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overlay pour menu mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;