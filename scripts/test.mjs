import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='.test-build';mkdirSync(out,{recursive:true});
for(const name of ['domain','validation','mydata']){const source=readFileSync(`lib/${name}.ts`,'utf8');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("from './domain'","from './domain.mjs'");writeFileSync(`${out}/${name}.mjs`,code);}
const run=spawnSync(process.execPath,['--test','tests/domain.test.mjs','tests/auth.test.mjs'],{stdio:'inherit'});process.exitCode=run.status??1;
