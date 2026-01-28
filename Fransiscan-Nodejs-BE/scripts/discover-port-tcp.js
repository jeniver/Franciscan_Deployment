/**
 * Try common SQL Server ports on 127.0.0.1; print first open port and exit 0, else exit 1.
 * Used by database.js discoverPortSync() when ERRORLOG and Registry fail.
 */
const net = require('net');
const P = [1433, 1434, 49152, 49153, 49154, 49155, 49156, 49157, 49158, 49159, 49160, 49161, 49162, 49163, 49164, 49165, 49166, 49167, 49168, 49169, 49170];
function tryPort(i) {
  if (i >= P.length) process.exit(1);
  const s = net.createSocket();
  s.setTimeout(900);
  s.on('connect', () => { console.log(P[i]); process.exit(0); });
  s.on('error', () => { s.destroy(); tryPort(i + 1); });
  s.on('timeout', () => { s.destroy(); tryPort(i + 1); });
  s.connect(P[i], '127.0.0.1');
}
tryPort(0);
