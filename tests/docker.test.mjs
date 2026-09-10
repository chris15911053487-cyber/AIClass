import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openDatabase,migrate,adaptDatabase} from '../server/sqlite.mjs';
import {hashPassword,verifyPassword} from '../server/password.mjs';

test('SQLite migration is repeatable and records immutable checksums',()=>{
 const dir=mkdtempSync(join(tmpdir(),'academy-migration-'));const c=openDatabase(join(dir,'app.sqlite'));
 try{migrate(c,resolve('drizzle'));migrate(c,resolve('drizzle'));assert.ok(c.prepare('SELECT count(*) AS n FROM academy_migrations').get().n>0);const changed=join(dir,'changed');mkdirSync(changed);const m=c.prepare('SELECT name FROM academy_migrations LIMIT 1').get();writeFileSync(join(changed,m.name),'SELECT 1;');assert.throws(()=>migrate(c,changed),/modified/)}finally{c.close();rmSync(dir,{recursive:true,force:true})}
});
test('SQLite adapter persists writes, isolates user queries and rolls back a failed batch',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'academy-adapter-'));const path=join(dir,'app.sqlite');let c=openDatabase(path);
 try{migrate(c,resolve('drizzle'));let db=adaptDatabase(c);await db.prepare('INSERT INTO students VALUES(?,?,?,?,?)').bind('a','19900000001','A','',1).run();await db.prepare('INSERT INTO students VALUES(?,?,?,?,?)').bind('b','19900000002','B','',1).run();assert.equal((await db.prepare('SELECT name FROM students WHERE id=?').bind('a').first()).name,'A');await assert.rejects(db.batch([db.prepare('UPDATE students SET name=? WHERE id=?').bind('changed','a'),db.prepare('INSERT INTO students VALUES(?,?,?,?,?)').bind('b','19900000002','dup','',1)]));assert.equal((await db.prepare('SELECT name FROM students WHERE id=?').bind('a').first('name')),'A');c.close();c=openDatabase(path);db=adaptDatabase(c);assert.equal((await db.prepare('SELECT * FROM students').all()).results.length,2)}finally{c.close();rmSync(dir,{recursive:true,force:true})}
});
test('administrator password hashes reject incorrect passwords and malformed input',async()=>{
 const password='a-random-testing-password-1234';const hash=await hashPassword(password);assert.ok(!hash.includes(password));assert.equal(await verifyPassword(password,hash),true);assert.equal(await verifyPassword('incorrect',hash),false);assert.equal(await verifyPassword(password,'bad'),false);await assert.rejects(hashPassword('short'));
});
test('Docker configuration defaults to the canonical 127.0.0.1:8080 origin and port',()=>{
 const dir=mkdtempSync(join(tmpdir(),'academy-config-'));
 try{const run=spawnSync(process.execPath,[resolve('server/configure.mjs'),'--defaults'],{cwd:dir,encoding:'utf8'});assert.equal(run.status,0,run.stderr);const env=readFileSync(join(dir,'.env.docker'),'utf8');assert.match(env,/^APP_ORIGIN=http:\/\/127\.0\.0\.1:8080$/m);assert.match(env,/^PORT=8080$/m)}finally{rmSync(dir,{recursive:true,force:true})}
});
