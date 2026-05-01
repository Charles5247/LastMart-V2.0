module.exports = {
  apps: [
    // ── Next.js Frontend ──────────────────────────────────────────────────────
    {
      name: 'lastmart-frontend',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        BACKEND_API_URL: 'http://localhost:5000',
        NODE_OPTIONS: '--max-old-space-size=512'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },

    // ── Express Backend ───────────────────────────────────────────────────────
    {
      name: 'lastmart-backend',
      script: 'node',
      args: 'backend/dist/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'http://localhost:3000',
        DATABASE_PATH: './lastmart.db',
        JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
