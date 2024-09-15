/**
 * @description pm2 configuration file.
 * @example
 *  production mode :: pm2 start ecosystem.config.js --only prod
 *  development mode :: pm2 start ecosystem.config.js --only dev
 */
 module.exports = {
   apps: [
     {
       name: 'prod',
       script: 'dist/server.js',
       exec_mode: 'cluster', // 'cluster' or 'fork'
       instance_var: 'INSTANCE_ID',
       instances: 1,
       autorestart: true,
       watch: false,
       ignore_watch: ['node_modules', 'logs'],
       max_memory_restart: '1G', // restart if process use more than 1G memory
       merge_logs: true, // if true, stdout and stderr will be merged and sent to pm2 log
       output: './logs/access.log',
       error: './logs/error.log',
       env: {
         PORT: 3000,
         NODE_ENV: 'production',
       },
     },
     {
       name: 'dev',
       script: 'ts-node',
       args: '-r tsconfig-paths/register --transpile-only src/server.ts',
       exec_mode: 'cluster', // 'cluster' or 'fork'
       instance_var: 'INSTANCE_ID',
       instances: 1,
       autorestart: true, // auto restart if process crash
       watch: false, // files change automatic restart
       ignore_watch: ['node_modules', 'logs'], // ignore files change
       max_memory_restart: '1G', // restart if process use more than 1G memory
       merge_logs: true, // if true, stdout and stderr will be merged and sent to pm2 log
       output: './logs/access.log',
       error: './logs/error.log',
       env: {
         PORT: 3000,
         NODE_ENV: 'development',
       },
     },
   ],
   deploy: {
     production: {
       user: 'user',
       host: '0.0.0.0',
       ref: 'origin/main',
       repo: 'https://github.com/mystash-ng/mystash-auth.git',
       path: 'dist/server.js',
       'post-deploy': 'yarn && yarn build && pm2 reload ecosystem.config.js --only prod',
     },
   },
 };
