import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // pour accéder à la base de données
import { useAuth } from '../context/AuthContext'; // pour obtenir l’utilisateur connecté
import { Users, Heart, Coffee, Ring, Search } from 'lucide-react';  // pour afficher des icônes
import NavBar from '../components/NavBar';

interface Room {
  id: string;
  name: string;
  description: string;
  type: 'amitié' | 'emploi' | 'marriage';
  user_count: number;  // nombre de personnes en ligne dans la salle
}

const RoomsPage = () => {
  const { user } = useAuth(); // utilisateur connecté
  const [rooms, setRooms] = useState<Room[]>([]);  // toutes les salles
  const [loading, setLoading] = useState(true);  // est-ce qu'on attend les données ?
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quand la page se charge, on va chercher toutes les salles dans Supabase.
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*');
        
        if (error) throw error;
        
        setRooms(data || []);
      } catch (error) {
        console.error('Erreur lors de la récupération des salles:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
    
    //Configurer un abonnement en temps réel aux mises à jour de la salle 
    // Supabase envoie une notification automatiquement dès qu’une salle est ajoutée, modifiée ou supprimée
    const roomSubscription = supabase
      .channel('rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRooms(prev => [...prev, payload.new as Room]);
        } else if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(room => 
            room.id === payload.new.id ? { ...room, ...payload.new } : room
          ));
        } else if (payload.eventType === 'DELETE') {
          setRooms(prev => prev.filter(room => room.id !== payload.old.id));
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(roomSubscription);
    };
  }, []);

  
  /*
  Chaque type de salle a :

Une icône différente,

Une couleur de fond et de bordure différente. 
   */

  //  Icônes et couleurs selon le type de salle
  const getRoomIcon = (type: string) => {
    switch(type) {
      case 'amitié':
        return <Users className="h-5 w-5 text-blue-500" />;
      
      case 'emploi':
        return <Coffee className="h-5 w-5 text-yellow-500" />;
      case 'marriage':
        return <Ring className="h-5 w-5 text-purple-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getRoomColor = (type: string) => {
    switch(type) {
      case 'amitié':
        return 'bg-blue-50 border-blue-200';
      
      case 'emploi':
        return 'bg-yellow-50 border-yellow-200';
      case 'marriage':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chat Rooms</h1>
          <p className="text-gray-600">
          Choisissez une salle qui correspond à vos intérêts et commencez à discuter !
          </p>
        </div>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Rechercher des salles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className={`block p-6 rounded-lg border ${getRoomColor(room.type)} hover:shadow-md transition duration-300`}
                >
                  <div className="flex items-center mb-3">
                    <div className="p-2 rounded-full bg-white mr-3">
                      {getRoomIcon(room.type)}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">{room.name}</h2>
                  </div>
                  <p className="text-gray-600 mb-4">{room.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {room.user_count} {room.user_count === 1 ? 'user' : 'users'} en ligne
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Rejoindre
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-gray-500">Aucune chambre trouvée correspondant à votre recherche.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default RoomsPage;