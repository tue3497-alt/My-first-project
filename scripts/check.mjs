import { spawnSync } from 'node:child_process';
for (const file of ['app.js', 'activities.js', 'learning.js', 'scene.js', 'scripts/serve.mjs']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('All JavaScript syntax checks passed.');
