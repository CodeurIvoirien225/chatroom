import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, User, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/rooms" className="flex items-center">
            <MessageSquare className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-800">Chat Room</span>
          </Link>
          
          <div className="flex space-x-4">
            <Link
              to="/rooms"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/rooms'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Home className="h-5 w-5 mr-1" />
                <span>Rooms</span>
              </div>
            </Link>
            
            <Link
              to="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/profile'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <User className="h-5 w-5 mr-1" />
                <span>Profile</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;