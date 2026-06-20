// USAGE: node scripts/get_token.js <email> <password>
const https = require('https');

const API_KEY = 'AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o';
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('USAGE: node scripts/get_token.js <email> <password>');
  process.exit(2);
}

const body = JSON.stringify({ email, password, returnSecureToken: true });

const req = https.request({
  hostname: 'identitytoolkit.googleapis.com',
  path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.idToken) {
      console.log(parsed.idToken);
    } else {
      console.error('Login failed:', JSON.stringify(parsed, null, 2));
      process.exit(1);
    }
  });
});
req.on('error', (e) => { console.error(e); process.exit(1); });
req.write(body);
req.end();