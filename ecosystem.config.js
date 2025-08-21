/**
 * PM2設定ファイル
 * 本番環境でのプロセス管理用
 * 
 * 使用方法:
 * pm2 start ecosystem.config.js --env production
 * pm2 reload ecosystem.config.js
 * pm2 stop board-app
 */

module.exports = {
  apps: [
    {
      name: 'board-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 'max', // CPUコア数に応じて自動調整
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // 環境変数
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // ログ設定
      error_file: 'logs/pm2/error.log',
      out_file: 'logs/pm2/out.log',
      log_file: 'logs/pm2/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 詳細設定
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // グレースフルシャットダウン
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // 監視設定
      monitoring: true,
      
      // Node.js設定
      node_args: '--max-old-space-size=2048',
      
      // インタープリター設定
      interpreter_args: '',
      
      // クラスター設定
      instance_var: 'INSTANCE_ID',
      
      // 環境固有の設定
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
    },
    {
      // ワーカープロセス（バックグラウンドタスク用）
      name: 'board-app-worker',
      script: 'scripts/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      
      error_file: 'logs/pm2/worker-error.log',
      out_file: 'logs/pm2/worker-out.log',
      log_file: 'logs/pm2/worker-combined.log',
      time: true,
      
      // クーロンジョブ設定（オプション）
      cron_restart: '0 3 * * *', // 毎日午前3時に再起動
    }
  ],
  
  // デプロイ設定
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/my-board-app.git',
      path: '/var/www/board-app',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/my-board-app.git',
      path: '/var/www/board-app-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};