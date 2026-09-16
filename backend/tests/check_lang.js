const fs = require('fs');

const html = fs.readFileSync('multiembed.html', 'utf8');

// Find all server buttons or stream providers
const regex = /server-item[\s\S]*?<\/div>/gi;
const list = html.match(/data-id="[^"]*"/gi) || [];
console.log('data-id list:', list);

// Look for languages
const langs = html.match(/(?:espanol|latino|spanish|subtitulada|doblada)/gi) || [];
console.log('Language mentions in multiembed:', Array.from(new Set(langs)));

// Look for server names
const matches = html.match(/>(VIP Server|Server [A-Za-z0-9]+|Streamtape|Mixdrop|Doodstream|UpToBox|Supervideo|Netu)<\//gi) || [];
console.log('Server names found:', matches);
