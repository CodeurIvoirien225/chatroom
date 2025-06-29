import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import AuthPage from './pages/AuthPage';
import MainChatPage from './pages/MainChatPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import ResendConfirmation from './pages/ResendConfirmation';
import RoomList from './pages/RoomList';
import HomePage from './pages/HomePage'; // Importez la nouvelle HomePage
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';


// Components
import UserProfile from './components/UserProfile';
import ConversationList from './components/ConversationList';
import PrivateChatWrapper from './components/PrivateChatWrapper';
import MyRoomsPage from './components/MyRoomsPage';

// Context
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4BB543',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ff3333',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Nouvelle route pour la page d'accueil */}
        <Route
          path="/"
          element={<HomePage />}
        />
        
        {/* Route d'authentification */}
        <Route
          path="/auth"
          element={user ? <Navigate to="/chat" /> : <AuthPage />}
        />
        
        <Route path="/resend-confirmation" element={<ResendConfirmation />} />

        {/* Routes protégées */}
        <Route
          path="/chat/*"
          element={user ? <MainChatPage /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/chat/:roomId"
          element={user ? <ChatPage /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/profile/:userId"
          element={user ? <UserProfile /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/rooms"
          element={user ? <RoomList /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/messages"
          element={user ? <ConversationList /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/private-messages/:receiverId"
          element={user ? <PrivateChatWrapper /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/my-rooms"
          element={user ? <MyRoomsPage /> : <Navigate to="/auth" replace />} 
        />

<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password/:token" element={<ResetPasswordPage />} />


        {/* Route catch-all (404 Page) */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;