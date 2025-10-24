module.exports = {
  apps: [{
    name: 'billing-app',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    instance_var: 'INSTANCE_ID',
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
