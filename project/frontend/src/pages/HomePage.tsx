import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20 px-4 rounded-b-3xl shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Bienvenue sur notre Plateforme de Chat</h1>
          <p className="text-xl md:text-2xl mb-8">Connectez-vous, discutez et partagez en temps réel</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {!user ? (
              <>
                <Link 
                  to="/auth" 
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300 shadow-md"
                >
                  Se connecter
                </Link>
                <Link 
                  to="/auth?mode=register" 
                  className="border-2 border-white text-white hover:bg-white hover:bg-opacity-10 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300 shadow-md"
                >
                  S'inscrire
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/chat" 
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300 shadow-md"
                >
                  Accéder au Chat
                </Link>
                <Link 
                  to="/profile" 
                  className="border-2 border-white text-white hover:bg-white hover:bg-opacity-10 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300 shadow-md"
                >
                  Mon Profil
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Fonctionnalités principales</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition duration-300">
            <div className="text-blue-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Salons de discussion</h3>
            <p className="text-gray-600">Rejoignez des salons publics ou créez les vôtres pour discuter avec vos amis ou la communauté.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition duration-300">
            <div className="text-purple-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Messages privés</h3>
            <p className="text-gray-600">Discutez en privé avec vos amis grâce à notre système de messagerie instantanée sécurisée.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition duration-300">
            <div className="text-pink-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Profil personnalisé</h3>
            <p className="text-gray-600">Personnalisez votre profil avec une photo, une description et gérez vos paramètres de confidentialité.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {!user && (
        <section className="bg-gray-100 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Prêt à commencer ?</h2>
            <Link 
              to="/auth?mode=register" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300 shadow-lg"
            >
              Créer un compte gratuit
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;