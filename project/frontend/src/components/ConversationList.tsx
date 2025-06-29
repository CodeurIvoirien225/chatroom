import React, { useState, useEffect, useCallback } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce'; // Pour éviter des requêtes trop fréquentes 

// Interfaces existantes
interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string; // L'autre participant's user_id
  user_id: string; 
  last_message: string;
  last_message_at: string;
  unread_count: number;
  profile: Profile;
}

const ConversationList: React.FC = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]); // Gardé pour l'affichage "En ligne" séparé
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]); // NOUVEL ÉTAT pour les résultats de recherche d'utilisateurs
  const [isSearchingUsers, setIsSearchingUsers] = useState(false); // Pour savoir si on est en mode recherche d'utilisateurs
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3001';


  // ... (fetchOnlineStatus existante - pas de changement majeur ici)
  const fetchOnlineStatus = useCallback(async () => {
    console.log('[fetchOnlineStatus] Appelé');
    if (!user?.id) {
      console.warn('[fetchOnlineStatus] Aucun user ID trouvé. Annulation.');
      setOnlineUsers([]);
      return;
    }
    console.log(`[fetchOnlineStatus] Requête envoyée à : ${API_BASE_URL}/online-users?exclude=${user.id}`);
    try {
      const res = await fetch(`${API_BASE_URL}/online-users?exclude=${user.id}`);
      console.log('[fetchOnlineStatus] Statut de la réponse :', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[fetchOnlineStatus] Erreur serveur :', errorText);
        throw new Error('Erreur fetch online users');
      }
      const data: Profile[] = await res.json();
      console.log('[fetchOnlineStatus] Utilisateurs en ligne reçus :', data);
      setOnlineUsers(data);
    } catch (error) {
      console.error('[fetchOnlineStatus] Exception attrapée :', error);
      setOnlineUsers([]);
    }
  }, [user?.id]);


  // ... (fetchConversations existante - pas de changement majeur ici)
  const fetchConversations = useCallback(async () => {
    console.log('[fetchConversations] Appelé');
    if (!user?.id) {
      console.warn('[fetchConversations] Aucun user ID trouvé. Annulation.');
      setConversations([]);
      return;
    }
    try {
      console.log(`[fetchConversations] Requête envoyée à : ${API_BASE_URL}/private-conversations/${user.id}`);
      const res = await fetch(`${API_BASE_URL}/private-conversations/${user.id}`);

      console.log('[fetchConversations] Statut de la réponse :', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[fetchConversations] Erreur serveur :', errorText);
        throw new Error('Erreur fetch conversations');
      }
      const data: Conversation[] = await res.json();
      console.log('[fetchConversations] Conversations reçues :', data);
      setConversations(data);
    } catch (error) {
      console.error('Erreur fetchConversations:', error);
      setConversations([]);
    }
  }, [user?.id]);

  // NOUVELLE FONCTION : Rechercher des utilisateurs
  const searchUsers = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        setIsSearchingUsers(false);
        return;
      }
      if (!user?.id) return; // Ne pas rechercher si pas d'utilisateur connecté

      setIsSearchingUsers(true);
      console.log(`[searchUsers] Recherche d'utilisateurs pour: "${term}"`);
      try {
        const res = await fetch(`${API_BASE_URL}/users/search?term=${encodeURIComponent(term)}&excludeUserId=${user.id}`);
        if (!res.ok) {
          throw new Error('Erreur lors de la recherche d\'utilisateurs');
        }
        const data: Profile[] = await res.json();
        console.log('[searchUsers] Résultats :', data);
        setSearchResults(data);
      } catch (error) {
        console.error('[searchUsers] Erreur lors de la recherche :', error);
        setSearchResults([]);
      } finally {
        // Optionnel: setIsSearchingUsers(false); si tu veux le désactiver après la fin de la recherche
      }
    }, 300), // Debounce de 300ms pour ne pas spammer l'API
    [user?.id]
  );

  // Gérer le changement de la barre de recherche
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim().length > 0) {
      setIsSearchingUsers(true); // Activer le mode recherche d'utilisateurs
      searchUsers(term);
    } else {
      setIsSearchingUsers(false); // Désactiver le mode recherche
      setSearchResults([]); // Effacer les résultats
    }
  };


  useEffect(() => {
    fetchOnlineStatus();
    fetchConversations();

    // Rafraîchir les données toutes les 15 secondes pour les mises à jour en temps quasi réel
    const intervalId = setInterval(() => {
      fetchOnlineStatus();
      fetchConversations();
    }, 15000); // 15 secondes

    return () => {
      clearInterval(intervalId);
      searchUsers.cancel(); // Annuler toute recherche en cours si le composant est démonté
    };
  }, [fetchOnlineStatus, fetchConversations, searchUsers]);

  // ... (formatTime existante)
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return `Aujourd'hui • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (
      date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()
    ) {
      return `Hier • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };


  // PAS BESOIN DE filteredConversations ici car la recherche est globale
  // const filteredConversations = conversations.filter(conv => {
  //   const name = conv.profile.first_name || conv.profile.username || '';
  //   return name.toLowerCase().includes(searchTerm.toLowerCase());
  // });


  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher des utilisateurs ou des conversations..."
            value={searchTerm}
            onChange={handleSearchChange} // Utiliser la nouvelle fonction de gestion de la recherche
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Condition pour afficher les résultats de recherche ou les sections normales */}
      {isSearchingUsers && searchTerm.length > 0 ? (
        // --- Affichage des résultats de recherche d'utilisateurs ---
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-600 px-4 pt-4 mb-3">
            Résultats de recherche
          </h3>
          {searchResults.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Aucun utilisateur trouvé.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {searchResults.map((userResult) => (
                <button
                  key={userResult.id}
                  onClick={() => navigate(`/private-messages/${userResult.id}`)}
                  className="w-full px-4 py-3 hover:bg-gray-50 text-left flex items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3">
                    {userResult.avatar_url ? (
                      <img
                        src={userResult.avatar_url}
                        alt={`Avatar de ${userResult.username}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://ui-avatars.com/api/?name=${userResult.first_name || userResult.username || 'U'}&background=random`;
                        }}
                      />
                    ) : (
                      <span className="text-white bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center">
                        {userResult.first_name?.charAt(0)?.toUpperCase() ||
                          userResult.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {userResult.first_name || userResult.username}
                    </h4>
                    <p className="text-xs text-gray-500">Nouvelle conversation</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // --- Affichage normal (Utilisateurs en ligne + Conversations) ---
        <>
          {/* Section Utilisateurs en ligne */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-3">
              En ligne
            </h3>

            {onlineUsers.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">
                  Aucun utilisateur en ligne
                </p>
              </div>
            ) : (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {onlineUsers.map((onlineUser) => (
                  <button
                    key={onlineUser.id}
                    onClick={() => navigate(`/profile/${onlineUser.id}`)} // Ou directement au chat si tu préfères
                    className="flex flex-col items-center space-y-1 min-w-max"
                    title={`Voir le profil de ${onlineUser.first_name || onlineUser.username}`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {onlineUser.avatar_url ? (
                          <img
                            src={onlineUser.avatar_url}
                            alt={`Avatar de ${onlineUser.username}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://ui-avatars.com/api/?name=${onlineUser.first_name || onlineUser.username || 'U'}&background=random`;
                            }}
                          />
                        ) : (
                          <span className="text-white bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center">
                            {onlineUser.first_name?.charAt(0)?.toUpperCase() ||
                              onlineUser.username?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"></div>
                    </div>
                    <span className="text-xs text-gray-600 truncate max-w-[60px]">
                      {onlineUser.first_name || onlineUser.username || 'Utilisateur'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section Conversations */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-600 px-4 pt-4 mb-3">
              Conversations
            </h3>
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Aucune conversation récente
                </p>
                {/* Le bouton "Nouveau message" n'est plus aussi pertinent ici car la recherche est pour ça */}
                {/* <button
                  onClick={() => navigate('/new-message')} // Adapte cette route si besoin
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Nouveau message
                </button> */}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => navigate(`/private-messages/${conversation.user_id}`)}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-left flex items-center"
                  >
                    <div className="relative mr-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {conversation.profile.avatar_url ? (
                          <img
                            src={conversation.profile.avatar_url}
                            alt={`Avatar de ${conversation.profile.username}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://ui-avatars.com/api/?name=${conversation.profile.first_name || conversation.profile.username || 'U'}&background=random`;
                            }}
                          />
                        ) : (
                          <span className="text-white bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center">
                            {conversation.profile.first_name?.charAt(0)?.toUpperCase() ||
                              conversation.profile.username?.charAt(0)?.toUpperCase() ||
                              'U'}
                          </span>
                        )}
                      </div>
                      {onlineUsers.some(u => u.id === conversation.profile.id) && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.profile.first_name || conversation.profile.username}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.last_message}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="ml-2 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationList;