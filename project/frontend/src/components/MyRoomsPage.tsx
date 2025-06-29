import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ArrowRight, Loader } from 'lucide-react';

interface Room {
  id: number;
  name: string;
  description: string;
  type: string;
  joined_at: string;
}

const API_BASE_URL = 'http://localhost:3001';

const MyRoomsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchJoinedRooms = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/rooms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Échec du chargement des salles');
      
      const data = await response.json();
      
      // Transformez les données si nécessaire pour correspondre à votre interface Room
      const formattedRooms = data.rooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        type: room.type,
        joined_at: room.joined_at
      }));
      
      setRooms(formattedRooms);
    } catch (error) {
      console.error('Erreur lors de la récupération des salles:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJoinedRooms();
    
    const handleRoomJoined = () => {
      fetchJoinedRooms();
    };
    
    window.addEventListener('room-joined', handleRoomJoined);
    return () => window.removeEventListener('room-joined', handleRoomJoined);
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 relative">
      {isRefreshing && (
        <div className="fixed top-4 right-4 bg-white p-2 rounded shadow-md flex items-center z-50">
          <Loader className="animate-spin h-4 w-4 mr-2" />
          <span className="text-sm">Mise à jour en cours...</span>
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mes salles de discussion</h1>
      
      {rooms.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Aucune salle rejointe</h3>
          <p className="mt-1 text-sm text-gray-500">
            Rejoignez des salles pour les voir apparaître ici
          </p>
          <button
            onClick={() => navigate('/rooms')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Explorer les salles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
              onClick={() => navigate(`/chat/${room.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{room.description}</p>
                  <div className="flex items-center mt-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 rounded mr-2">
                      {room.type === 'public' ? 'Publique' : 'Privée'}
                    </span>
                    <p className="text-xs text-gray-400">
                      Rejoint le {formatDate(room.joined_at)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRoomsPage;