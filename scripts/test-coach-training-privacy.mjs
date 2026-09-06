import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('migration protects old and new private notes and preserves player-owned training',async()=>{
 const db=new PGlite();
 const coach='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',player='33333333-3333-4333-8333-333333333333';
 try{
 await db.exec(`create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table public.profiles(id uuid primary key);create table public.teams(id uuid primary key,coach_id uuid);create table public.team_members(team_id uuid,player_id uuid);
 create table public.coach_ratings(coach_id uuid,player_id uuid,skill_id text,value text,note text,primary key(coach_id,player_id,skill_id));
 insert into profiles values ('${coach}'),('${other}'),('${player}');insert into teams values ('${coach}','${coach}');insert into team_members values ('${coach}','${player}');
 insert into coach_ratings values ('${coach}','${player}','__general_notes__','note','PRIVATE'),('${coach}','${player}','s1','consistent','SHARED');
 alter table coach_ratings enable row level security;
 create policy old_player_read on coach_ratings for select using(player_id=auth.uid());
 create policy old_coach_read on coach_ratings for select using(coach_id=auth.uid());
 grant usage on schema public,auth to authenticated;grant select on all tables in schema public to authenticated;grant execute on function auth.uid() to authenticated;`);
 const migration=readFileSync(new URL('../supabase/migration_0024_coach_privacy_training.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration);
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 await as(player);
 assert.deepEqual((await db.query('select note from coach_ratings')).rows,[{note:'SHARED'}]);
 assert.equal((await db.query('select * from coach_private_notes')).rows.length,0);
 await assert.rejects(db.query('insert into coach_private_notes(coach_id,player_id,note) values($1,$2,$3)',[coach,player,'not allowed']));
 await db.query('insert into training_sessions(id,player_id,session_date,type,value,unit) values($1,$2,$3,$4,$5,$6)',[player,player,'2026-09-05','practice',30,'min']);
 await as(other);assert.equal((await db.query('select * from training_sessions')).rows.length,0);
 await assert.rejects(db.query('insert into coach_private_notes(coach_id,player_id,note) values($1,$2,$3)',[other,player,'unrelated']));
 await as(coach);assert.equal((await db.query('select * from training_sessions')).rows.length,1);
 await db.query('insert into coach_private_notes(coach_id,player_id,note) values($1,$2,$3)',[coach,player,'owner only']);
 assert.equal((await db.query('select note from coach_private_notes')).rows[0].note,'owner only');
 assert.ok((await db.query('select note from coach_ratings')).rows.some(r=>r.note==='PRIVATE'));
 await as(player);assert.equal((await db.query('select * from coach_private_notes')).rows.length,0);
 await as(other);assert.equal((await db.query('select * from coach_private_notes')).rows.length,0);
 }finally{await db.close();}
});
