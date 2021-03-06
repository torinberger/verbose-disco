
const routes = [
  {
    path: '/',
    component: () => import('layouts/MyLayout.vue'),
    children: [
      { path: '', component: () => import('pages/Index.vue') },
      { path: '/stock/:stock', component: () => import('pages/Stock.vue') },
      { path: '/stock/', component: () => import('pages/Stock.vue') },
      { path: '/portfolio/:user', component: () => import('pages/Portfolio.vue') },
      { path: '/portfolio/', component: () => import('pages/Portfolio.vue') },
      { path: '/leaderboard/', component: () => import('pages/Leaderboard.vue') },
      { path: '/auth/:mode', component: () => import('pages/Auth.vue') }
    ]
  }
]

// Always leave this as last one
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
