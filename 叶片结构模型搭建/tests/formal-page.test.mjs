import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const page = await readFile(new URL('../assembly-prototype.html', import.meta.url), 'utf8');
const plantCell = await readFile(new URL('../plant-cell.html', import.meta.url), 'utf8');

const isDevelopmentRedirect = index.includes('./assembly-prototype.html');
const isStandaloneRelease = index.includes('<title>叶片结构模型搭建</title>')
  && index.includes('id="model-stage"')
  && !index.includes('type="module"');
assert(isDevelopmentRedirect || isStandaloneRelease);
assert(page.includes('叶片结构模型搭建'));
assert(page.includes('北师大版·七年级上册'));
assert(page.includes('data-stage-step="edit"'));
assert(page.includes('data-stage-step="confirmed"'));
assert(page.includes('data-stage-step="interacting"'));
assert(page.includes('id="toggle-fullscreen"'));
assert(page.includes('规则铺满</option>'));
assert(page.includes('随机不铺满</option>'));
assert(page.includes('id="upper-stoma-count"'));
assert(page.includes('min="0" max="3"'));
assert(page.includes('id="lower-stoma-count"'));
assert(page.includes('min="0" max="10"'));
assert(page.includes('id="upper-layout-mode"'));
assert(page.includes('id="lower-layout-mode"'));
assert(page.includes('<option value="irregular">不规则形</option>'));
assert(!page.includes('（栅栏组织）'));
assert(!page.includes('（海绵组织）'));
assert(page.indexOf('id="vein-size"') < page.indexOf('id="install-surfaces"'));
assert(page.indexOf('id="install-surfaces"') < page.indexOf('<h3>叶肉细胞模型</h3>'));
assert(plantCell.includes('可参数化通用植物细胞'));

console.log('PASS: formal entry, textbook header, workflow stages, fullscreen control, and preserved model preview.');
