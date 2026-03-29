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
        BACKEND_API_URL: 'http://localhost:5000'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
