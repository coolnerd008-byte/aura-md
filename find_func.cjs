const fs = require('fs');
const ts = require('typescript');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const sourceFile = ts.createSourceFile('App.tsx', code, ts.ScriptTarget.Latest, true);

function visit(node) {
  if (node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.ArrowFunction || node.kind === ts.SyntaxKind.FunctionExpression) {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const lines = [3712, 4401, 4880, 4905, 4921, 4937, 4953];
    for (const line of lines) {
      if (start.line + 1 <= line && end.line + 1 >= line) {
        let name = 'Anonymous';
        if (node.name) name = node.name.text;
        else if (node.parent && node.parent.name) name = node.parent.name.text;
        console.log(`Line ${line} is in function ${name} (lines ${start.line + 1}-${end.line + 1})`);
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
