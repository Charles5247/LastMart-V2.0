module.exports = {
  apps: [
    {
      name: 'lastmart-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_API_URL: 'http://localhost:5000',
        NODE_OPTIONS: '--max-old-space-size=512'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M'
    },
    {
      name: 'lastmart-backend',
      script: 'backend/dist/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'http://localhost:3000',
        JWT_SECRET: 'lastmart-dev-secret-change-in-production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M'
    }
  ]
}
