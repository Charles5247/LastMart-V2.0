module.exports = {
  apps: [
    {
      name: 'lastmart',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: 'lastmart-super-secret-key-2024-production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M'
    }
  ]
};
