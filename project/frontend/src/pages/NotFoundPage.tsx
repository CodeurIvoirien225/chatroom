import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareX } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center px-4">
      <MessageSquareX className="h-24 w-24 text-indigo-500 mb-6" />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Page introuvable</h1>
      <p className="text-gray-600 mb-8">
      Oups ! La page que vous recherchez n'existe pas.
      </p>
      <Link 
        to="/" 
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;