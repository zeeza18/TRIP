const { spawnSync } = require('child_process')

const PORT = process.env.PORT || 4001

const result = spawnSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`
], { stdio: 'inherit' })

if (result.status === 0) console.log(`Port ${PORT} cleared`)
