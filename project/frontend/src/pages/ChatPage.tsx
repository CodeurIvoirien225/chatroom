import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, MessageCircleMore, Check, Menu, ArrowLeft } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import Sidebar from '../components/Sidebar';

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
  is_online?: boolean;
  last_seen?: string;
}

const ChatPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRoomMember, setIsRoomMember] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';

  const [autoScroll, setAutoScroll] = useState(true);
  
  const checkMembership = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !roomId) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/membership/${user.id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Boolean(data.isMember);
    } catch (error) {
      console.error("Error checking room membership:", error);
      return false;
    }
  }, [user?.id, roomId]);

  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId}/online-participants?currentUserId=${user?.id || ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [roomId, user?.id]);

  const joinRoom = async () => {
    if (!user?.id || !roomId) return;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) throw new Error(await response.text());
      
      setIsRoomMember(true);
      fetchInitialData();
    } catch (error) {
      console.error('Erreur joinRoom:', error);
      setIsRoomMember(false);
      alert(error.message || 'Erreur inconnue');
    }
  };

  const fetchInitialData = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const isMember = await checkMembership();
      setIsRoomMember(isMember);

      const roomDetails = await fetch(`${API_BASE_URL}/rooms/${roomId}`).then(res => res.json());
      setRoom(roomDetails);

      if (isMember) {
        const [messagesData] = await Promise.all([
          fetch(`${API_BASE_URL}/rooms/${roomId}/messages`).then(res => res.json()),
        ]);
        setMessages(messagesData || []);
        await fetchParticipants();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId, checkMembership, fetchParticipants]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      setAutoScroll(isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    fetchInitialData();

    const interval = setInterval(() => {
      if (isRoomMember) {
        fetch(`${API_BASE_URL}/rooms/${roomId}/messages`)
          .then(res => res.json())
          .then(data => setMessages(data || []))
          .catch(console.error);

        fetchParticipants();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId, isRoomMember, fetchInitialData, fetchParticipants]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId || !isRoomMember) return;

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          sender_id: user.id,
          sender_username: user.username || 'Anonyme',
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      
      setNewMessage('');
      setAutoScroll(true);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !roomId || !isRoomMember) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Le fichier dépasse la limite de 50 Mo autorisée.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("media", file);
    formData.append("sender_id", user.id);
    formData.append("sender_username", user.username || 'Anonyme');
    formData.append("room_id", roomId);

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      setAutoScroll(true);
    } catch (error) {
      console.error("Media upload error:", error);
      alert(error.message || "Erreur lors de l'envoi du fichier");
    } finally {
      setIsUploading(false);
    }
  };

  const getProfileById = (id: string): Profile | undefined => {
    return participants.find(p => p.id === id);
  };

  const getAvatarFallback = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return "Maintenant";
      if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
      if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
      if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
      
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      console.error("Erreur de formatage:", e);
      return "À l'instant";
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Inconnu";
    return `Dernière activité: ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: fr })}`;
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      
      <div className={`bg-white border-r w-64 flex-shrink-0 absolute lg:relative z-20 h-full transition-all duration-300 ease-in-out
          ${showSidebar ? 'left-0' : '-left-64'} lg:left-0`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Participants ({participants.filter(p => p.is_online).length} en ligne)
          </h3>
          <Link to="/rooms" className="lg:hidden">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {isRoomMember === null ? (
            <div className="p-4 text-gray-500 text-sm">Chargement...</div>
          ) : isRoomMember === false && room?.type !== 'public' ? (
            <div className="p-4 text-gray-500 text-sm">
              Rejoignez la salle pour voir les participants.
            </div>
          ) : participants.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm">
              {user ? "Vous êtes le seul participant" : "Aucun participant"}
            </div>
          ) : (
            participants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="relative mr-3">
                  {participant.avatar_url ? (
                    <img
                      src={participant.avatar_url}
                      alt={`${participant.username}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                      {getAvatarFallback(participant.username)}
                    </div>
                  )}
                  <span 
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      participant.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}
                    title={participant.is_online ? "En ligne" : formatLastSeen(participant.last_seen)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {participant.username}
                    {participant.id === user?.id && " (Vous)"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {participant.is_online ? 
                      "En ligne maintenant" : 
                      formatLastSeen(participant.last_seen)
                    }
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50 border-l border-gray-100 overflow-hidden relative">
        <div className="p-4 border-b border-gray-100 flex items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
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
              {isRoomMember ? `${participants.filter(p => p.is_online).length} en ligne` : 'Non membre'}
            </p>
          </div>
        </div>

        <div 
          className="flex-1 p-4 pb-4 overflow-y-auto space-y-2"
          ref={messagesContainerRef}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : isRoomMember === false ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                <MessageCircleMore className="w-6 h-6 text-blue-400" />
              </div>
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
                    }`}
                  >
                    {!isCurrentUser && (
                      <Link
                        to={`/profile/${message.sender_id}`}
                        className="text-xs font-semibold mb-1 truncate hover:underline"
                      >
                        {message.sender_username}
                      </Link>
                    )}

                    {/\.(jpe?g|png|gif|webp)$/i.test(message.content) ? (
                      <img
                        src={message.content}
                        alt="Media"
                        className="max-w-xs rounded-md"
                      />
                    ) : /\.(mp4|webm|ogg)$/i.test(message.content) ? (
                      <video controls className="max-w-xs rounded-md">
                        <source src={message.content} />
                        Votre navigateur ne supporte pas la vidéo.
                      </video>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}

                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      <span 
                        className="text-xs text-gray-500 whitespace-nowrap"
                        title={new Date(message.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      >
                        {formatMessageDate(message.created_at)}
                      </span>
                      {isCurrentUser && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 sticky bottom-0">
          {isRoomMember === true ? (
            <form
              onSubmit={handleSendMessage}
              className="flex items-center bg-white rounded-full px-4 shadow-sm border border-gray-200 focus-within:border-blue-400 relative"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-xl"
              >
                😀
              </button>

              <label htmlFor="media-upload" className="cursor-pointer p-2 text-gray-500 hover:text-gray-700">
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-xs">Envoi...</span>
                  </div>
                ) : '📷'}
              </label>
              <input
                type="file"
                id="media-upload"
                accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.ogg,.mov"
                onChange={handleMediaUpload}
                className="hidden"
                disabled={isUploading}
              />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrire un message..."
                className="flex-1 py-3 bg-transparent focus:outline-none text-gray-700 placeholder-gray-400 text-sm"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={`ml-2 p-2 rounded-full ${
                  newMessage.trim() ? 'text-blue-500 hover:text-blue-600' : 'text-gray-300'
                }`}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          ) : isRoomMember === false ? (
            <button
              onClick={joinRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition-colors flex items-center justify-center"
            >
              <MessageCircleMore className="mr-2 h-4 w-4" />
              Rejoindre la salle
            </button>
          ) : (
            <div className="text-center text-gray-500 p-4">Chargement...</div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 z-50">
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => setNewMessage(prev => prev + emoji.native)}
                locale="fr"
                onClickOutside={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

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