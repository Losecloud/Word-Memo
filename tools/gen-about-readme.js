// 临时生成脚本：把根目录 README.md 同步为 lib/about-readme.js（运行后删除）
const fs = require('fs');
const md = fs.readFileSync('README.md', 'utf8');
const header =
  '// 自动生成：由根目录 README.md 同步而来，请勿手改。\n' +
  '// 仅作为 file:// 直接打开时的内嵌快照；通过服务器打开时优先实时读取 README.md。\n' +
  '// 重新生成：node tools/gen-about-readme.js\n';
fs.writeFileSync(
  'lib/about-readme.js',
  header + 'window.ABOUT_README_MD = ' + JSON.stringify(md) + ';\n',
  'utf8'
);
console.log('ok bytes:', fs.statSync('lib/about-readme.js').size);
