import React from 'react';
import { useParams } from 'react-router-dom';
import PrivateChat from './PrivateChat'; // Assure-toi que le chemin est correct

const PrivateChatWrapper: React.FC = () => {
  const { receiverId } = useParams<{ receiverId: string }>();

  const storedUserId = localStorage.getItem('userId');
  const currentUserId = storedUserId ? Number(storedUserId) : null; 

  // Messages de diagnostic pour t'aider à débugger rapidement
  console.log('PrivateChatWrapper - Diagnostic:');
  console.log('  receiverId (from URL):', receiverId);
  console.log('  currentUserId (from localStorage):', currentUserId);
  console.log('  Type of currentUserId:', typeof currentUserId);
  console.log('  Is currentUserId NaN?', currentUserId !== null && isNaN(currentUserId));


  if (!receiverId || isNaN(Number(receiverId)) || !currentUserId || isNaN(currentUserId)) {
    let errorMessage = "Erreur: ";
    if (!receiverId || isNaN(Number(receiverId))) {
      errorMessage += "ID du destinataire manquant ou invalide dans l'URL. ";
    }
    if (!currentUserId || isNaN(currentUserId)) {
      errorMessage += "ID de l'utilisateur courant manquant ou invalide (vérifier localStorage 'userId').";
    }
    return <div className="text-red-600 text-center p-4 bg-red-100 border border-red-400 rounded-md mx-auto my-10 max-w-lg">{errorMessage}</div>;
  }

  return (
    // 'otherUserId' correspond à 'receiverId' de l'URL
    <PrivateChat currentUserId={currentUserId} otherUserId={Number(receiverId)} /> 
  );
};

export default PrivateChatWrapper;