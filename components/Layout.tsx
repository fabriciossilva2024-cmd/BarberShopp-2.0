import React from 'react';
import { useAppStore } from '../store';
import { LogIn, Scissors, Menu, X, ArrowLeft, WifiOff } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  view: string;
  navigate: (view: string) => void;
  role?: 'CLIENT' | 'BARBER' | 'ADMIN';
  handleLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, view, navigate, role, handleLogout }) => {
  const { config, isSupabaseConnected, loading } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isHome = view === 'client-home';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Offline Banner */}
      {!loading && !isSupabaseConnected && (
        <div className="bg-red-500/90 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 backdrop-blur-sm sticky top-0 z-[60]">
            <WifiOff size={14} />
            SISTEMA OFFLINE: Operando em modo de demonstração (Dados Locais). As alterações não serão salvas no banco de dados.
        </div>
      )}

      {/* Header */}
      <header className={`bg-slate-900 border-b border-slate-800 sticky ${!loading && !isSupabaseConnected ? 'top-[32px]' : 'top-0'} z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('client-home')}>
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-gold-500" />
              ) : (
                <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
                  <Scissors className="text-slate-900" size={24} />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">{config.name}</h1>
                <p className="text-xs text-gold-500 uppercase tracking-widest">Estilo Premium</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {role ? (
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-gold-500 border border-slate-700">
                    {role === 'ADMIN' ? 'PAINEL MASTER' : 'PAINEL BARBEIRO'}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate('login-barber')}
                    className="text-sm text-slate-400 hover:text-gold-400 transition-colors"
                  >
                    Área do Barbeiro
                  </button>
                  <button 
                    onClick={() => navigate('login-admin')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-medium transition-colors border border-slate-700"
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400 hover:text-white p-2">
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3">
             {role ? (
                <>
                  <div className="text-gold-500 font-bold mb-2">{role} DASHBOARD</div>
                  <button 
                    onClick={() => { handleLogout?.(); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => { navigate('login-barber'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Login Barbeiro
                  </button>
                  <button 
                    onClick={() => { navigate('login-admin'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Login Admin
                  </button>
                </>
              )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {!isHome && !role && view !== 'login-barber' && view !== 'login-admin' && (
          <button 
            onClick={() => navigate('client-home')} 
            className="mb-6 flex items-center text-slate-400 hover:text-gold-500 transition-colors"
          >
            <ArrowLeft size={18} className="mr-1" /> Voltar ao Início
          </button>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 mb-2">{config.address}</p>
          <p className="text-slate-500 text-sm">
            {config.phone} | {config.whatsapp}
          </p>
          <div className="mt-4 text-xs text-slate-600">
            &copy; {new Date().getFullYear()} {config.name}. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};