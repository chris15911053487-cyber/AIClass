"""Run against local development only; creates and removes two isolated local fixtures."""
import sqlite3, pathlib, hashlib, secrets, time, json, urllib.request, urllib.error, os
ROOT=pathlib.Path(__file__).resolve().parents[1]
DB=pathlib.Path(os.environ['ACADEMY_SQLITE_FILE']) if os.environ.get('ACADEMY_SQLITE_FILE') else next(p for p in (ROOT/'.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite') if p.name!='metadata.sqlite')
conn=sqlite3.connect(DB); now=int(time.time()*1000)
users=[('test-student-a','19900000001',secrets.token_hex(32)),('test-student-b','19900000002',secrets.token_hex(32))]
for uid,phone,token in users:
 conn.execute('INSERT OR REPLACE INTO students(id,phone,name,goal,created_at) VALUES(?,?,?,?,?)',(uid,phone,uid,'',now))
 conn.execute('INSERT OR REPLACE INTO sessions(hash,user_id,expires) VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),uid,now+600000))
conn.commit()
base='http://localhost:3000'
def req(path='/api/platform',data=None,token=None,origin=base):
 headers={}
 if data is not None: headers.update({'Content-Type':'application/json','Origin':origin})
 if token:headers['Cookie']='academy_session='+token
 request=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(request) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read().decode()
  try:return e.code,json.loads(raw)
  except json.JSONDecodeError:return e.code,{"error":raw}
try:
 status,cat=req();assert status==200
 assert len(cat['courses'])==6
 assert all(not any(k in l for k in ('answer','reference','keywords')) for c in cat['courses'] for l in c['lessons'])
 assert req(data={'op':'read','lessonId':'prompt-1'})[0]==401
 assert req(data={'op':'read','lessonId':'prompt-1'},token=users[0][2],origin='https://other.test')[0]==403
 assert req('/api/platform?op=admin',token=users[0][2])[0]==403
 assert req(data={'op':'publish','data':{}},token=users[0][2])[0]==403
 assert req(data={'op':'read','lessonId':'prompt-1'},token=users[0][2])[0]==200
 status,work=req(data={'op':'submit','lessonId':'prompt-1','choice':1,'answer':'请为产品经理和研发整理周五产品会议的会前准备清单。用列表呈现，每组不超过三条，不要编造未知信息。'},token=users[0][2]);assert status==200,work
 assert not work['feedback']['passed']
 _,a=req('/api/platform?op=me',token=users[0][2]);_,b=req('/api/platform?op=me',token=users[1][2]);assert len(a['submissions'])==1 and len(a['progress'])==1;assert not b['submissions'] and not b['progress']
 assert req(data={'op':'review','id':work['id'],'passed':True,'note':'test'},token=users[1][2])[0]==403
 assert req(data={'op':'submit','lessonId':'prompt-1','choice':99,'answer':'无效选择'*10},token=users[0][2])[0]==400
 assert req(data={'op':'send-code','phone':'13800138000'})[0]==503
 assert req(data={'op':'chat','message':'帮助我学习','lessonId':'prompt-1'},token=users[0][2])[0]==503
 assert req(data={'op':'logout'},token=users[0][2])[0]==200
 assert req('/api/platform?op=me',token=users[0][2])[1]['user'] is None
 print('PASS: public answer isolation, anonymous rejection, CSRF, student/admin boundary, saved submission, cross-user isolation, invalid task, disconnected services, logout revocation (13 checks).')
finally:
 for uid,_,_ in users:
  for table in ('sessions','progress','submissions','chats'):conn.execute('DELETE FROM '+table+' WHERE user_id=?',(uid,))
  conn.execute('DELETE FROM students WHERE id=?',(uid,))
 conn.commit();conn.close()
