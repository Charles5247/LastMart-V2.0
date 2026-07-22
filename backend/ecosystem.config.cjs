module.exports = {
  apps: [
    {
      name: 'lastmart-api',
      script: 'npx',
      args: 'ts-node-dev --respawn --transpile-only src/server.ts',
      cwd: '/home/user/webapp/backend',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        JWT_SECRET: 'lastmart-super-secret-key-2024',
        FRONTEND_URL: 'http://localhost:3000'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
