import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Ajuste le chemin si besoin

interface QuickRoomCreatorProps {
  onRoomCreated: () => void;
}

const QuickRoomCreator: React.FC<QuickRoomCreatorProps> = ({ onRoomCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const API_BASE_URL = 'http://localhost:3001';


  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'amitié' as const
  });

  const predefinedRooms = [
    {
      name: 'Salon des Amis',
      description: 'Trouvez de nouveaux amis et partagez vos passions',
      type: 'amitié' as const,
      emoji: '👥'
    },
    {
      name: 'Emploi',
      description: "Rencontrez des personnes pour de l'emploi",
      type: 'emploi' as const,
      emoji: '💼'
    },
    {
      name: 'Discussion Libre',
      description: 'Conversations décontractées sur tous les sujets',
      type: 'amitié' as const,
      emoji: '☕'
    },
    {
      name: 'Intentions Sérieuses',
      description: 'Pour ceux qui cherchent une relation durable',
      type: 'marriage' as const,
      emoji: '💍'
    }
  ];

  const handleCreateRoom = async (roomData: { name: string; description: string; type: string }) => {
    setLoading(true);

    if (!currentUser || !currentUser.id) {
      alert("Vous devez être connecté pour créer une salle.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomData.name,
          description: roomData.description,
          type: roomData.type,
          created_by: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP ! Statut : ${response.status}`);
      }

      alert('Salle créée avec succès !');
      onRoomCreated();
      setIsOpen(false);
      setFormData({ name: '', description: '', type: 'amitié' });
    } catch (error: any) {
      console.error("Erreur lors de la création de la salle :", error);
      alert(`Erreur lors de la création de la salle : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateRoom(formData);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center"
      >
        <Plus className="w-5 h-5 mr-2" />
        Créer une nouvelle salle
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Créer une salle</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Salles prédéfinies */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Salles prédéfinies</h4>
        <div className="grid grid-cols-2 gap-2">
          {predefinedRooms.map((room, index) => (
            <button
              key={index}
              onClick={() => handleCreateRoom(room)}
              disabled={loading}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="text-lg mb-1">{room.emoji}</div>
              <div className="text-sm font-medium text-gray-900">{room.name}</div>
              <div className="text-xs text-gray-500">{room.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire de salle personnalisée */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Salle personnalisée</h4>
        <form onSubmit={handleCustomSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Nom de la salle"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as 'amitié' | 'emploi' | 'marriage' })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="amitié">👥 Amitié</option>
            <option value="emploi">💼 Emploi</option>
            <option value="marriage">💍 Mariage</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Création...' : 'Créer la salle'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuickRoomCreator;
