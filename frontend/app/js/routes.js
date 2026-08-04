import { defineRoutes } from './router.js';

defineRoutes([
  // Auth
  { path: '/app/login', load: () => import('./views/login.js'), guard: false, title: 'Login | TikToolStream' },
  { path: '/app/register', load: () => import('./views/register.js'), guard: false, title: 'Registro | TikToolStream' },
  { path: '/app/verify-email', load: () => import('./views/verify-email.js'), guard: false, title: 'Verificar Email | TikToolStream' },

  // Tool views
  { path: '/app/dashboard', load: () => import('./views/dashboard.js'), guard: 'auth', title: 'Dashboard | TikToolStream' },
  { path: '/app/goals', load: () => import('./views/goals.js'), guard: 'auth', title: 'Metas | TikToolStream' },
  { path: '/app/chatbot', load: () => import('./views/chatbot.js'), guard: 'auth', title: 'Chatbot | TikToolStream' },
  { path: '/app/songrequests', load: () => import('./views/songrequests.js'), guard: 'auth', title: 'Solicitar Canciones | TikToolStream' },
  { path: '/app/actions', load: () => import('./views/actions.js'), guard: 'auth', title: 'Acciones y Eventos | TikToolStream' },
  { path: '/app/game', load: () => import('./views/game.js'), guard: 'auth', title: 'Juego | TikToolStream' },
  { path: '/app/auctions', load: () => import('./views/auctions.js'), guard: 'auth', title: 'Subastas | TikToolStream' },
  { path: '/app/auctions/new', load: () => import('./views/auctions-new.js'), guard: 'auth', title: 'Nueva Subasta | TikToolStream' },
  { path: '/app/auctions/:id', load: () => import('./views/auctions-detail.js'), guard: 'auth', title: 'Subasta | TikToolStream' },
  { path: '/app/roulette', load: () => import('./views/roulette.js'), guard: 'auth', title: 'Ruleta | TikToolStream' },
  { path: '/app/timers', load: () => import('./views/timers.js'), guard: 'auth', title: 'Timers | TikToolStream' },
  { path: '/app/analytics', load: () => import('./views/analytics.js'), guard: 'auth', title: 'Analytics | TikToolStream' },
  { path: '/app/hype-arena', load: () => import('./views/hype-arena.js'), guard: 'auth', title: 'Hype Arena | TikToolStream' },
  { path: '/app/overlays', load: () => import('./views/overlays.js'), guard: 'auth', title: 'Overlays | TikToolStream' },
  { path: '/app/chat', load: () => import('./views/chat.js'), guard: 'auth', title: 'Chat | TikToolStream' },
  { path: '/app/payments', load: () => import('./views/payments.js'), guard: 'auth', title: 'Plan y Pagos | TikToolStream' },
  { path: '/app/payments/history', load: () => import('./views/payments-history.js'), guard: 'auth', title: 'Historial | TikToolStream' },
  { path: '/app/profile', load: () => import('./views/profile.js'), guard: 'auth', title: 'Perfil | TikToolStream' },
  { path: '/app/settings', load: () => import('./views/settings.js'), guard: 'auth', title: 'Configuración | TikToolStream' },

  // Admin views — dentro del mismo shell
  { path: '/app/admin', load: () => import('./views/admin/dashboard.js'), guard: 'admin', title: 'Admin | TikToolStream' },
  { path: '/app/admin/users', load: () => import('./views/admin/users.js'), guard: 'admin', title: 'Usuarios | TikToolStream' },
  { path: '/app/admin/users/:id', load: () => import('./views/admin/user-detail.js'), guard: 'admin', title: 'Usuario | TikToolStream' },
  { path: '/app/admin/news', load: () => import('./views/admin/news.js'), guard: 'admin', title: 'Novedades | TikToolStream' },
  { path: '/app/admin/chats', load: () => import('./views/admin/chats.js'), guard: 'admin', title: 'Chats | TikToolStream' },
  { path: '/app/admin/chats/:userId', load: () => import('./views/admin/chat-detail.js'), guard: 'admin', title: 'Chat | TikToolStream' },
  { path: '/app/admin/payments', load: () => import('./views/admin/payments.js'), guard: 'admin', title: 'Pagos Admin | TikToolStream' },
  { path: '/app/admin/settings', load: () => import('./views/settings.js'), guard: 'admin', title: 'Configuración | TikToolStream' },

  // Special
  { path: '/app/403', load: () => import('./views/forbidden.js'), guard: false, title: 'Acceso Denegado | TikToolStream' },
  { path: '/app/404', load: () => import('./views/not-found.js'), guard: false, title: 'No Encontrado | TikToolStream' },
]);
