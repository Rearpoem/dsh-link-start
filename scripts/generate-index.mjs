// Write plugin-index.json (DSH plugin index format 1) pointing at one pushed commit.
// Usage: npm run index -- <full 40-character commit SHA>
// Only writes the local file; publishing it is a normal commit and push.
import { readFile, writeFile } from 'node:fs/promises';

const REPOSITORY = 'https://github.com/Rearpoem/dsh-link-start';
const commit = process.argv[2] ?? '';
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Pass the full lowercase 40-character commit SHA that contains this version.');

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const manifest = await read('package.json');
const en = (await read('locale/en.json')).meta;
const zh = (await read('locale/zh.json')).meta;

const index = {
  format: 1,
  title: { en: 'dsh-link-start', zh: 'dsh-link-start' },
  description: { en: 'Index for the Link Start splash plugin.', zh: 'Link Start 启动画面插件的索引。' },
  plugins: [{
    name: manifest.name,
    title: { en: en.title, zh: zh.title },
    description: { en: en.description, zh: zh.description },
    icon: 'icon.svg',
    author: manifest.author,
    homepage: REPOSITORY,
    repository: { url: REPOSITORY },
    versions: [{
      version: manifest.version,
      publishTimestamp: Math.floor(Date.now() / 1000),
      source: { type: 'git', url: REPOSITORY, commit },
      engines: manifest.engines,
    }],
  }],
};
await writeFile(new URL('../plugin-index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n');
console.log(`Wrote plugin-index.json for ${manifest.name}@${manifest.version} at ${commit}.`);
