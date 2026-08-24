const fs = require('fs');
const crypto = require('crypto');

const API = process.env.API;
const KEY = process.env.KEY;
if (!API || !KEY) {
    console.error('Missing API or KEY env');
    process.exit(1);
}

const [id, secret] = KEY.split(':');
const dec = Buffer.from(secret, 'base64');
const now = Math.floor(Date.now() / 1000);

const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT', kid: id})).toString('base64url');
const payload = Buffer.from(JSON.stringify({iat: now, exp: now + 300, aud: '/admin/'})).toString('base64url');
const sig = crypto.createHmac('sha256', dec).update(`${header}.${payload}`).digest('base64url');
const token = `${header}.${payload}.${sig}`;
const base = API.replace(/\/$/, '');
const auth = `Ghost ${token}`;

async function main() {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync('headline.zip')], {type: 'application/zip'}), 'headline.zip');

    const up = await fetch(`${base}/themes/upload/`, {
        method: 'POST',
        headers: {Authorization: auth, 'Accept-Version': 'v6.0'},
        body: fd
    });
    const uj = await up.json();
    if (!up.ok) {
        console.error('UPLOAD FAIL', up.status, JSON.stringify(uj));
        process.exit(1);
    }
    console.log('UPLOAD', JSON.stringify(uj));

    const name = (uj.themes && uj.themes[0] && uj.themes[0].name) || 'headline';
    console.log('ACTIVATE', name);

    const ac = await fetch(`${base}/themes/${name}/activate/`, {
        method: 'PUT',
        headers: {Authorization: auth, 'Accept-Version': 'v6.0'}
    });
    const aj = await ac.json().catch(() => ({}));
    if (!ac.ok) {
        console.error('ACTIVATE FAIL', ac.status, JSON.stringify(aj));
        process.exit(1);
    }
    console.log('ACTIVATED', JSON.stringify(aj));
}

main().catch(e => { console.error(e); process.exit(1); });
