import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Plus, Search, Users, MessageSquare, Briefcase, Gem, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Room {
  id: string;
  name: string;
  description: string;
  type: string;
  participantCount?: number;
  last_message?: string;
  last_message_time?: string;
  created_at: string;
}

const RoomList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomType, setNewRoomType] = useState('amitié');
  const [loading, setLoading] = useState(true);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';


  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) throw new Error(`Erreur HTTP! Statut: ${response.status}`);
      
      const data: Room[] = await response.json();
      const roomsWithParticipants = await Promise.all(
        data.map(async (room) => {
          try {
            const res = await fetch(`${API_BASE_URL}/rooms/${room.id}/participants`);
            const participants = await res.json();
            return { ...room, participantCount: participants.length };
          } catch (error) {
            console.error(`Erreur lors du chargement des participants de la salle ${room.id}`, error);
            return { ...room, participantCount: 0 };
          }
        })
      );
      setRooms(roomsWithParticipants);
    } catch (error) {
      console.error('Erreur lors de la récupération des salles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      alert("Le nom de la salle ne peut pas être vide.");
      return;
    }
    if (!currentUser?.id) {
      alert("Vous devez être connecté pour créer une salle.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          description: newRoomDescription,
          type: newRoomType.toLowerCase(),
          created_by: currentUser.id,
          user_count: 1
        }),
      });

      if (!response.ok) throw new Error(`Erreur HTTP! Statut: ${response.status}`);
      
      const newRoom: Room = await response.json();
      setRooms(prev => [newRoom, ...prev]);
      resetRoomForm();
      alert('Salle créée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la création de la salle:', error);
    }
  };

  const resetRoomForm = () => {
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomType('amitié');
    setIsCreatingRoom(false);
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'amitié': return <Users size={16} />;
      case 'emploi': return <Briefcase size={16} />;
      case 'marriage': return <Gem size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'amitié': return 'bg-blue-500/10 text-blue-600';
      case 'emploi': return 'bg-amber-500/10 text-amber-600';
      case 'marriage': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        room.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType ? room.type.toLowerCase() === selectedType.toLowerCase() : true;
    return matchesSearch && matchesType;
  });

  const roomTypes = [...new Set(rooms.map(room => room.type.toLowerCase()))].sort();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Communautés</h1>
                <p className="text-gray-500">Rejoignez des salles de discussion ou créez la vôtre</p>
              </div>
              <button
                onClick={() => setIsCreatingRoom(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
              >
                <Plus size={18} />
                <span>Créer une salle</span>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des salles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full md:w-auto"
                >
                  <span>{selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : 'Tous les types'}</span>
                  <ChevronDown size={16} className={`transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showTypeDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedType(null);
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${!selectedType ? 'bg-indigo-50 text-indigo-600' : ''}`}
                    >
                      Tous les types
                    </button>
                    {roomTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedType(type);
                          setShowTypeDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 ${selectedType === type ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      >
                        {getRoomTypeIcon(type)}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Room Creation Form */}
          {isCreatingRoom && (
            <div className="p-6 border-b border-gray-100 bg-indigo-50/50">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Nouvelle salle</h3>
                  <button
                    onClick={resetRoomForm}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la salle *</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Donnez un nom à votre salle"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Décrivez le thème de votre salle..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de salle</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['amitié', 'emploi', 'marriage', 'autre'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewRoomType(type)}
                          className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors
                            ${newRoomType === type 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
                              : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          {getRoomTypeIcon(type)}
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetRoomForm}
                      className="flex-1 bg-gray-100 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={createRoom}
                      className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Créer la salle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rooms List */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <MessageSquare className="w-14 h-14 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune salle trouvée</h3>
                <p className="text-gray-500 max-w-md">
                  {searchTerm || selectedType
                    ? "Aucune salle ne correspond à vos critères. Essayez de modifier votre recherche."
                    : "Il n'y a aucune salle disponible pour le moment. Soyez le premier à en créer une !"}
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/chat/${room.id}`)}
                  className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${getRoomTypeColor(room.type)}`}>
                      {getRoomTypeIcon(room.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 truncate">
                          {room.name}
                        </h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap mt-1">
                          {new Date(room.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {room.description || 'Aucune description fournie'}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${getRoomTypeColor(room.type)}`}>
                          {room.type.charAt(0).toUpperCase() + room.type.slice(1)}
                        </span>

                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          {room.participantCount ?? 0} membre{room.participantCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomList;