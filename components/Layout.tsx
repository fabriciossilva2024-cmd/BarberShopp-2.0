import React from 'react';
import { useAppStore } from '../store';
import { LogIn, Scissors, Menu, X, ArrowLeft, WifiOff, ChevronDown } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  view: string;
  navigate: (view: string) => void;
  role?: 'CLIENT' | 'BARBER' | 'ADMIN' | 'CAIXA';
  handleLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, view, navigate, role, handleLogout }) => {
  const { config, isSupabaseConnected, loading } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className="hidden md:flex items-center" ref={menuRef}>
              {role ? (
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-gold-500 border border-slate-700">
                    {role === 'ADMIN' ? 'PAINEL MASTER' : role === 'CAIXA' ? 'CAIXA' : 'PAINEL BARBEIRO'}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-medium transition-colors border border-slate-700"
                  >
                    <Menu size={18} />
                    MENU
                    <ChevronDown size={16} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                      <button 
                        onClick={() => { navigate('client-home'); setMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        Inicio
                      </button>
                      <div className="border-t border-slate-700 my-1"></div>
                      <button 
                        onClick={() => { navigate('login-barber'); setMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        Area do Barbeiro
                      </button>
                      <button 
                        onClick={() => { navigate('login-caixa'); setMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        Caixa
                      </button>
                      <button 
                        onClick={() => { navigate('login-admin'); setMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        Admin
                      </button>
                    </div>
                  )}
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
                   <div className="text-gold-500 font-bold mb-2">{role === 'CAIXA' ? 'CAIXA' : role + ' DASHBOARD'}</div>
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
                    onClick={() => { navigate('client-home'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Inicio
                  </button>
                  <div className="border-t border-slate-700 my-2"></div>
                  <button 
                    onClick={() => { navigate('login-barber'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Login Barbeiro
                  </button>
                  <button 
                    onClick={() => { navigate('login-caixa'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-slate-300 hover:text-white"
                  >
                    Login Caixa
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
        {!isHome && !role && view !== 'login-barber' && view !== 'login-admin' && view !== 'login-caixa' && (
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