import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, MessageCircleMore, Check, Menu, ArrowLeft } from 'lucide-react';
import { fr } from 'date-fns/locale';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import Sidebar from '../components/Sidebar';

// Interfaces pour la typographie
interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

interface RoomDetails {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

const ChatPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  // États du composant
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // null = état initial de chargement, true = membre, false = non membre
  const [isRoomMember, setIsRoomMember] = useState<boolean | null>(null);

  // Référence pour le défilement automatique des messages
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';

  
  // Fonction pour vérifier l'appartenance de l'utilisateur à la salle
  const checkMembership = async (): Promise<boolean> => {
    if (!user?.id || !roomId) {
      console.log("User or roomId missing for membership check.");
      return false;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/membership/${user.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Boolean(data.isMember);
    } catch (error) {
      console.error("Error checking room membership:", error);
      return false;
    }
  };

  // Rejoindre une salle
  const joinRoom = async () => {
    if (!user?.id || !roomId) {
      console.error("ID utilisateur ou salle manquant pour rejoindre.");
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')?.slice(0, 500)}`
      };

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Erreur serveur');
      }

      setIsRoomMember(true); // L'utilisateur est maintenant membre !
      fetchInitialData(); // Déclencher le rafraîchissement complet des données
      window.dispatchEvent(new CustomEvent('room-joined'));

    } catch (error: any) {
      console.error('Erreur joinRoom:', error);
      setIsRoomMember(false); // L'utilisateur n'a pas pu rejoindre

      if (error.message.includes('Failed to fetch')) {
        alert('Problème de connexion au serveur');
      } else {
        alert(error.message || 'Erreur inconnue');
      }
    }
  };

  // Récupérer les détails de la salle, les messages et les participants
  const fetchInitialData = async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const isMember = await checkMembership();
      setIsRoomMember(isMember); // Met à jour l'état de l'appartenance

      const roomDetails = await fetch(`${API_BASE_URL}/rooms/${roomId}`).then(res => res.json());
      setRoom(roomDetails);

      if (isMember) {
        const [messagesData, participantsData] = await Promise.all([
          fetch(`${API_BASE_URL}/rooms/${roomId}/messages`).then(res => res.json()),
          fetch(`${API_BASE_URL}/rooms/${roomId}/online-participants`).then(res => res.json()),
        ]);
        setMessages(messagesData || []);
        setParticipants(participantsData || []);
      } else {
        setMessages([]);
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setRoom(null);
      setMessages([]);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour le chargement initial et les polls de messages/présence
  useEffect(() => {
    fetchInitialData();

    let messagesPollingInterval: NodeJS.Timeout;
    let presenceInterval: NodeJS.Timeout;

    if (user && roomId && isRoomMember === true) {
      messagesPollingInterval = setInterval(() => {
        fetch(`${API_BASE_URL}/rooms/${roomId}/messages`)
          .then(res => res.json())
          .then(data => setMessages(data || []))
          .catch(console.error);
      }, 3000);

      const updatePresence = async () => {
        try {
          await fetch(`${API_BASE_URL}/rooms/${roomId}/presence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
          fetch(`${API_BASE_URL}/rooms/${roomId}/online-participants`)
            .then(res => res.json())
            .then(data => setParticipants(data || []))
            .catch(console.error);
        } catch (error) {
          console.error("Error updating presence:", error);
        }
      };

      updatePresence();
      presenceInterval = setInterval(updatePresence, 10000);
    }

    return () => {
      if (messagesPollingInterval) clearInterval(messagesPollingInterval);
      if (presenceInterval) clearInterval(presenceInterval);

      if (user && roomId && isRoomMember === true) {
        fetch(`${API_BASE_URL}/rooms/${roomId}/presence`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch(error => console.error("Error removing presence:", error));
      }
    };
  }, [roomId, user, isRoomMember]); // Ajouter isRoomMember aux dépendances


  // Gestion de l'envoi de message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId || !isRoomMember) return;

    try {
      const senderUsername = user.username || 'Anonyme';

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          sender_id: user.id,
          sender_username: senderUsername,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const sentMessage: Message = await response.json();
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again.");
    }
  };

  // Gestion de l'upload d'image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !roomId || !isRoomMember) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("sender_id", user.id);
    formData.append("sender_username", user.username || 'Anonyme');
    formData.append("room_id", roomId);

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error uploading image");

      const newMessage = await response.json();
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Error uploading image.");
    }
  };

  // Récupérer le profil d'un participant par ID
  const getProfileById = (id: string): Profile | undefined => {
    return participants.find(p => p.id === id);
  };

  // Fallback pour l'avatar (première lettre du nom)
  const getAvatarFallback = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar de navigation principale (généralement fixe) */}
      <Sidebar />

      {/* Sidebar des participants (révélation conditionnelle pour mobile) */}
      {/* Modification ici : suppression de lg:left-64 */}
      <div
        className={`bg-white border-r w-64 flex-shrink-0 absolute lg:relative z-20 h-full transition-all duration-300 ease-in-out
          ${showSidebar ? 'left-50' : '-left-50'} lg:ml-0`} 
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Participants actuellement en ligne ({participants.length})
          </h3>
          {/* Bouton de retour visible uniquement sur mobile */}
          <Link to="/rooms" className="lg:hidden">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {/* Afficher les participants seulement si l'utilisateur est membre OU si c'est un type de salle publique */}
          {isRoomMember === null ? ( // Chargement
            <div className="p-4 text-gray-500 text-sm">Chargement des participants...</div>
          ) : isRoomMember === false && room?.type !== 'public' ? ( // Non membre et salle non publique
            <div className="p-4 text-gray-500 text-sm">
              Rejoignez la salle pour voir les participants.
            </div>
          ) : participants.length === 0 ? ( // Membre ou salle publique, mais aucun participant
            <div className="p-4 text-gray-500 text-sm">
              Aucun participant actuellement
            </div>
          ) : ( // Membre ou salle publique, avec participants
            participants.map(participant => (
              <Link
                key={participant.id}
                to={`/profile/${participant.id}`}
                className="block p-3 flex items-center hover:bg-gray-50 transition-colors"
              >
                {participant.avatar_url ? (
                  <img
                    src={participant.avatar_url}
                    alt={`${participant.username} avatar`}
                    className="w-8 h-8 rounded-full object-cover mr-3"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold mr-3">
                    {getAvatarFallback(participant.username)}
                  </div>
                )}
                <span className="text-gray-700">{participant.username}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col bg-gray-50 border-l border-gray-100 overflow-hidden relative">
        {/* En-tête du chat */}
        <div className="p-4 border-b border-gray-100 flex items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          {/* Bouton pour afficher/masquer la sidebar sur mobile */}
          <button
            className="lg:hidden mr-2 p-1 rounded-md hover:bg-gray-200"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="ml-2">
            <h3 className="font-medium text-gray-900">
              {room?.name || 'Loading...'}
            </h3>
            <p className="text-xs text-gray-500 font-light">
              {isRoomMember !== null && user ?
                isRoomMember ? `${participants.length} participant(s) en ligne` : 'Non membre de cette salle'
                : 'Chargement...'}
            </p>
          </div>
        </div>

        {/* Zone des messages */}
        <div className="flex-1 p-4 pb-4 overflow-y-auto space-y-2 bg-[url('https://example.com/background-pattern.png')] bg-opacity-5 bg-cover">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : isRoomMember === false ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                <MessageCircleMore className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-800">
                Vous n'êtes pas membre de cette salle.
              </h4>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                Rejoignez la salle pour pouvoir voir les messages et participer à la conversation !
              </p>
              <button
                onClick={joinRoom}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition-colors flex items-center"
              >
                <MessageCircleMore className="mr-2 h-4 w-4" />
                Rejoindre la salle
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                <MessageCircleMore className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-800">Pas encore de messages</h4>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                Soyez le premier à démarrer la conversation dans cette salle !
              </p>
            </div>
          ) : (
            messages.map(message => {
              const isCurrentUser = message.sender_id === user?.id;
              const senderProfile = getProfileById(message.sender_id);

              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCurrentUser && (
                    <Link
                      to={`/profile/${message.sender_id}`}
                      className="flex-shrink-0 mr-2 hover:opacity-80 transition-opacity"
                    >
                      {senderProfile?.avatar_url ? (
                        <img
                          src={senderProfile.avatar_url}
                          alt={message.sender_username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          {getAvatarFallback(message.sender_username)}
                        </div>
                      )}
                    </Link>
                  )}

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none shadow-xs border border-gray-100'
                    } transition-all duration-200`}
                  >
                    {!isCurrentUser && (
                      <Link
                        to={`/profile/${message.sender_id}`}
                        className="text-xs font-semibold mb-1 truncate hover:underline hover:text-blue-600 transition-colors"
                      >
                        {message.sender_username}
                      </Link>
                    )}

                    {/\.(jpe?g|png|gif|webp)$/i.test(message.content) ? (
                      <img
                        src={message.content}
                        alt="Sent image"
                        className="max-w-xs rounded-md"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}

                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      <span className="text-xs">
                        {message.created_at
                          ? formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                          : 'Unknown date'}
                      </span>
                      {isCurrentUser && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Ancre pour le défilement automatique vers le bas */}
          <div ref={messagesEndRef} />
        </div>

        {/* Barre de saisie de messages ou bouton de rejoignage (conditionné) */}
        <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 z-30">
          {/* CONDITIONNELLEMENT AFFICHER LA BARRE DE SAISIE OU LE BOUTON REJOINDRE */}
          {isRoomMember === true ? ( // Si l'utilisateur est membre
            <form
              onSubmit={handleSendMessage}
              className="flex items-center bg-white rounded-full px-4 shadow-sm border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200 max-w-4xl mx-auto"
            >
              {/* Bouton pour le sélecteur d'émojis */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-xl hover:bg-gray-100 rounded-full"
              >
                😀
              </button>

              {/* Input masqué pour le téléchargement d'image */}
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer p-2 text-gray-500 hover:text-gray-700">
                📷
              </label>

              {/* Champ de saisie */}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrire un message..."
                className="flex-1 py-3 bg-transparent focus:outline-none text-gray-700 placeholder-gray-400 text-sm"
                disabled={loading || !user || !isRoomMember}
              />

              {/* Bouton d'envoi */}
              <button
                type="submit"
                disabled={!newMessage.trim() || loading || !user || !isRoomMember}
                className={`ml-2 p-2 rounded-full transition-all ${
                  newMessage.trim()
                    ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          ) : isRoomMember === false ? ( // Si l'utilisateur n'est PAS membre
            <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="text-blue-800 text-center">
                <p className="font-medium">Vous n'êtes pas membre de cette salle</p>
                <p className="text-sm">Rejoignez-la pour pouvoir participer</p>
              </div>
              <button
                onClick={joinRoom}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition-colors flex items-center"
              >
                <MessageCircleMore className="mr-2 h-4 w-4" />
                Rejoindre la salle
              </button>
            </div>
          ) : ( // État initial de chargement
            <div className="text-center text-gray-500 p-4">Chargement des permissions...</div>
          )}

          {/* Picker d'émojis (affichage conditionnel et seulement si membre) */}
          {showEmojiPicker && isRoomMember && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 lg:left-0 lg:translate-x-0">
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => setNewMessage((prev) => prev + emoji.native)}
                locale="fr"
                onClickOutside={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Overlay pour le sidebar mobile (pour fermer en cliquant à l'extérieur) */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;