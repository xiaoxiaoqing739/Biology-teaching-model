// 将本项目的本地 ES 模块图打包为可直接双击打开的单文件 HTML。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
const modules = new Map();
const chunks = [];

function resolveImport(from, specifier) {
  if (!specifier.startsWith('.')) throw new Error(`发现外部模块：${specifier}`);
  return path.resolve(path.dirname(from), specifier.split('?')[0]);
}

function exportNames(list) {
  return list.split(',').map(item => item.trim()).filter(Boolean).map(item => {
    const parts = item.split(/\s+as\s+/);
    return [parts[0], parts[1] || parts[0]];
  });
}

function bundle(file) {
  if (modules.has(file)) return modules.get(file);
  const id = `m${modules.size}`;
  modules.set(file, id);
  let source = fs.readFileSync(file, 'utf8');
  const exported = [];

  source = source.replace(/^import\s+(\*\s+as\s+\w+|\{[^}]*\})\s+from\s+['"]([^'"]+)['"];?/gm, (_, binding, specifier) => {
    const dependency = bundle(resolveImport(file, specifier));
    if (binding.startsWith('*')) return `const ${binding.replace(/^\*\s+as\s+/, '')}=${dependency};`;
    const names = exportNames(binding.slice(1, -1)).map(([name, alias]) => `${name}:${alias}`).join(',');
    return `const {${names}}=${dependency};`;
  });
  source = source.replace(/^export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/gm, (_, list, specifier) => {
    const dependency = bundle(resolveImport(file, specifier));
    for (const [name, alias] of exportNames(list)) exported.push(`${alias}:${dependency}.${name}`);
    return '';
  });
  source = source.replace(/^export\s*\{([^}]+)\};?/gm, (_, list) => {
    for (const [name, alias] of exportNames(list)) exported.push(`${alias}:${name}`);
    return '';
  });
  source = source.replace(/^export\s+(function|class|const|let|var)\s+(\w+)/gm, (_, kind, name) => {
    exported.push(`${name}:${name}`);
    return `${kind} ${name}`;
  });
  if (/^\s*(import|export)\s/m.test(source)) throw new Error(`暂不支持的模块语法：${file}`);

  chunks.push(`const ${id}=(()=>{\n${source}\nreturn {${exported.join(',')}};\n})();`);
  return id;
}

bundle(path.join(root, 'js/assembly-preview.js'));
const javascript = `(()=>{\n${chunks.join('\n')}\n})();`;
new vm.Script(javascript);

const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
let html = fs.readFileSync(path.join(root, 'assembly-prototype.html'), 'utf8');
html = html.replace(/<link[^>]+href="\.\/styles\.css[^\"]*"[^>]*>/, `<style>\n${css}\n</style>`);
html = html.replace(/<script type="module"[^>]*><\/script>/, () => `<script>\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>`);
fs.writeFileSync(path.join(root, 'index.html'), html);

console.log(`Built ${modules.size} modules; ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB: ${path.join(root, 'index.html')}`);
