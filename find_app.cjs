const fs = require('fs');
const ts = require('typescript');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const sourceFile = ts.createSourceFile('App.tsx', code, ts.ScriptTarget.Latest, true);

function visit(node) {
  if (node.kind === ts.SyntaxKind.FunctionDeclaration && node.name && node.name.text === 'App') {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    console.log(`App function starts at line ${start.line + 1} and ends at line ${end.line + 1}`);
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
