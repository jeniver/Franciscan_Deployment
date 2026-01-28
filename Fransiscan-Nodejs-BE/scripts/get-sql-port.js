/**
 * Get SQL Server port for COLUMBARIUM\SQLEXPRESS (or local SQLEXPRESS).
 * Run: node scripts/get-sql-port.js   or   npm run get-port
 * Prints the port number and optionally updates .env with DB_PORT.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

if (os.platform() !== 'win32') {
  console.log('Windows only.');
  process.exit(1);
}

function getPortFromLog() {
  const dirs = ['MSSQL16.SQLEXPRESS', 'MSSQL17.SQLEXPRESS', 'MSSQL15.SQLEXPRESS', 'MSSQL14.SQLEXPRESS'];
  const base = 'C:\\Program Files\\Microsoft SQL Server';
  for (const d of dirs) {
    const logPath = path.join(base, d, 'MSSQL', 'Log', 'ERRORLOG');
    if (!fs.existsSync(logPath)) continue;
    try {
      const c = fs.readFileSync(logPath, 'utf8').slice(-80000);
      const m = c.match(/Server is listening on \[\s*'any'\s*<ipv4>\s*(\d+)\s*\]/) ||
        c.match(/Server is listening on \[ 'any' <ipv4> (\d+) \]/) ||
        c.match(/TCP Dynamic Ports[^\d]*(\d+)/) ||
        c.match(/TCP Port[^\d]*(\d+)/);
      if (m) {
        const p = parseInt(m[1], 10);
        if (p > 1024 && p < 65536) return p;
      }
    } catch (e) {}
  }
  try {
    const full = path.join(base);
    if (!fs.existsSync(full)) return null;
    for (const d of fs.readdirSync(full)) {
      if (!/^MSSQL\d+\.SQLEXPRESS$/i.test(d)) continue;
      const logPath = path.join(full, d, 'MSSQL', 'Log', 'ERRORLOG');
      if (!fs.existsSync(logPath)) continue;
      try {
        const c = fs.readFileSync(logPath, 'utf8').slice(-80000);
        const m = c.match(/Server is listening on \[\s*'any'\s*<ipv4>\s*(\d+)\s*\]/) ||
          c.match(/Server is listening on \[ 'any' <ipv4> (\d+) \]/) ||
          c.match(/TCP Dynamic Ports[^\d]*(\d+)/) ||
          c.match(/TCP Port[^\d]*(\d+)/);
        if (m) {
          const p = parseInt(m[1], 10);
          if (p > 1024 && p < 65536) return p;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

function getPortFromRegistry() {
  try {
    const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL"', { encoding: 'utf8', windowsHide: true });
    let name = null;
    for (const line of (out || '').split(/\r?\n/)) {
      const m = line.match(/SQLEXPRESS\s+REG_\w+\s+(MSSQL\d+\.SQLEXPRESS)/i) || line.match(/REG_\w+\s+(MSSQL\d+\.SQLEXPRESS)/i);
      if (m && m[1]) { name = m[1]; break; }
    }
    if (!name) return null;
    const key = `HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\${name}\\MSSQLServer\\SuperSocketNetLib\\Tcp\\IPAll`;
    for (const v of ['TcpPort', 'TcpDynamicPorts']) {
      try {
        const t = execSync(`reg query "${key}" /v ${v}`, { encoding: 'utf8', windowsHide: true });
        const m = (t || '').match(new RegExp(`${v}\\s+REG_\\w+\\s+([0-9,]+)`, 'i'));
        if (m && m[1]) {
          const p = parseInt(String(m[1]).split(',')[0].trim(), 10);
          if (p > 1024 && p < 65536) return p;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

function getPortFromTcp() {
  const scriptPath = path.join(__dirname, 'discover-port-tcp.js');
  if (!fs.existsSync(scriptPath)) return null;
  try {
    const r = execSync(`node "${scriptPath}"`, { encoding: 'utf8', timeout: 15000, windowsHide: true });
    const p = parseInt((r || '').trim(), 10);
    if (p > 1024 && p < 65536) return p;
  } catch (e) {}
  return null;
}

let port = getPortFromLog() || getPortFromRegistry() || getPortFromTcp();

if (!port) {
  console.log('Port not found. Check ERRORLOG, Registry, or set DB_PORT in .env (e.g. from SQL Config Manager).');
  process.exit(1);
}

console.log(port);

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    let s = fs.readFileSync(envPath, 'utf8');
    if (/DB_PORT\s*=/.test(s)) {
      s = s.replace(/^DB_PORT\s*=.*$/m, `DB_PORT=${port}`);
    } else {
      s = s.replace(/^(DB_SERVER\s*=.*)$/m, `$1\nDB_PORT=${port}`);
    }
    fs.writeFileSync(envPath, s);
  } catch (e) {}
}

process.exit(0);
