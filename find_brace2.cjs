const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inLineComment = false;
let inTemplate = false;

const lines = code.split('\n');
let currentLine = 1;

for (let i = 0; i < code.length; i++) {
  const char = code[i];
  const nextChar = code[i + 1];

  if (char === '\n') {
    if (depth === 0 && currentLine > 3600 && currentLine < 3650) {
      console.log(`Line ${currentLine}: depth is 0`);
    }
    currentLine++;
  }

  if (inString) {
    if (char === '\\') i++;
    else if (char === stringChar) inString = false;
  } else if (inTemplate) {
    if (char === '\\') i++;
    else if (char === '`') inTemplate = false;
    else if (char === '$' && nextChar === '{') {
      depth++;
      i++;
    }
  } else if (inComment) {
    if (char === '*' && nextChar === '/') {
      inComment = false;
      i++;
    }
  } else if (inLineComment) {
    if (char === '\n') inLineComment = false;
  } else {
    if (char === "'" || char === '"') {
      inString = true;
      stringChar = char;
    } else if (char === '`') {
      inTemplate = true;
    } else if (char === '/' && nextChar === '*') {
      inComment = true;
      i++;
    } else if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i++;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth < 0) {
        console.log(`Negative depth at line ${currentLine}`);
      }
    }
  }
}
