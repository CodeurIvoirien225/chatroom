import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, Phone, Video, MoreVertical, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  type: string;
  user_count: number;
}

interface ChatWindowProps {
  roomId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';


  useEffect(() => {
    if (roomId) {
      fetchRoom();
      fetchMessages();

      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoom = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms`);
      const data = await res.json();
      const currentRoom = data.find((r: Room) => r.id.toString() === roomId);
      setRoom(currentRoom);
    } catch (error) {
      console.error('Erreur lors du chargement de la salle :', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${roomId}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Erreur lors du chargement des messages :', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const profileRes = await fetch(`${API_BASE_URL}/profile/${user.id}`);
      const profileData = await profileRes.json();

      const messagePayload = {
        room_id: roomId,
        sender_id: user.id,
        sender_username: profileData.username || 'Anonyme',
        content: newMessage.trim(),
        created_at: new Date().toISOString()
      };

      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });

      if (!res.ok) throw new Error('Erreur lors de l\'envoi du message');

      setNewMessage('');
      fetchMessages(); // refresh après envoi
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message :', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: fr,
    });
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez une conversation</h3>
          <p className="text-gray-500">Choisissez une salle de chat pour commencer à discuter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
              {room.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{room.name}</h3>
              <p className="text-sm text-green-500">en ligne</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Phone className="w-5 h-5 text-gray-500" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Video className="w-5 h-5 text-gray-500" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Flag className="w-5 h-5 text-gray-500" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-center">
          <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isCurrentUser && (
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {message.sender_username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}>
                    {!isCurrentUser && (
                      <p className="text-xs font-medium mb-1 opacity-70">{message.sender_username}</p>
                    )}
                    <p className="break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message"
              className="w-full px-4 py-2 bg-gray-100 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Smile className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
