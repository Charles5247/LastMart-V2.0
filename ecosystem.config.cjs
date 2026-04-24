module.exports = {
  apps: [
    {
      name: 'lastmart',
      script: 'node_modules/.bin/next',
      args: 'dev -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BACKEND_API_URL: 'http://localhost:5000',
        NODE_OPTIONS: '--max-old-space-size=512'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M'
    }
  ]
}
