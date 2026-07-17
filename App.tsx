import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useAppStore, AppProvider } from './store';
import { Layout } from './components/Layout';
import { UserRole, AppConfig } from './types';
import { Lock, Scissors, Loader } from 'lucide-react';
import { processOfflineQueue } from './offlineSync';

const ClientHome = React.lazy(() => import('./views/ClientHome').then(m => ({ default: m.ClientHome })));
const ClientBooking = React.lazy(() => import('./views/ClientBooking').then(m => ({ default: m.ClientBooking })));
const ClientQueue = React.lazy(() => import('./views/ClientQueue').then(m => ({ default: m.ClientQueue })));
const ClientTeam = React.lazy(() => import('./views/ClientTeam').then(m => ({ default: m.ClientTeam })));
const ClientProducts = React.lazy(() => import('./views/ClientProducts').then(m => ({ default: m.ClientProducts })));
const AdminDashboard = React.lazy(() => import('./views/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const BarberDashboard = React.lazy(() => import('./views/BarberDashboard').then(m => ({ default: m.BarberDashboard })));

// Helper to adjust color brightness for light/dark variants
const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// --- Splash Screen Component ---
const SplashScreen = ({ config }: { config: AppConfig }) => (
  <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="relative mb-6 animate-pulse">
        <div className="absolute inset-0 bg-gold-500/20 blur-xl rounded-full"></div>
        {config.logo ? (
            <img 
                src={config.logo} 
                alt="Logo" 
                className="relative w-32 h-32 rounded-full object-cover border-4 border-gold-500 shadow-2xl" 
            />
        ) : (
            <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border-4 border-gold-500 shadow-2xl">
                <Scissors className="text-gold-500" size={48} />
            </div>
        )}
    </div>
    
    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 text-center animate-fade-in">
        {config.name}
    </h1>
    <p className="text-gold-500 text-sm uppercase tracking-widest font-bold mb-8 opacity-80">
        Estilo Premium
    </p>

    <div className="flex flex-col items-center gap-3">
        <Loader className="text-slate-500 animate-spin" size={24} />
        <span className="text-slate-600 text-xs">Carregando experiência...</span>
    </div>
  </div>
);

interface LoginViewProps {
  targetRole: UserRole;
  username: string; // Used as Email for Supabase
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  onLogin: (role: UserRole) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ 
  targetRole, 
  username, 
  setUsername, 
  password, 
  setPassword, 
  error, 
  onLogin,
}) => (
  <div className="max-w-md mx-auto mt-10">
    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex justify-center mb-6 text-gold-500">
          <div className="p-4 bg-slate-800 rounded-full">
              <Lock size={32} />
          </div>
      </div>
      <h2 className="text-2xl font-bold text-center text-white mb-6">
          Acesso {targetRole === 'ADMIN' ? 'Administrativo' : 'Barbeiro'}
      </h2>
      
      {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
              {error}
          </div>
      )}

      <div className="space-y-4">
          <div>
              <label className="block text-sm text-slate-400 mb-1">Email ou Usuário</label>
              <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                  placeholder="admin ou seu@email.com"
              />
          </div>
          <div>
              <label className="block text-sm text-slate-400 mb-1">Senha</label>
              <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
              />
          </div>
          <button 
              onClick={() => onLogin(targetRole)}
              className="w-full bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold py-3 rounded-lg transition-colors mt-4"
          >
              Entrar
          </button>
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const [view, setView] = useState('client-home');
  
  // Login UI State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Access store
  const { config, userRole, currentUserId, login, logout, loading, refreshData } = useAppStore();

  // --- Dynamic Theme Applicator ---
  useEffect(() => {
    const root = document.documentElement;
    const primary = config.primaryColor || '#f59e0b';
    
    try {
        const light = adjustColor(primary, 40);
        const dark = adjustColor(primary, -40);
        root.style.setProperty('--color-primary', primary);
        root.style.setProperty('--color-primary-light', light);
        root.style.setProperty('--color-primary-dark', dark);
    } catch (e) {
        root.style.setProperty('--color-primary', primary);
    }

  }, [config.primaryColor]);

  // --- Sync Listener ---
  useEffect(() => {
    const handleOnline = async () => {
        console.log("Connection restored. Syncing...");
        const success = await processOfflineQueue();
        if (success) {
            refreshData(true);
        }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const navigate = useCallback((newView: string) => {
    setView(newView);
    window.scrollTo(0, 0);
  }, []);

  // Handle Redirects based on Auth Role
  useEffect(() => {
      if (userRole === 'ADMIN') navigate('admin-dashboard');
      else if (userRole === 'BARBER') navigate('barber-dashboard');
  }, [userRole, navigate]);

  const handleLogin = async (targetRole: UserRole) => {
    setLoginError('');
    const { error } = await login(loginEmail, loginPassword);
    
    if (error) {
        setLoginError('Credenciais inválidas. Verifique email e senha.');
    } else {
        // Successful login, role check happens in Store and useEffect above handles redirect
    }
  };

  const handleLogout = () => {
    logout();
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    navigate('client-home');
  };

  // Router Switch
  const renderView = () => {
    switch (view) {
      case 'client-home': return <ClientHome navigate={navigate} />;
      case 'client-booking': return <ClientBooking navigate={navigate} />;
      case 'client-queue': return <ClientQueue />;
      case 'client-products': return <ClientProducts />;
      case 'client-team': return <ClientTeam />;
      
      case 'login-admin': 
        return <LoginView 
            targetRole="ADMIN" 
            username={loginEmail}
            setUsername={setLoginEmail}
            password={loginPassword}
            setPassword={setLoginPassword}
            error={loginError}
            onLogin={handleLogin}
        />;
      case 'login-barber': 
        return <LoginView 
            targetRole="BARBER" 
            username={loginEmail}
            setUsername={setLoginEmail}
            password={loginPassword}
            setPassword={setLoginPassword}
            error={loginError}
            onLogin={handleLogin}
        />;
      
      case 'admin-dashboard': 
        if (userRole === 'ADMIN') return <AdminDashboard />;
        return <LoginView targetRole="ADMIN" username={loginEmail} setUsername={setLoginEmail} password={loginPassword} setPassword={setLoginPassword} error={loginError} onLogin={handleLogin} />;
      
      case 'barber-dashboard': 
        // Pass currentUserId to ensure dashboard shows correct data
        if (userRole === 'BARBER') return <BarberDashboard currentBarberId={currentUserId} />;
        return <LoginView targetRole="BARBER" username={loginEmail} setUsername={setLoginEmail} password={loginPassword} setPassword={setLoginPassword} error={loginError} onLogin={handleLogin} />;
      
      default: return <ClientHome navigate={navigate} />;
    }
  };

  // --- Show Splash Screen while loading ---
  if (loading) {
      return <SplashScreen config={config} />;
  }

  return (
    <Layout view={view} navigate={navigate} role={userRole} handleLogout={handleLogout}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader className="text-gold-500 animate-spin" size={32} />
        </div>
      }>
        {renderView()}
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}