import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Edit3 } from 'lucide-react';
// import { supabase } from '../lib/supabaseClient'; // SUPPRIMÉ
import { useAuth } from '../context/AuthContext'; // Gardé

interface Room {
  id: string; // L'ID de MySQL sera probablement un nombre (int), mais peut être string côté client si UUID
  name: string;
  description: string;
  type: 'amitié' | 'emploi' | 'marriage' | 'casual'; // Ajout de 'casual' et 'emploi' en minuscule pour cohérence
  user_count: number;
  created_at: string;
  // Si vous voulez vérifier qui a créé la salle (pour la modifier/supprimer)
  created_by_user_id?: number; // Assurez-vous que ce champ existe dans votre BDD et est renvoyé par l'API
}

interface RoomManagerProps {
  onClose: () => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ onClose }) => {
  const { user: currentUser } = useAuth(); // Renommé 'user' en 'currentUser' pour la clarté
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';


  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'amitié' as const // Valeur par défaut plus cohérente
  });

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté avant de charger les salles, si nécessaire
    // Si la liste des salles est publique, pas besoin de cette vérification.
    // Cependant, pour la gestion (création/édition/suppression), l'utilisateur doit être authentifié.
    if (!currentUser) {
        // Optionnel: Rediriger ou afficher un message si non connecté
        // navigate('/login');
        setLoading(false);
        return;
    }
    fetchRooms();
  }, [currentUser]); // Ajout de currentUser comme dépendance pour recharger si l'état d'authentification change

  // --- Fonctions API CRUD pour MySQL ---

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`); // Point de terminaison pour récupérer toutes les salles
      if (!response.ok) {
        throw new Error(`Erreur HTTP! Statut: ${response.status}`);
      }
      const data: Room[] = await response.json();
      setRooms(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des salles :', error);
      alert('Impossible de charger les salles.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !currentUser.id) {
        alert("Vous devez être connecté pour créer une salle.");
        return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, { // Point de terminaison POST pour créer une salle
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, // INCLUEZ VOTRE TOKEN ICI SI VOUS EN UTILISEZ UN
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          created_by: currentUser.id, // L'ID de l'utilisateur qui crée la salle
          // user_count sera 0 par défaut côté backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP! Statut: ${response.status}`);
      }

      const newRoom: Room = await response.json(); // Le backend devrait retourner la salle nouvellement créée (avec l'ID)
      setRooms(prev => [newRoom, ...prev]);
      setFormData({ name: '', description: '', type: 'amitié' });
      setShowCreateForm(false);
      
      alert('Salle créée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la création de la salle :', error);
      alert(`Erreur lors de la création de la salle: ${error.message || 'Veuillez réessayer.'}`);
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRoom) return;
    if (!currentUser || !currentUser.id) {
        alert("Vous devez être connecté pour modifier une salle.");
        return;
    }
    // OPTIONNEL : Vérifier si l'utilisateur est bien le créateur de la salle
    // if (editingRoom.created_by_user_id !== currentUser.id) {
    //     alert("Vous n'êtes pas autorisé à modifier cette salle.");
    //     return;
    // }

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${editingRoom.id}`, { // Point de terminaison PUT pour mettre à jour une salle
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, // INCLUEZ VOTRE TOKEN ICI SI VOUS EN UTILISEZ UN
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          // Vous pouvez envoyer l'ID du créateur si votre backend en a besoin pour la validation
          created_by: currentUser.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP! Statut: ${response.status}`);
      }

      const updatedRoom: Room = await response.json(); // Le backend devrait retourner la salle mise à jour
      setRooms(prev => prev.map(room => 
        room.id === updatedRoom.id ? updatedRoom : room
      ));
      
      setEditingRoom(null);
      setFormData({ name: '', description: '', type: 'amitié' }); // Réinitialiser à une valeur par défaut cohérente
      setShowCreateForm(false); // Fermer le formulaire après la mise à jour
      
      alert('Salle mise à jour avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de la salle :', error);
      alert(`Erreur lors de la mise à jour de la salle: ${error.message || 'Veuillez réessayer.'}`);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) return;
    if (!currentUser || !currentUser.id) {
        alert("Vous devez être connecté pour supprimer une salle.");
        return;
    }

    // OPTIONNEL : Vous pourriez vouloir vérifier côté frontend si l'utilisateur actuel
    // a le droit de supprimer cette salle AVANT d'appeler le backend.
    // Cela nécessiterait de retrouver la salle dans 'rooms' et de comparer 'created_by_user_id'
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (roomToDelete && roomToDelete.created_by_user_id !== currentUser.id) {
         alert("Vous n'êtes pas autorisé à supprimer cette salle.");
         return;
    }


    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, { // Point de terminaison DELETE pour supprimer une salle
        method: 'DELETE',
        headers: {
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, // INCLUEZ VOTRE TOKEN ICI SI VOUS EN UTILISEZ UN
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP! Statut: ${response.status}`);
      }

      setRooms(prev => prev.filter(room => room.id !== roomId));
      alert('Salle supprimée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la salle :', error);
      alert(`Erreur lors de la suppression de la salle: ${error.message || 'Veuillez réessayer.'}`);
    }
  };

  const startEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description,
      type: room.type // Assurez-vous que le type de la salle correspond aux options du formulaire
    });
    setShowCreateForm(true); // Ouvre le formulaire en mode édition
  };

  const cancelEdit = () => {
    setEditingRoom(null);
    setFormData({ name: '', description: '', type: 'amitié' }); // Réinitialiser le formulaire
    setShowCreateForm(false); // Ferme le formulaire
  };

  // Les fonctions de style sont inchangées, mais j'ai corrigé 'Amitié' en 'amitié'
  const getRoomTypeColor = (type: string) => {
    switch (type.toLowerCase()) { // Utiliser toLowerCase pour la robustesse
      case 'amitié': return 'bg-blue-500';
      case 'emploi': return 'bg-yellow-500'; // Corrigé de 'casual' à 'emploi' si c'est l'intention
      case 'marriage': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoomTypeEmoji = (type: string) => {
    switch (type.toLowerCase()) { // Utiliser toLowerCase pour la robustesse
      case 'amitié': return '👥';
      case 'emploi': return '☕'; // Corrigé de 'Emploi' à 'emploi' et emoji pour consistance
      case 'marriage': return '💍';
      default: return '💬';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Salles</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setShowCreateForm(true); setEditingRoom(null); setFormData({ name: '', description: '', type: 'amitié' }); }} // Réinitialise le formulaire pour la création
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Salle
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Room List */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full ${getRoomTypeColor(room.type)} flex items-center justify-center text-white text-lg mr-3`}>
                          {getRoomTypeEmoji(room.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{room.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{room.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {/* Affichez les boutons d'édition/suppression uniquement si l'utilisateur est le créateur de la salle */}
                        {currentUser && room.created_by_user_id === currentUser.id && (
                          <>
                            <button
                              onClick={() => startEdit(room)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{room.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {room.user_count} utilisateurs
                      </div>
                      <span className="text-gray-400">
                        {new Date(room.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="w-80 border-l border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingRoom ? 'Modifier la Salle' : 'Créer une Nouvelle Salle'}
              </h3>
              
              <form onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la salle
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Salon des Amis"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez le but de cette salle..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de salle
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'amitié' | 'emploi' | 'marriage' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="amitié">👥 Amitié</option>
                    <option value="emploi">👩‍💼👨‍💼 Emploi</option>
                    <option value="marriage">💍 Mariage</option>
                    {/* <option value="casual">☕ Discussion Libre</option> // Si vous voulez l'ajouter */}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    {editingRoom ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomManager;