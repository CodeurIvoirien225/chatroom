import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircleMore, Check } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface PrivateChatProps {
  currentUserId: number;
  otherUserId: number;
}

interface Message {
  id: string;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  is_read: number;
}

interface OtherUserProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ currentUserId, otherUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [otherUserProfile, setOtherUserProfile] = useState<OtherUserProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OtherUserProfile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';

  const fetchOtherUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${otherUserId}?current_user_id=${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch other user profile');
      const data = await response.json();
      setOtherUserProfile(data);
    } catch (error) {
      console.error('Error fetching other user profile:', error);
    }
  }, [otherUserId, currentUserId]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/online-users?exclude=${currentUserId}`);
      const data = await res.json();
      setOnlineUsers(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs en ligne :", error);
    }
  }, [currentUserId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/private-messages/${currentUserId}/${otherUserId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data: Message[] = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [currentUserId, otherUserId]);

  const markMessagesAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/private-messages/mark-as-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: otherUserId, receiverId: currentUserId }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors du marquage des messages comme lus :', errorText);
      } else {
        console.log('Messages marqués comme lus.');
      }
    } catch (error) {
      console.error('Erreur réseau lors du marquage des messages comme lus :', error);
    }
  }, [currentUserId, otherUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageContent.trim() === '') return;

    try {
      const response = await fetch(`${API_BASE_URL}/private-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: newMessageContent.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setNewMessageContent('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier côté frontend
    const maxSize = 50 * 1024 * 1024; // 50 Mo
    if (file.size > maxSize) {
      alert('Le fichier dépasse la limite de 50 Mo autorisée.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('sender_id', String(currentUserId));
    formData.append('receiver_id', String(otherUserId));

    try {
      const res = await fetch(`${API_BASE_URL}/private-messages/upload-media`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (errorText.includes('File too large')) {
          alert('Erreur : Le fichier est trop volumineux (max 50 Mo).');
        } else {
          alert("Erreur lors de l'envoi du fichier : " + errorText);
        }
        throw new Error(errorText);
      }

      fetchMessages();
    } catch (err) {
      console.error("Erreur lors de l'envoi du fichier média :", err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const fetchData = () => {
      fetchOtherUserProfile();
      fetchMessages();
      markMessagesAsRead();
      fetchOnlineUsers();
    };
    fetchData();
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [fetchMessages, fetchOtherUserProfile, markMessagesAsRead, fetchOnlineUsers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAvatarFallback = (profile: OtherUserProfile | null) => {
    const name = profile?.first_name || profile?.username || 'U';
    return name.charAt(0)?.toUpperCase() || 'U';
  };

  const isOtherUserOnline = onlineUsers.some(u => u.id === otherUserId);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gray-50 border-l border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
              {otherUserProfile?.avatar_url ? (
                <img
                  src={otherUserProfile.avatar_url}
                  alt={`${otherUserProfile.username}'s avatar`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${getAvatarFallback(otherUserProfile)}&background=random`;
                  }}
                />
              ) : (
                <span className="text-blue-600 font-medium">
                  {getAvatarFallback(otherUserProfile)}
                </span>
              )}
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${isOtherUserOnline ? 'bg-green-400' : 'bg-gray-400'}`}></span>
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-gray-900">
              {otherUserProfile?.first_name || otherUserProfile?.username || '...'}
            </h3>
            <p className="text-xs text-gray-500 font-light">
              {isOtherUserOnline ? 'Actuellement en ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-opacity-5 bg-cover">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                <MessageCircleMore className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-800">Pas encore de messages</h4>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                Envoyez votre premier message à {otherUserProfile?.first_name || 'cet utilisateur'} pour commencer la conversation
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl ${message.sender_id === currentUserId ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none shadow-xs border border-gray-100'} transition-all duration-200`}>
                  {/\.(jpe?g|png|gif|webp)$/i.test(message.content) ? (
                    <img src={message.content} alt="Image envoyée" className="max-w-xs rounded-md" />
                  ) : /\.(mp4|webm|ogg)$/i.test(message.content) ? (
                    <video controls className="max-w-xs rounded-md">
                      <source src={message.content} />
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                  <div className={`flex items-center justify-end mt-1 space-x-1 ${message.sender_id === currentUserId ? 'text-blue-100' : 'text-gray-400'}`}>
                    <span className="text-xs">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.sender_id === currentUserId && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm p-4 border-t border-gray-100">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center bg-white rounded-full px-4 shadow-sm border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200 relative"
          >
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2">
              😀
            </button>
            
            <label htmlFor="private-image-upload" className="cursor-pointer p-2 relative">
              {isUploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-xs text-gray-500">Envoi...</span>
                </div>
              ) : (
                '📷'
              )}
            </label>
            <input
              type="file"
              id="private-image-upload"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
              disabled={isUploading}
            />

            <input
              type="text"
              value={newMessageContent}
              onChange={e => setNewMessageContent(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 py-3 bg-transparent focus:outline-none text-gray-700 placeholder-gray-400 text-sm"
            />
            <button
              type="submit"
              disabled={!newMessageContent.trim()}
              className={`ml-2 p-2 rounded-full transition-all ${newMessageContent.trim() ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              <Send className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 z-50">
                <Picker
                  data={data}
                  onEmojiSelect={emoji => setNewMessageContent(prev => prev + emoji.native)}
                  locale="fr"
                />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;