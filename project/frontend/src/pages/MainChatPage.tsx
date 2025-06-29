import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import UserProfile from '../components/UserProfile';

const MainChatPage = () => {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showUserProfile, setShowUserProfile] = useState(false);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  const handleCloseProfile = () => {
    setShowUserProfile(false);
    setSelectedUserId('');
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Conversation List */}
      <ConversationList 
        onRoomSelect={handleRoomSelect}
        selectedRoomId={selectedRoomId}
      />
      
      {/* Chat Window */}
      <ChatWindow roomId={selectedRoomId} />
      
      {/* User Profile Panel */}
      {showUserProfile && selectedUserId && (
        <UserProfile 
          userId={selectedUserId}
          onClose={handleCloseProfile}
        />
      )}
    </div>
  );
};

export default MainChatPage;