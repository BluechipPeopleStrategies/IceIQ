-- 100 new rink scenarios for the review_questions workspace.
-- Emitted by tools/author-100-rink-review.mjs. Paste into the Supabase SQL editor
-- under the admin account (RLS requires email = mtslifka@gmail.com).
--
-- Safe to re-run: ON CONFLICT (id) DO NOTHING preserves any edits you've made.

begin;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink31',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink31","type":"rink","cat":"Zone Knowledge","concept":"Where does my team shoot?","d":1,"pos":["F"],"sit":"You''re on the ice. Which net do you shoot at?","why":"Knowing which way your team goes is the first part of hockey.","tip":"You shoot at the net at the FAR end, not your own.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"offsetY":50}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click the net your team is shooting at.","zones":{"correct":["net-front"],"partial":[],"wrong":["slot","high-slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! That''s the far net — that''s where goals happen for you.","partial":"Getting closer.","wrong":"That''s your own net. You shoot at the OTHER one."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink32',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink32","type":"rink","cat":"Basic Positioning","concept":"Stay on your side","d":1,"pos":["F"],"sit":"You''re on the left wing. The puck is in the middle. Where should you go?","why":"Wingers stay on their side so the ice doesn''t get crowded.","tip":"Left wing stays on the LEFT.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"label":"LW"}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where a left winger should skate.","zones":{"correct":["left-boards","left-faceoff"],"partial":["left-corner"],"wrong":["net-front","slot","high-slot","right-faceoff","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! Left wingers stay on the left side.","partial":"You''re close — left side is right, maybe a bit higher.","wrong":"That''s not your side. Left wingers stay on the left."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink33',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink33","type":"rink","cat":"Puck Support","concept":"Help your teammate","d":1,"pos":["F"],"sit":"Your friend has the puck in the corner. What do you do?","why":"When a teammate has the puck, you want to be close enough to help — not so close you crowd them.","tip":"Go NEAR them, not ON them.","scene":{"team":[{"id":"mate","zone":"left-corner"},{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Your friend has the puck in the corner. What''s the best move?","options":[{"text":"Skate to the slot in front of the net so they can pass to me.","verdict":"correct","feedback":"Yes! That''s a great spot — your friend can pass to you for a shot."},{"text":"Skate to the corner to help them.","verdict":"partial","feedback":"That''s nice, but you might crowd them. Better to stay open for a pass."},{"text":"Stay still and watch.","verdict":"wrong","feedback":"You have to move! Staying still means you''re not helping."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink34',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink34","type":"rink","cat":"Puck Pursuit","concept":"Chase smart","d":1,"pos":["F"],"sit":"The puck is in the corner. Two of your friends are already chasing it. What do you do?","why":"If two of your friends are already going for the puck, you don''t need to go too. Stay open.","tip":"Don''t follow the crowd.","scene":{"team":[{"id":"m1","zone":"left-corner"},{"id":"m2","zone":"left-boards"},{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Two friends are chasing the puck. What do you do?","options":[{"text":"Stay in the middle so they can pass to me.","verdict":"correct","feedback":"Exactly! You''re in the best spot to get a pass."},{"text":"Chase the puck too.","verdict":"wrong","feedback":"Now three people are on one puck. Too crowded."},{"text":"Go to the other corner.","verdict":"partial","feedback":"That''s far from the puck. You want to be somewhere they can see you."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink35',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink35","type":"rink","cat":"Defensive Basics","concept":"Skate back","d":1,"pos":["F"],"sit":"The other team got the puck. Your team is behind them. What do you do?","why":"When the other team has the puck, we all skate back fast to help our goalie.","tip":"If they have the puck, skate BACK — fast.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[{"id":"o1","zone":"high-slot","hasPuck":true}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"The other team just got the puck. You do…","options":[{"text":"Skate back hard toward our goalie.","verdict":"correct","feedback":"Yes! Back-check hard. Every player has to help on D."},{"text":"Stay in their end and wait.","verdict":"wrong","feedback":"That leaves your team short-handed. Always skate back."},{"text":"Try to steal the puck by yourself.","verdict":"partial","feedback":"Brave, but if you miss, there''s no one behind you. Better to get back first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink36',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink36","type":"rink","cat":"Zone Knowledge","concept":"Name the net-front","d":1,"pos":["F"],"sit":"The net-front is the spot right in front of the goalie. Click it.","why":"Net-front is a key spot — that''s where tips and rebounds happen.","tip":"Net-front = RIGHT in front of the net, almost touching the goalie.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click the net-front.","zones":{"correct":["net-front"],"partial":["slot"],"wrong":["high-slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! That''s net-front. Goals happen here.","partial":"Close — that''s the slot, just behind net-front.","wrong":"Try again — net-front is right up against the goalie."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink37',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink37","type":"rink","cat":"Puck Support","concept":"Go to open ice","d":1,"pos":["F"],"sit":"Your friend has the puck. A defender is right next to you. Where should you go?","why":"If a defender is on you, your friend can''t pass to you. Move to open ice.","tip":"Move AWAY from defenders to get open.","scene":{"team":[{"id":"m1","zone":"left-corner"},{"id":"you1","zone":"slot","isYou":true}],"opponents":[{"id":"d1","zone":"slot"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where you should skate to get open.","zones":{"correct":["high-slot","right-faceoff"],"partial":["net-front"],"wrong":["slot","left-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! Open ice — your friend can pass you the puck.","partial":"That works too, but you''re close to the defender. Higher up is cleaner.","wrong":"That''s not open — a defender is there. Move away from them."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink38',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink38","type":"rink","cat":"Effort","concept":"Two hands on the stick","d":1,"pos":["F"],"sit":"You''re skating without the puck. Why do both hands belong on your stick?","why":"Two hands on the stick means you''re ready to play. One hand means you''re not.","tip":"Ready hockey player = two hands on the stick.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Why two hands on the stick?","options":[{"text":"So I''m ready to pass, shoot, or stop the puck any second.","verdict":"correct","feedback":"Yes! Being ready is half of hockey."},{"text":"It looks cooler.","verdict":"wrong","feedback":"Haha — maybe, but it''s really about being ready."},{"text":"So I can skate faster.","verdict":"partial","feedback":"Actually, one hand lets you swing more. But for playing the puck, two is better."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink39',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink39","type":"rink","cat":"Faceoff Basics","concept":"Where to stand on a faceoff","d":1,"pos":["F"],"sit":"There''s a faceoff in your zone. You''re a winger. Where do you stand?","why":"On a faceoff, wingers stand by their faceoff dots — ready to go wherever the puck goes.","tip":"Wingers stand by the NEAR dot, not in the middle.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"label":"LW"}],"opponents":[],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where a left winger lines up for this faceoff.","zones":{"correct":["left-faceoff"],"partial":["left-boards"],"wrong":["net-front","slot","high-slot","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! Left wingers stand by the left faceoff dot.","partial":"Close — you''d be a bit higher than that for the faceoff itself.","wrong":"That''s not where a winger lines up. Stay on your side near the dot."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u7rink40',
  'U7 / Initiation',
  'u7',
  null,
  '{"level":"U7 / Initiation","id":"u7rink40","type":"rink","cat":"Celebrate Smart","concept":"Back on defense first","d":1,"pos":["F"],"sit":"Your team just scored! The puck is dropping for the next faceoff. What do you do first?","why":"You can celebrate a goal — but the game restarts right away. Get to your spot.","tip":"Celebrate fast. Then get ready.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You scored! Now…","options":[{"text":"High-five quick, then get to my faceoff spot.","verdict":"correct","feedback":"Exactly! Celebrate fast, then get ready to play."},{"text":"Skate around the whole rink celebrating.","verdict":"wrong","feedback":"Your team needs you at the faceoff. Keep it quick."},{"text":"Skate over to our bench.","verdict":"partial","feedback":"Only if you''re being subbed off. Otherwise, get to your spot."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink21',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink21","type":"rink","cat":"Breakout Basics","concept":"Breakout support","d":1,"pos":["F"],"sit":"Your D has the puck behind your net. You''re a winger. Where do you support?","why":"Wingers have to give the D a short, safe pass option on breakouts.","tip":"Support along the BOARDS on your side, not in the middle.","scene":{"team":[{"id":"d1","zone":"behind-net"},{"id":"you1","zone":"left-faceoff","isYou":true,"label":"LW"}],"opponents":[],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where a left winger supports on the breakout.","zones":{"correct":["left-boards"],"partial":["left-faceoff","left-corner"],"wrong":["net-front","slot","high-slot","right-faceoff","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! Wall support — a clean pass option for your D.","partial":"That works — you''re on your side. A bit lower by the boards is even better.","wrong":"The middle is the worst spot — too much traffic. Support along the wall."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink22',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink22","type":"rink","cat":"Offensive Zone","concept":"Find the open slot","d":1,"pos":["F"],"sit":"Your teammate has the puck behind the opposing net. You''re open. Where should you go?","why":"Behind-the-net passes work best to the slot — the highest-percentage shooting ice.","tip":"Drive to the slot to create a scoring chance.","scene":{"team":[{"id":"m1","zone":"behind-net"},{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where you skate to get a scoring chance.","zones":{"correct":["slot","net-front"],"partial":["home-plate"],"wrong":["high-slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes! Slot for the shot — goalies hate passes to the slot.","partial":"Home plate is good — slot is the bullseye.","wrong":"That''s too far from the net to shoot. Get to the slot."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink23',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink23","type":"rink","cat":"Defensive Zone","concept":"Your check","d":1,"pos":["F"],"sit":"The other team has the puck in your zone. Their winger is on your side. What''s your job?","why":"In your own end, wingers usually pick up the other team''s D at the point.","tip":"Winger''s check = the other team''s D at the point on your side.","scene":{"team":[{"id":"you1","zone":"left-faceoff","isYou":true,"label":"LW"}],"opponents":[{"id":"o1","zone":"left-point"},{"id":"o2","zone":"slot","hasPuck":true}],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Who do you cover?","options":[{"text":"The D at the left point.","verdict":"correct","feedback":"Yes — wingers cover the same-side point in the D-zone."},{"text":"The forward in the slot.","verdict":"partial","feedback":"That''s usually the centre or a D''s job. Wingers cover the point."},{"text":"Skate to the puck.","verdict":"wrong","feedback":"Everyone chasing means the point is wide open for a one-timer."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink24',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink24","type":"rink","cat":"Rush Basics","concept":"Take the middle lane","d":1,"pos":["F"],"sit":"You''re the middle forward on a 3-on-2 rush. Where do you drive?","why":"The middle driver pulls a defender in — that opens up the wingers.","tip":"Straight to the net. Make the D choose.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true,"label":"C"},{"id":"lw","zone":"left-faceoff"},{"id":"rw","zone":"right-faceoff"}],"opponents":[{"id":"d1","zone":"slot"},{"id":"d2","zone":"right-faceoff"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click the net to drive at.","zones":{"correct":["net-front","slot"],"partial":["high-slot"],"wrong":["left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — drive straight. Make the defender pick between you and the pass.","partial":"That''s where you start. Keep going — drive harder.","wrong":"Drifting wide kills the 3-on-2. Go middle."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink25',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink25","type":"rink","cat":"Puck Protection","concept":"Use your body","d":1,"pos":["F"],"sit":"You have the puck along the boards. A defender is skating at you. What do you do?","why":"Putting your body between the defender and the puck is legal, smart, and keeps possession.","tip":"Body between defender and puck = protection.","scene":{"team":[{"id":"you1","zone":"left-corner","isYou":true,"hasPuck":true}],"opponents":[{"id":"d1","zone":"left-boards"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Defender''s closing. You…","options":[{"text":"Turn my back to them and protect the puck with my body.","verdict":"correct","feedback":"Yes — puck on the far side, body as a wall."},{"text":"Try to stickhandle around them in open space.","verdict":"wrong","feedback":"Risky — you might lose the puck. Protect first."},{"text":"Pass right away even if nobody''s open.","verdict":"partial","feedback":"Sometimes. But if you can protect and wait a beat, a better pass comes."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink26',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink26","type":"rink","cat":"Awareness","concept":"Heads up before you pass","d":1,"pos":["F"],"sit":"You just got the puck. What''s the first thing you do?","why":"Before you can pass, you have to LOOK. Head down = wrong pass.","tip":"Head UP first, pass second.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"hasPuck":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"First thing you do when the puck arrives?","options":[{"text":"Pick my head up and look around.","verdict":"correct","feedback":"Yes. No information = no good pass."},{"text":"Pass to whoever called for it.","verdict":"wrong","feedback":"If you didn''t look, you don''t know if they''re actually open."},{"text":"Stickhandle in a circle.","verdict":"partial","feedback":"That burns time but doesn''t give you information. Look up first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink27',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink27","type":"rink","cat":"Transition","concept":"First pass out","d":1,"pos":["F"],"sit":"Your D just grabbed a loose puck behind your net. Where should she pass?","why":"The safest first pass is along the wall to a supporting winger. Up the middle is risky.","tip":"D-to-winger on the wall = clean breakout.","scene":{"team":[{"id":"d1","zone":"behind-net","hasPuck":true},{"id":"lw","zone":"left-boards"},{"id":"c","zone":"slot"},{"id":"rw","zone":"right-boards"},{"id":"you1","zone":"left-point","isYou":true}],"opponents":[],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Where should the D pass?","options":[{"text":"To the winger along the wall on either side.","verdict":"correct","feedback":"Yes — safe, simple, starts the breakout."},{"text":"Cross-ice through the slot.","verdict":"wrong","feedback":"The riskiest pass in hockey. Gets picked off → goal."},{"text":"Skate it out herself.","verdict":"partial","feedback":"Works sometimes. Better option if a winger is open."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink28',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink28","type":"rink","cat":"Net-front","concept":"Stand where the goalie can''t see you","d":1,"pos":["F"],"sit":"Your D is shooting from the point. You''re a forward in front of the net. What''s your job?","why":"Screening and tipping from the net-front is how most U9 goals get scored.","tip":"Stand in front of the goalie — don''t run into the D''s shot.","scene":{"team":[{"id":"d","zone":"left-point","hasPuck":true},{"id":"you1","zone":"net-front","isYou":true}],"opponents":[],"puck":{"zone":"left-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"What''s your job at the net-front?","options":[{"text":"Stand in front of the goalie — screen them, tip the shot.","verdict":"correct","feedback":"Exactly — goalie can''t save what they can''t see."},{"text":"Skate away so the D can shoot clearly.","verdict":"wrong","feedback":"You WANT the screen. Stay put."},{"text":"Go to the blue line to help the D.","verdict":"partial","feedback":"You''re a forward. Net-front is where you matter."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink29',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink29","type":"rink","cat":"Zone Knowledge","concept":"Point positions","d":1,"pos":["F"],"sit":"On offense, where do your defencemen stand when your team has the puck deep?","why":"Ds stand at the points to keep the puck in the zone and take shots.","tip":"Points = top of the circles, near the blue line.","scene":{"team":[{"id":"d1","zone":"left-point"},{"id":"d2","zone":"right-point"},{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"right-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click a point (left or right).","zones":{"correct":["left-point","right-point"],"partial":["high-slot"],"wrong":["net-front","slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards"]},"feedback":{"correct":"Yes — that''s the point. Ds hold there.","partial":"Close — points are a bit wider, near the boards.","wrong":"That''s not the point. Points are the top corners of the zone."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u9rink30',
  'U9 / Novice',
  'u9',
  null,
  '{"level":"U9 / Novice","id":"u9rink30","type":"rink","cat":"Shift Management","concept":"Change on the fly","d":1,"pos":["F"],"sit":"You''re tired. Your team just got possession in the other team''s zone. Should you change?","why":"Changes happen when the puck is away from your net — never the other way.","tip":"Safe to change = puck deep in the offensive zone.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Tired. Puck''s in the O-zone. Change?","options":[{"text":"Yes — safe to change. Get off the ice.","verdict":"correct","feedback":"Correct — tired = off. The puck is deep and safe."},{"text":"No, stay until the puck comes out of the zone.","verdict":"wrong","feedback":"You''ll be too tired to back-check. Change now."},{"text":"Skate harder instead.","verdict":"partial","feedback":"Sometimes. But if you''re gassed, change is the right call."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink25',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink25","type":"rink","cat":"Breakout","concept":"Wall vs. middle read","d":2,"pos":["F","D"],"sit":"You''re a winger on the wall. The D looks to pass. There''s pressure on the wall.","why":"Under pressure on the wall, the middle D (or C) is usually the better release — but not always.","tip":"Pressure on wall → middle. No pressure → wall.","scene":{"team":[{"id":"d","zone":"behind-net","hasPuck":true},{"id":"you1","zone":"left-boards","isYou":true,"label":"LW"},{"id":"c","zone":"left-faceoff","label":"C"}],"opponents":[{"id":"f1","zone":"left-corner"}],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pressure''s on you. You want the D to…","options":[{"text":"Pass to the centre in the middle of the ice.","verdict":"correct","feedback":"Yes — escape the pressure to the middle, start the breakout clean."},{"text":"Pass to you on the wall anyway.","verdict":"wrong","feedback":"You''ll get hit and the puck dies. Bad read."},{"text":"Reverse to the other D.","verdict":"partial","feedback":"Fine sometimes. But if the middle is open, use it."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink26',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink26","type":"rink","cat":"Rush","concept":"Late-man on the 3-on-2","d":2,"pos":["F","D"],"sit":"Your team has a 3-on-2 rush. You''re the weak-side winger. Where do you go?","why":"The late-coming winger is the shooter on the rush — drive the far post for a tap-in.","tip":"Weak-side winger drives the far post.","scene":{"team":[{"id":"c","zone":"high-slot","hasPuck":true,"label":"C"},{"id":"m1","zone":"left-faceoff","label":"LW"},{"id":"you1","zone":"right-boards","isYou":true,"label":"RW"}],"opponents":[{"id":"d1","zone":"slot"},{"id":"d2","zone":"right-faceoff"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where the weak-side winger drives.","zones":{"correct":["net-front","right-faceoff"],"partial":["slot"],"wrong":["high-slot","left-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — far post for a back-door tap-in.","partial":"Slot''s OK, but the far post is gold on the 3-on-2.","wrong":"Too high — you''ve taken yourself out of the play."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink27',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink27","type":"rink","cat":"D-zone","concept":"Low F3 responsibility","d":2,"pos":["F","D"],"sit":"You''re the low forward (F3) in the D-zone. Where''s your spot?","why":"F3 hangs in the high slot as an outlet and also covers the strong-side D at the point.","tip":"F3 = high slot, eyes on strong-side point.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"label":"C"}],"opponents":[{"id":"o1","zone":"left-point","hasPuck":true},{"id":"o2","zone":"right-point"},{"id":"o3","zone":"net-front"}],"puck":{"zone":"left-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click F3''s starting spot.","zones":{"correct":["high-slot"],"partial":["slot","left-faceoff"],"wrong":["net-front","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — high slot. Support the D, cover the strong-side point.","partial":"Close, but high-slot is the textbook spot.","wrong":"Too deep or too wide. High slot is the anchor."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink28',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink28","type":"rink","cat":"Forecheck","concept":"F1 angle","d":2,"pos":["F","D"],"sit":"You''re F1 on the forecheck. Their D has the puck in the corner. How do you angle them?","why":"F1 angles the D toward the boards — not the middle — so they can''t escape to a clean play.","tip":"Angle them INTO the wall, not out of it.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"label":"F1"}],"opponents":[{"id":"d","zone":"left-corner","hasPuck":true}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"How do you take F1''s angle?","options":[{"text":"Angle from the middle out — force them into the wall.","verdict":"correct","feedback":"Yes — pin the play. No escape."},{"text":"Come at them from the wall toward the middle.","verdict":"wrong","feedback":"You just opened the ice. They''ll skate past you."},{"text":"Hit them as soon as you get there.","verdict":"partial","feedback":"Sometimes. But angle first, hit second."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink29',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink29","type":"rink","cat":"O-zone","concept":"Low cycle read","d":2,"pos":["F","D"],"sit":"Your teammate has the puck below the goal line on your wing. You''re the high forward. What''s your read?","why":"On a cycle, the high forward rotates low so the puck-carrier has a short support.","tip":"Cycle = high F drops low, creates F1-F2 rotation.","scene":{"team":[{"id":"m1","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"high-slot","isYou":true,"label":"F"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where you rotate.","zones":{"correct":["left-boards","left-faceoff"],"partial":["slot"],"wrong":["net-front","high-slot","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — drop low, give a short support. That''s a cycle.","partial":"Slot works as a screen, but the cycle needs a low support first.","wrong":"Staying high breaks the cycle. Get low."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink30',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink30","type":"rink","cat":"Rush Defense","concept":"Gap on a 2-on-1","d":2,"pos":["F","D"],"sit":"You''re the lone D on a 2-on-1. What''s the right gap?","why":"Tight gap gives the shooter no time. Sag off and you take away the pass but give up the shot.","tip":"Take the pass. Make the goalie beat the shooter.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"label":"D"}],"opponents":[{"id":"o1","zone":"left-faceoff","hasPuck":true},{"id":"o2","zone":"right-faceoff"}],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"2-on-1. Your job?","options":[{"text":"Stay in the middle. Take away the pass. Make the shooter beat the goalie.","verdict":"correct","feedback":"Yes — goalie''s job is the shot; yours is the pass."},{"text":"Charge the puck-carrier.","verdict":"wrong","feedback":"You just made it a 1-on-0 for the open guy."},{"text":"Drop to the ice to block.","verdict":"partial","feedback":"Last-ditch. If you''re there, the puck''s already going in."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink31',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink31","type":"rink","cat":"Rush Offense","concept":"Drive wide","d":2,"pos":["F","D"],"sit":"You have the puck crossing centre. The D is giving you the wide lane. What do you do?","why":"If the D gives you wide, take it. Speed beats them outside and opens up a wrap-around or pass.","tip":"Drive the lane they give you.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true}],"opponents":[{"id":"d1","zone":"slot"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where you take the puck.","zones":{"correct":["left-boards","left-faceoff"],"partial":["left-corner"],"wrong":["net-front","slot","high-slot","right-faceoff","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — drive wide, beat them with speed.","partial":"Eventually — but first take the open lane with speed.","wrong":"You''re skating into the D. Take the space they''re giving you."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink32',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink32","type":"rink","cat":"Face-off","concept":"Defensive zone faceoff — wing","d":1,"pos":["F","D"],"sit":"D-zone face-off on the left side. You''re the LW. What''s your first job?","why":"On a D-zone draw, the LW takes the left point man — stop them from getting a one-timer.","tip":"LW → left point. RW → right point.","scene":{"team":[{"id":"you1","zone":"left-faceoff","isYou":true,"label":"LW"}],"opponents":[{"id":"o1","zone":"left-point"},{"id":"o2","zone":"left-faceoff"}],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Puck drops. Your first move is…","options":[{"text":"Jump to the left point to take their D.","verdict":"correct","feedback":"Yes — winger''s job is the point."},{"text":"Battle for the puck in the circle.","verdict":"wrong","feedback":"That''s the centre''s job. You get the point."},{"text":"Skate to the net to screen.","verdict":"partial","feedback":"Only if the puck''s out and shot. Your D-zone job is the point."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink33',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink33","type":"rink","cat":"Systems","concept":"Neutral zone regroup","d":2,"pos":["F","D"],"sit":"You carried the puck to the red line. No one''s open. What''s the right read?","why":"Regrouping — turning back, finding a trailing teammate — is better than dumping into bad pressure.","tip":"No entry? Regroup. Don''t force it.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true},{"id":"d","zone":"left-point"}],"opponents":[{"id":"o1","zone":"slot"},{"id":"o2","zone":"right-faceoff"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"No entry open. You…","options":[{"text":"Turn back and pass to the D. Regroup.","verdict":"correct","feedback":"Yes — live to play the next rush."},{"text":"Dump-and-change even though nobody''s chasing.","verdict":"wrong","feedback":"That''s giving up possession for nothing."},{"text":"Fire it at the D''s skates.","verdict":"partial","feedback":"If you HAVE to get it in, sure. But better to regroup."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink34',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink34","type":"rink","cat":"Defensive","concept":"Stick on puck","d":1,"pos":["F","D"],"sit":"You''re a D. The puck-carrier is driving wide. What do you lead with?","why":"Stick-on-puck is how you take away plays without getting beat. Body second.","tip":"Stick first. Body second.","scene":{"team":[{"id":"you1","zone":"right-faceoff","isYou":true,"label":"D"}],"opponents":[{"id":"o1","zone":"right-corner","hasPuck":true}],"puck":{"zone":"right-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Attacker driving wide. You lead with…","options":[{"text":"Stick on the puck, body close.","verdict":"correct","feedback":"Yes — take the puck first; the body closes the door."},{"text":"Shoulder charge them into the boards.","verdict":"wrong","feedback":"Miss and it''s a breakaway. Stick first."},{"text":"Skate straight at them.","verdict":"partial","feedback":"You''ll get beat. Angle + stick."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink35',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink35","type":"rink","cat":"O-zone","concept":"Net-front vs. slot","d":1,"pos":["F","D"],"sit":"D is winding up for a point shot. Where do you want to be as the net-front forward?","why":"Net-front is for tips and screens — not for getting hit by the shot.","tip":"Stand to the side of the goalie — not in the shooting lane.","scene":{"team":[{"id":"d","zone":"right-point","hasPuck":true},{"id":"you1","zone":"net-front","isYou":true}],"opponents":[],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Click where you stand for tips.","zones":{"correct":["net-front"],"partial":["slot"],"wrong":["high-slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — net-front, offset from the shooter''s path. Tip and screen.","partial":"Slot''s fine for rebounds — net-front is better for screens.","wrong":"That''s not a tip spot."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink36',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink36","type":"rink","cat":"Systems","concept":"Backcheck lane","d":2,"pos":["F","D"],"sit":"The play turned. You''re the backchecking F. Which lane do you take?","why":"First F back takes the middle lane — the most dangerous ice.","tip":"First back = middle lane. Second back = wide lane.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[{"id":"o1","zone":"slot","hasPuck":true}],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You''re first back. Which lane?","options":[{"text":"The middle lane — the most dangerous.","verdict":"correct","feedback":"Yes. Kill the middle, force them wide."},{"text":"Follow the puck-carrier.","verdict":"wrong","feedback":"That collapses the middle and opens up passes."},{"text":"Head straight to net-front.","verdict":"partial","feedback":"Only if a shot''s already coming. Middle lane first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink37',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink37","type":"rink","cat":"Special Teams","concept":"PP half-wall one-timer","d":2,"pos":["F","D"],"sit":"Your team is on the power play. The puck comes to the half-wall. What''s the first look?","why":"Half-wall to net-front or to the weak-side point — those are PP goals.","tip":"Half-wall reads = net-front or weak-side D.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"hasPuck":true},{"id":"nf","zone":"net-front"},{"id":"dweak","zone":"right-point"}],"opponents":[{"id":"d1","zone":"slot"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"First PP read from the half-wall?","options":[{"text":"Net-front for the tip, or weak-side D for a one-timer.","verdict":"correct","feedback":"Yes — PP goals come from those two spots."},{"text":"Pass back to the strong-side D immediately.","verdict":"wrong","feedback":"That resets the PP but gives up your look. Scan first."},{"text":"Hold and cycle to the corner.","verdict":"partial","feedback":"Fine if nothing''s there. But scan the dangerous options first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink38',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink38","type":"rink","cat":"Transition","concept":"Quick-up","d":2,"pos":["F","D"],"sit":"Your D just won a puck battle. A teammate is streaking through centre. What should the D do?","why":"Quick-up passes catch the defense before they''re set — highest-value transition play.","tip":"Puck up fast beats any forecheck.","scene":{"team":[{"id":"d","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"high-slot","isYou":true,"label":"C"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"D won the puck. Best play?","options":[{"text":"Quick-up to the centre through the middle.","verdict":"correct","feedback":"Yes — fast pass, catches them before they set."},{"text":"Hold the puck and wait for support.","verdict":"wrong","feedback":"You give the forecheck time to get set. Bad read."},{"text":"Dump it out around the boards.","verdict":"partial","feedback":"Safe but slow. Quick-up is better when the lane''s open."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink39',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink39","type":"rink","cat":"Discipline","concept":"Don''t chase the hit","d":2,"pos":["F","D"],"sit":"A defender just finished a check on your teammate in the corner. You''re the nearest F. What do you do?","why":"Finishing the hit is fine; running across the ice to retaliate takes you out of position and costs goals.","tip":"Don''t chase. Play the puck.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[{"id":"o1","zone":"left-corner"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Teammate got hit. You…","options":[{"text":"Get to the puck or cover my check.","verdict":"correct","feedback":"Yes — play hockey, not revenge."},{"text":"Skate across to retaliate.","verdict":"wrong","feedback":"That''s two minutes and a goal against."},{"text":"Yell at the ref.","verdict":"partial","feedback":"Refs hate that and the play keeps going."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink40',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink40","type":"rink","cat":"Offensive","concept":"Net drive vs. wide","d":2,"pos":["F","D"],"sit":"You''re carrying the puck down the wing. The D is standing at the blue line. What''s the read?","why":"If the D stands still, drive through them. If they skate back with you, cut in.","tip":"Static D → drive. Skating D → cut inside.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"hasPuck":true}],"opponents":[{"id":"d","zone":"left-point"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"D is flat-footed at the blue line. You…","options":[{"text":"Drive through them with speed.","verdict":"correct","feedback":"Yes — a flat-footed D is easy to beat wide."},{"text":"Stop and wait for support.","verdict":"wrong","feedback":"You''ve given them time to recover."},{"text":"Chip the puck in behind.","verdict":"partial","feedback":"Works if a teammate is racing in. If you''re alone, drive."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink41',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink41","type":"rink","cat":"Faceoff","concept":"Offensive-zone draw — wing assignment","d":1,"pos":["F","D"],"sit":"Offensive zone draw. You''re the weak-side winger. What''s your job if your centre wins it back?","why":"On offensive zone wins, the weak-side winger crashes the net for the screen/rebound.","tip":"Weak-side W crashes net-front.","scene":{"team":[{"id":"you1","zone":"right-faceoff","isYou":true,"label":"RW"}],"opponents":[],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Your centre wins it. You skate to…","zones":{"correct":["net-front"],"partial":["slot"],"wrong":["high-slot","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — net-front for screen and rebound.","partial":"Slot''s a good rebound spot but net-front is the primary job.","wrong":"You''ve taken yourself out of the scoring chance."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink42',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink42","type":"rink","cat":"D-zone","concept":"Net-front coverage","d":2,"pos":["F","D"],"sit":"You''re a D. Their forward is parked net-front. What''s your job?","why":"Net-front D: box them out with body, stick across their stick. Keep them from a clean shot.","tip":"Body between them and the puck side.","scene":{"team":[{"id":"you1","zone":"net-front","isYou":true,"label":"D"}],"opponents":[{"id":"o1","zone":"net-front"}],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Net-front coverage is…","options":[{"text":"Body between them and the puck, stick on theirs.","verdict":"correct","feedback":"Yes — take away the tip and the rebound."},{"text":"Stand in front of the goalie.","verdict":"wrong","feedback":"That''s a screen for your OWN goalie. Bad."},{"text":"Just stand beside them.","verdict":"partial","feedback":"Partial. Body contact and stick-on-stick is the full answer."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink43',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink43","type":"rink","cat":"Systems","concept":"Support the weak-side D","d":2,"pos":["F","D"],"sit":"The puck is down low on the left boards. You''re the right defenceman. Where should you be?","why":"Weak-side D reads the play — usually slide to the middle to cover the slot and support the pinch.","tip":"Weak-side D slides to middle-point.","scene":{"team":[{"id":"m1","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"right-point","isYou":true,"label":"RD"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where does the weak-side D go?","zones":{"correct":["high-slot","slot"],"partial":["right-point"],"wrong":["net-front","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point"]},"feedback":{"correct":"Yes — slide to the middle, cover the slot.","partial":"You''re still at the point. Slide a bit middle.","wrong":"Too far from the play. Support the slot."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u11rink44',
  'U11 / Atom',
  'u11',
  null,
  '{"level":"U11 / Atom","id":"u11rink44","type":"rink","cat":"Awareness","concept":"Pre-scan","d":2,"pos":["F","D"],"sit":"A pass is coming to you on the wing. What should you do BEFORE it arrives?","why":"Pre-scanning — looking over your shoulder before the puck arrives — is what separates U11 from rep hockey.","tip":"Look BEFORE the puck, not after.","scene":{"team":[{"id":"d","zone":"left-point","hasPuck":true},{"id":"you1","zone":"left-boards","isYou":true}],"opponents":[],"puck":{"zone":"left-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pass coming. You…","options":[{"text":"Look over my shoulder to see who''s open.","verdict":"correct","feedback":"Yes — knowing what you''ll do BEFORE the puck arrives is a pro habit."},{"text":"Focus on the puck.","verdict":"wrong","feedback":"You''ll catch it, but you won''t know what to do next."},{"text":"Tap the stick for a target.","verdict":"partial","feedback":"Nice, but pre-scanning is more valuable."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink14',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink14","type":"rink","cat":"Zone Entry","concept":"Carry vs. chip vs. dump","d":2,"pos":["F","D"],"sit":"You''re at the red line with speed. Their D is at the blue line with a tight gap.","why":"Tight gap = chip-and-chase. No carry option. No reason to dump if you can chip behind them.","tip":"Tight D gap → chip behind.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true}],"opponents":[{"id":"d","zone":"slot"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Tight-gap D at the line. Best entry?","options":[{"text":"Chip the puck past them and race to recover.","verdict":"correct","feedback":"Yes — denies their pinch, reclaims in the O-zone."},{"text":"Try to carry through them.","verdict":"wrong","feedback":"You''ll get stopped. Wasted rush."},{"text":"Dump it in the corner.","verdict":"partial","feedback":"Gives up possession. Chip is better if you have speed."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink15',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink15","type":"rink","cat":"Breakout","concept":"Wheel under pressure","d":2,"pos":["F","D"],"sit":"Your D retrieves behind the net with F1 closing hard. All wingers are covered.","why":"If all outlets are covered, the D''s best read is to wheel — skate it out and beat F1 with speed.","tip":"No outlet + speed = wheel.","scene":{"team":[{"id":"d","zone":"behind-net","hasPuck":true},{"id":"you1","zone":"left-boards","isYou":true,"label":"LW"}],"opponents":[{"id":"f1","zone":"slot"},{"id":"f2","zone":"left-boards"}],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"F1 closing, wingers covered. D does…","options":[{"text":"Wheel it out — skate up the strong side and beat F1.","verdict":"correct","feedback":"Yes — wheel when outlets are covered."},{"text":"Reverse to the other D.","verdict":"wrong","feedback":"Other D is locked down too. Wheel is the move."},{"text":"Rim it hard around the boards.","verdict":"partial","feedback":"Last-resort. Wheel keeps possession."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink16',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink16","type":"rink","cat":"Defense","concept":"Standing up at the line","d":2,"pos":["F","D"],"sit":"You''re the weak-side D. A rush is developing on the strong side.","why":"Weak-side D stands up at the line to take away the cross-ice pass and keep gap on the late guy.","tip":"Weak-side D: hold the line, take the pass option.","scene":{"team":[{"id":"dstrong","zone":"right-point"},{"id":"you1","zone":"left-point","isYou":true,"label":"LD"}],"opponents":[{"id":"o1","zone":"right-faceoff","hasPuck":true},{"id":"o2","zone":"high-slot"}],"puck":{"zone":"right-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where do you hold?","zones":{"correct":["left-point","high-slot"],"partial":["slot"],"wrong":["net-front","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","right-point"]},"feedback":{"correct":"Yes — stand up, take the cross-ice pass away.","partial":"You''re closing the slot, which is fine, but holding the line is the primary job.","wrong":"You''re out of position. Hold the line."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink17',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink17","type":"rink","cat":"Forecheck","concept":"2-1-2 pressure read","d":2,"pos":["F","D"],"sit":"Your team runs a 2-1-2 forecheck. F1 takes the puck, F2 reads second support. Where does F2 go?","why":"F2 takes the second pass option — the D''s outlet. If F1 angles strong side, F2 kills the reverse.","tip":"F1 on the puck → F2 on the reverse/outlet.","scene":{"team":[{"id":"f1","zone":"left-corner"},{"id":"you1","zone":"slot","isYou":true,"label":"F2"}],"opponents":[{"id":"d1","zone":"left-corner","hasPuck":true},{"id":"d2","zone":"right-corner"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"F1 has strong side. F2 goes where?","zones":{"correct":["right-corner","behind-net"],"partial":["right-faceoff"],"wrong":["net-front","slot","high-slot","left-faceoff","left-corner","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — take away the reverse to the other D.","partial":"Fine if you pressure next, but behind-the-net is the textbook cut.","wrong":"That leaves the reverse wide open."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink18',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink18","type":"rink","cat":"Offensive Zone","concept":"Activate the D","d":2,"pos":["F","D"],"sit":"The puck is low. You''re the D at the blue line and a winger is open in the high slot.","why":"Activating — sneaking down to the slot — creates scoring chances your opponents can''t cover.","tip":"Activating D = sneaky, not wild.","scene":{"team":[{"id":"w","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"left-point","isYou":true,"label":"D"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Low puck, winger high and open. D''s move?","options":[{"text":"Slide down to the slot as a late option.","verdict":"correct","feedback":"Yes — activate into the open ice for a shot."},{"text":"Stay flat at the blue line.","verdict":"wrong","feedback":"That''s what they expect. Activate when it''s open."},{"text":"Call for the puck back.","verdict":"partial","feedback":"Sometimes. But activating creates a better shot."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink19',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink19","type":"rink","cat":"D-zone","concept":"Strong-side D in the corner","d":2,"pos":["F","D"],"sit":"The opposing winger has the puck in your corner. You''re the strong-side D.","why":"Strong-side D: stick-on-puck, body between them and the net, keep them on the wall.","tip":"Deny the cut to the slot.","scene":{"team":[{"id":"you1","zone":"left-corner","isYou":true,"label":"LD"}],"opponents":[{"id":"w","zone":"left-corner","hasPuck":true}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Their W on the wall with puck. You…","options":[{"text":"Pin them to the wall, keep them from cutting to the slot.","verdict":"correct","feedback":"Yes — wall-play, no middle."},{"text":"Stand off them waiting for help.","verdict":"wrong","feedback":"They''ll cut to the slot and score."},{"text":"Dive to the ice to block the pass.","verdict":"partial","feedback":"Too early. Tie them up first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink20',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink20","type":"rink","cat":"Rush","concept":"3-on-2 read — D takes puck","d":2,"pos":["F","D"],"sit":"You''re the puck-carrier on a 3-on-2. The strong-side D is skating backwards, the weak-side D is open.","why":"If the weak-side D is retreating, the puck-side shot is your best look. They''re giving you the strong-side net.","tip":"Shoot where the D isn''t.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true},{"id":"lw","zone":"left-faceoff"},{"id":"rw","zone":"right-faceoff"}],"opponents":[{"id":"d1","zone":"slot"},{"id":"d2","zone":"right-point"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Strong-side D on you, weak-side D retreating. You…","options":[{"text":"Shoot to the strong-side short-corner.","verdict":"correct","feedback":"Yes — they''re not covering that net."},{"text":"Drop pass and hope for a shot.","verdict":"wrong","feedback":"Drops kill momentum. Shoot."},{"text":"Pass cross-ice.","verdict":"partial","feedback":"Available, but the shot is there."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink21',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink21","type":"rink","cat":"Neutral Zone","concept":"1-2-2 trap","d":3,"pos":["F","D"],"sit":"The other team runs a 1-2-2 in the neutral zone. How should your D break it?","why":"1-2-2 gives you the wings. Use the middle-lane speed to force them into tough reads.","tip":"Trap neutralizer = quick middle-lane reads + board support.","scene":{"team":[{"id":"d","zone":"left-point","hasPuck":true},{"id":"c","zone":"high-slot"},{"id":"lw","zone":"left-boards"},{"id":"you1","zone":"right-boards","isYou":true,"label":"RW"}],"opponents":[],"puck":{"zone":"left-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Break the 1-2-2 by…","options":[{"text":"Quick middle pass to the C with wall wingers ready.","verdict":"correct","feedback":"Yes — exploit the middle, wings stretch wide."},{"text":"Dump it in always.","verdict":"wrong","feedback":"You give them back-side recovery. Lose possession."},{"text":"Cycle low to high.","verdict":"partial","feedback":"Good later. First break is a middle pass."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink22',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink22","type":"rink","cat":"Special Teams","concept":"PK diamond rotation","d":2,"pos":["F","D"],"sit":"You''re a PK forward. The puck moves from the strong-side point to the top. Who rotates?","why":"On a PK diamond, the top forward reads and the weak-side F fills behind. Wings cover points.","tip":"PK = rotate, don''t chase.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"label":"F"}],"opponents":[{"id":"o1","zone":"right-point","hasPuck":true},{"id":"o2","zone":"left-point"}],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Puck to top. You''re top F. You…","options":[{"text":"Slide to pressure the new puck-side point, stay in the lane.","verdict":"correct","feedback":"Yes — rotate, don''t chase."},{"text":"Charge into the corner.","verdict":"wrong","feedback":"You just broke the box."},{"text":"Drop to the slot.","verdict":"partial","feedback":"Sometimes. First move is the rotation."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink23',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink23","type":"rink","cat":"Offensive","concept":"Weak-side one-timer","d":2,"pos":["F","D"],"sit":"You''re the weak-side forward. The puck is on the strong-side half-wall. What''s your job?","why":"Weak-side F is the one-timer threat. Stay off the line to shoot.","tip":"Stand off the net post — off the goalie''s line.","scene":{"team":[{"id":"m","zone":"left-boards","hasPuck":true},{"id":"you1","zone":"right-faceoff","isYou":true,"label":"F"}],"opponents":[],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where do you set up for the weak-side shot?","zones":{"correct":["right-faceoff"],"partial":["slot","right-point"],"wrong":["net-front","high-slot","left-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point"]},"feedback":{"correct":"Yes — weak-side faceoff dot, stick loaded.","partial":"Slot''s closer but you want a shooting angle — dot''s cleaner.","wrong":"Too far — no shot from there."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink24',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink24","type":"rink","cat":"Transition","concept":"Second-forward support","d":2,"pos":["F","D"],"sit":"Your teammate wins a puck in the corner with immediate pressure. What do you do as F2?","why":"F2 gives a short support over the puck-carrier''s shoulder — never far away, never right on top.","tip":"F2 = 15 feet away, above the puck.","scene":{"team":[{"id":"f1","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"high-slot","isYou":true,"label":"F2"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where does F2 support?","zones":{"correct":["left-boards","left-faceoff"],"partial":["slot"],"wrong":["net-front","high-slot","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — short support on the wall, above the puck.","partial":"Slot works if you''re screening. Short support is the first job.","wrong":"Too far. F1 can''t hit you."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink25',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink25","type":"rink","cat":"Defense","concept":"Gap on an odd-man rush","d":3,"pos":["F","D"],"sit":"You''re alone against a 3-on-1. Puck-carrier is in the middle. Two wingers drive wide.","why":"3-on-1: stay middle, take the pass to the strong side (shooter''s-left), force the weak-side shot.","tip":"Cover middle, force low-% shot.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"label":"D"}],"opponents":[{"id":"o1","zone":"high-slot","hasPuck":true},{"id":"o2","zone":"left-faceoff"},{"id":"o3","zone":"right-faceoff"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"3-on-1 against. Best play?","options":[{"text":"Stay centered, take the strong-side pass, let goalie play shot.","verdict":"correct","feedback":"Yes — you can''t cover everything; cover the most dangerous."},{"text":"Charge the puck-carrier.","verdict":"wrong","feedback":"Now it''s 2-on-0."},{"text":"Drop to block.","verdict":"partial","feedback":"Only if the shot is already coming."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink26',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink26","type":"rink","cat":"Awareness","concept":"Head on a swivel","d":2,"pos":["F","D"],"sit":"You''re a D carrying the puck up the strong side. A F1 is bearing down. What do you do?","why":"Constantly scanning — head on a swivel — is what keeps the D a step ahead of the forecheck.","tip":"Scan shoulder-to-shoulder before every touch.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"label":"D","hasPuck":true}],"opponents":[{"id":"f1","zone":"left-corner"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"F1 bearing down. You…","options":[{"text":"Pre-scan both sides, choose the support option.","verdict":"correct","feedback":"Yes — scan, then decide."},{"text":"Focus only on the puck.","verdict":"wrong","feedback":"Head down = bad pass or a hit."},{"text":"Stop and wait for F1.","verdict":"partial","feedback":"Dangerous. Move with a plan."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink27',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink27","type":"rink","cat":"Puck Protection","concept":"Cutback","d":2,"pos":["F","D"],"sit":"You''re skating the puck into the O-zone corner with a defender on your back.","why":"A cutback into space delays the defender and opens a cycle option.","tip":"Slow is smooth. Smooth is fast.","scene":{"team":[{"id":"you1","zone":"left-corner","isYou":true,"hasPuck":true}],"opponents":[{"id":"d","zone":"left-corner"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Defender on your back in the corner. You…","options":[{"text":"Cutback into open ice, find a cycle partner.","verdict":"correct","feedback":"Yes — create time, don''t force a play."},{"text":"Throw the puck to the net.","verdict":"wrong","feedback":"Throwaway. Possession matters."},{"text":"Try to take the D 1-on-1.","verdict":"partial","feedback":"Possible, but cutback is higher percentage."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink28',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink28","type":"rink","cat":"Defense","concept":"F3 helps on a 2-on-2","d":2,"pos":["F","D"],"sit":"A 2-on-2 rush is coming. You''re F3, late back. What''s your job?","why":"F3 takes the slot or the third attacker if one trails — don''t duplicate what the D is already doing.","tip":"F3 covers what D can''t.","scene":{"team":[{"id":"d1","zone":"slot"},{"id":"d2","zone":"right-point"},{"id":"you1","zone":"high-slot","isYou":true,"label":"F3"}],"opponents":[{"id":"o1","zone":"left-faceoff","hasPuck":true},{"id":"o2","zone":"right-faceoff"},{"id":"o3","zone":"high-slot"}],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Trailer in the slot. F3 does…","options":[{"text":"Take the trailer — stick on stick in the slot.","verdict":"correct","feedback":"Yes — F3 covers the slot trailer."},{"text":"Chase the puck-carrier.","verdict":"wrong","feedback":"The D already has them. Don''t duplicate."},{"text":"Drop to net-front.","verdict":"partial","feedback":"Only if the D can''t box out."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink29',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink29","type":"rink","cat":"Offensive","concept":"Shot mentality","d":1,"pos":["F","D"],"sit":"You''re open in the high slot. A pass just arrived. What''s your first thought?","why":"Shoot first. Pass only if the shot isn''t there. Too many U13s pass up shots.","tip":"Shoot. The rebound is the next pass.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true}],"opponents":[{"id":"d","zone":"net-front"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You''re open in the slot with the puck. You…","options":[{"text":"Shoot immediately.","verdict":"correct","feedback":"Yes — goalies hate quick releases from the slot."},{"text":"Look for a pretty pass.","verdict":"wrong","feedback":"Classic U13 miss. Shoot."},{"text":"Stickhandle to get a better angle.","verdict":"partial","feedback":"Sometimes — but release speed matters more than angle."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink30',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink30","type":"rink","cat":"Systems","concept":"D-to-D breakout","d":2,"pos":["F","D"],"sit":"Strong-side D has the puck with pressure. Weak-side D is open.","why":"D-to-D reverses the forecheck and resets the breakout — buys a second of space.","tip":"D-to-D changes the forecheck angle.","scene":{"team":[{"id":"d1","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"right-corner","isYou":true,"label":"RD"}],"opponents":[{"id":"f1","zone":"left-corner"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pressure on your partner. Best play?","options":[{"text":"Open for a D-to-D, let them reverse to you.","verdict":"correct","feedback":"Yes — reset the breakout."},{"text":"Go help in the corner.","verdict":"wrong","feedback":"Now both Ds are in the corner and F1 has the middle."},{"text":"Skate to the front of the net.","verdict":"partial","feedback":"That''s not a D-zone move."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink31',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink31","type":"rink","cat":"Compete","concept":"Stick lifts win pucks","d":1,"pos":["F","D"],"sit":"A loose puck in the neutral zone. A defender''s stick is in the lane.","why":"Stick-lift is how you steal pucks cleanly. Pokes miss. Lifts work.","tip":"Lift through their stick, not at the puck.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[{"id":"o1","zone":"high-slot"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Contested loose puck. You…","options":[{"text":"Stick-lift their stick, then take the puck.","verdict":"correct","feedback":"Yes — textbook puck-battle move."},{"text":"Cross-check them to get position.","verdict":"wrong","feedback":"Penalty — you lose possession and a power play."},{"text":"Poke at the puck.","verdict":"partial","feedback":"Low-% move. Lifts work better."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink32',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink32","type":"rink","cat":"Systems","concept":"Backdoor option","d":2,"pos":["F","D"],"sit":"You''re weak-side F. Your team cycles to the strong-side half-wall.","why":"The backdoor is the weak-side forward sneaking to the far post for a one-touch goal.","tip":"Backdoor = weak-side F hiding off the post.","scene":{"team":[{"id":"m","zone":"left-boards","hasPuck":true},{"id":"you1","zone":"right-faceoff","isYou":true,"label":"RW"}],"opponents":[],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where do you hide for the backdoor?","zones":{"correct":["net-front"],"partial":["right-faceoff","slot"],"wrong":["high-slot","left-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — far post, off the goalie''s sightline.","partial":"Closer in is the play.","wrong":"Out of range. Backdoor is the FAR side of the net."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink33',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink33","type":"rink","cat":"Defense","concept":"Box-out on a shot","d":2,"pos":["F","D"],"sit":"A point shot is coming. You''re a D. Their forward is between you and the net.","why":"Box-out: get a body on them and keep them from touching the rebound.","tip":"Tie up the stick, body in front.","scene":{"team":[{"id":"you1","zone":"net-front","isYou":true,"label":"D"}],"opponents":[{"id":"o1","zone":"net-front"},{"id":"o2","zone":"right-point","hasPuck":true}],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Point shot coming. Forward in front. You…","options":[{"text":"Tie up their stick and body them to the outside.","verdict":"correct","feedback":"Yes — no rebound goal."},{"text":"Look at the shot.","verdict":"wrong","feedback":"You''ll miss the forward and they''ll bury the rebound."},{"text":"Drop to block.","verdict":"partial","feedback":"Only if you HAVE to. Box-out first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink34',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink34","type":"rink","cat":"Puck Skills","concept":"Give-and-go","d":2,"pos":["F","D"],"sit":"You pass to a teammate and want the puck back. How do you signal?","why":"Give-and-go works when the passer moves to space immediately after the pass.","tip":"Pass and move — not pass and stand.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true},{"id":"m","zone":"left-faceoff","hasPuck":true}],"opponents":[],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You just passed. You…","options":[{"text":"Skate to open ice and call for it back.","verdict":"correct","feedback":"Yes — that''s the ''go'' in give-and-go."},{"text":"Stand still watching.","verdict":"wrong","feedback":"Now your teammate has no return option."},{"text":"Skate straight to the net.","verdict":"partial","feedback":"Sometimes. Open ice gives a cleaner return."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink35',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink35","type":"rink","cat":"Compete","concept":"Win the race","d":1,"pos":["F","D"],"sit":"A loose puck is heading to the offensive corner. Their D and you are neck-and-neck.","why":"First to the puck with leverage wins the race and the zone.","tip":"Short first steps. Beat them to the spot.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[{"id":"d","zone":"slot"}],"puck":{"zone":"right-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Race to a loose puck. Your move?","options":[{"text":"Lower my shoulder, box them off the lane.","verdict":"correct","feedback":"Yes — legal leverage wins pucks."},{"text":"Chop their stick early.","verdict":"wrong","feedback":"Slashing penalty. Bad trade."},{"text":"Let them have it and cover back.","verdict":"partial","feedback":"Too passive. Compete for it."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink36',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink36","type":"rink","cat":"Neutral Zone","concept":"Regroup with the D","d":2,"pos":["F","D"],"sit":"Entry denied. Your team regroups. The D is at the red line with the puck. Where do you go?","why":"On a regroup, Fs curl to the strong side to accept the next pass with speed.","tip":"Regroup = curl back, get speed before reversing direction.","scene":{"team":[{"id":"d","zone":"high-slot","hasPuck":true},{"id":"you1","zone":"slot","isYou":true,"label":"F"}],"opponents":[],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where do Fs go on the regroup?","zones":{"correct":["left-faceoff","right-faceoff"],"partial":["high-slot"],"wrong":["net-front","slot","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — curl wide into speed, strong side.","partial":"Stay moving, but wider is better.","wrong":"Too static. You need to generate speed."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink37',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink37","type":"rink","cat":"Offensive Zone","concept":"Keep the puck alive on walls","d":2,"pos":["F","D"],"sit":"A rim from the D is coming around the boards. You''re the weak-side forward at the wall.","why":"Getting a piece of the rim to keep it alive in the zone is a simple, winnable puck-battle.","tip":"Angle to the wall, one-touch it down low.","scene":{"team":[{"id":"you1","zone":"right-boards","isYou":true,"label":"RW"}],"opponents":[],"puck":{"zone":"right-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Rim is coming at you. Best play?","options":[{"text":"Angle to the wall, one-touch it to the corner.","verdict":"correct","feedback":"Yes — keep it alive in their zone."},{"text":"Stand still and let it come.","verdict":"wrong","feedback":"You''ll give the opposing D time to get there first."},{"text":"Try to pick it clean with your stick.","verdict":"partial","feedback":"Low-% under pressure. One-touch is better."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u13rink38',
  'U13 / Peewee',
  'u13',
  null,
  '{"level":"U13 / Peewee","id":"u13rink38","type":"rink","cat":"Leadership","concept":"Bench behavior","d":1,"pos":["F","D"],"sit":"Your line just got scored on. You''re heading to the bench.","why":"Body language is leadership. Heads up, short shift, ready to go again.","tip":"Next shift matters more than last shift.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Scored against. You head to the bench. You…","options":[{"text":"Head up, ready for my next shift. Short memory.","verdict":"correct","feedback":"Yes — great players reset fast."},{"text":"Slam my stick on the boards.","verdict":"wrong","feedback":"Coaches notice. Teammates notice. Fix it next shift."},{"text":"Blame the goalie under my breath.","verdict":"partial","feedback":"Low move. Own the mistake, move on."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink13',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink13","type":"rink","cat":"Forecheck","concept":"1-2-2 neutral zone read","d":2,"pos":["F","D"],"sit":"Their team has just gained their O-zone with a 5-man unit. Your team runs 1-2-2. Where''s F2?","why":"F2 in a 1-2-2 pressures the first pass — usually the strong-side wall. Deny the up.","tip":"F2 kills the wall, lets F1 finish.","scene":{"team":[{"id":"f1","zone":"left-corner"},{"id":"you1","zone":"left-boards","isYou":true,"label":"F2"}],"opponents":[{"id":"d","zone":"left-corner","hasPuck":true},{"id":"w","zone":"left-boards"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"F2 position?","zones":{"correct":["left-boards","left-faceoff"],"partial":["slot"],"wrong":["net-front","high-slot","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — kill the wall option as F1 pressures.","partial":"Close — but strong-side wall is the textbook.","wrong":"That''s F3''s job. You''re F2."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink14',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink14","type":"rink","cat":"Breakout","concept":"Stretch option","d":2,"pos":["F","D"],"sit":"Your D has an outlet and a winger is streaking through centre. What''s the best pass?","why":"Stretch passes to moving wings catch the D flat-footed and create partial breakaways.","tip":"Stretch when the weak-side W has speed.","scene":{"team":[{"id":"d","zone":"behind-net","hasPuck":true},{"id":"w","zone":"high-slot"},{"id":"you1","zone":"right-faceoff","isYou":true,"label":"RW"}],"opponents":[{"id":"forecheck","zone":"left-corner"}],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Your W flying through centre. D''s best pass?","options":[{"text":"Stretch to the moving W.","verdict":"correct","feedback":"Yes — speed-on-speed, catches their D cold."},{"text":"Safe up to a stationary winger.","verdict":"wrong","feedback":"Safe but slower — you miss the stretch."},{"text":"Carry it out himself.","verdict":"partial","feedback":"If the stretch is there, use it."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink15',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink15","type":"rink","cat":"Defense","concept":"Weak-side pinch or hold","d":3,"pos":["F","D"],"sit":"You''re the weak-side D. Puck is on the strong-side half-wall. Their F is trying to chip it past your partner.","why":"Weak-side D reads the chip attempt — if their F is winning the battle, hold the line. If your D has it, pinch.","tip":"Pinch only when your partner has control.","scene":{"team":[{"id":"d1","zone":"left-boards"},{"id":"you1","zone":"right-point","isYou":true,"label":"RD"}],"opponents":[{"id":"o1","zone":"left-boards","hasPuck":true}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Your partner''s battling on the wall. You…","options":[{"text":"Hold the line, ready to collapse if they lose it.","verdict":"correct","feedback":"Yes — don''t get beaten both sides."},{"text":"Pinch aggressively to help.","verdict":"wrong","feedback":"If they win, you''re caught. Hold."},{"text":"Skate to the slot.","verdict":"partial","feedback":"Too far from the play."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink16',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink16","type":"rink","cat":"Transition","concept":"Regroup triggers","d":2,"pos":["F","D"],"sit":"Your D has the puck in the neutral zone. F1 on the other team is pressuring. You''re the centre.","why":"On a regroup trigger, C curls back to support low and gives the D a second outlet.","tip":"C curls back to support the D.","scene":{"team":[{"id":"d","zone":"high-slot","hasPuck":true},{"id":"you1","zone":"slot","isYou":true,"label":"C"}],"opponents":[{"id":"f1","zone":"high-slot"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where does C support on the regroup?","zones":{"correct":["high-slot","left-boards"],"partial":["slot"],"wrong":["net-front","left-faceoff","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — low support for the D, gives a second outlet.","partial":"That supports but doesn''t create a clean outlet. Low is better.","wrong":"Too deep — D can''t hit you."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink17',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink17","type":"rink","cat":"Offensive Zone","concept":"High cycle","d":3,"pos":["F","D"],"sit":"Your team cycles high-to-low. You''re the high-slot F. Where do you move?","why":"On a high cycle, the high-slot F drops toward the cycler to give a one-timer option.","tip":"High cycle = drop to support, not hover.","scene":{"team":[{"id":"low","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"high-slot","isYou":true,"label":"F"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"High F''s move on the cycle?","zones":{"correct":["left-faceoff","slot"],"partial":["high-slot"],"wrong":["net-front","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — drop into the shooting lane for a one-timer.","partial":"Hovering doesn''t help the cycle.","wrong":"Too high. Drop lower."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink18',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink18","type":"rink","cat":"Special Teams","concept":"PP umbrella entry","d":3,"pos":["F","D"],"sit":"Your team''s PP runs an umbrella. First pass comes to the high-point F. What''s the read?","why":"Umbrella PP: high F scans left-wall and right-wall options. Reads the PK rotation.","tip":"High F is the distributor, not the shooter (usually).","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true,"label":"F"},{"id":"lw","zone":"left-boards"},{"id":"rw","zone":"right-boards"},{"id":"nf","zone":"net-front"}],"opponents":[],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Umbrella, puck on high-F. Read?","options":[{"text":"Scan wall-to-wall, pick the open half-wall.","verdict":"correct","feedback":"Yes — high F distributes, reads PK."},{"text":"Shoot every time.","verdict":"wrong","feedback":"Only when it''s truly open. Distribute first."},{"text":"Pass to net-front.","verdict":"partial","feedback":"Dangerous — often covered. Half-wall first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink19',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink19","type":"rink","cat":"Physical","concept":"Finish the check","d":2,"pos":["F","D"],"sit":"A forward is about to pick up a puck along the wall. You''re closing.","why":"Finishing the check legally takes them out of the play and establishes the wall.","tip":"Angle in, finish through — not at — them.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"label":"F"}],"opponents":[{"id":"o","zone":"left-boards"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"They''re reaching for the puck on the wall. You…","options":[{"text":"Finish the check legally — shoulder-to-body.","verdict":"correct","feedback":"Yes — take them out, reclaim possession."},{"text":"Hit their head.","verdict":"wrong","feedback":"Major penalty. You just lost the team 5 minutes."},{"text":"Coast through the contact.","verdict":"partial","feedback":"Soft — you left a free puck."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink20',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink20","type":"rink","cat":"Defense","concept":"Close the gap as D","d":2,"pos":["F","D"],"sit":"You''re a D backing off on a rush. The puck-carrier slows down at your blue line.","why":"When a carrier slows, close the gap hard — don''t give them time to survey.","tip":"Slow carrier → aggressive gap.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"label":"D"}],"opponents":[{"id":"o","zone":"high-slot","hasPuck":true}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Carrier slowed down at your line. You…","options":[{"text":"Close the gap hard — stick on puck.","verdict":"correct","feedback":"Yes — a slow carrier is inviting pressure."},{"text":"Stay back and wait for the rush.","verdict":"wrong","feedback":"That gives them time to set up plays."},{"text":"Retreat to the hashmarks.","verdict":"partial","feedback":"Too passive."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink21',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink21","type":"rink","cat":"Systems","concept":"Strong-side support","d":2,"pos":["F","D"],"sit":"The puck goes into your team''s strong-side corner. You''re F3 (C usually).","why":"F3 in support means covering the high slot as an outlet, not drifting to the point.","tip":"F3 = high slot anchor.","scene":{"team":[{"id":"f1","zone":"left-corner"},{"id":"you1","zone":"high-slot","isYou":true,"label":"F3"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Where''s F3?","zones":{"correct":["high-slot"],"partial":["slot","left-faceoff"],"wrong":["net-front","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — high slot, available for the up.","partial":"You drifted. Anchor at high slot.","wrong":"That''s not F3''s job."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink22',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink22","type":"rink","cat":"Transition","concept":"Pre-scan before receiving","d":2,"pos":["F","D"],"sit":"A pass is coming to you in transition. Defender behind you is closing.","why":"Pre-scanning before reception gives you a plan — turn up-ice without hesitation.","tip":"Scan 3 times: before, during, after reception.","scene":{"team":[{"id":"d","zone":"behind-net","hasPuck":true},{"id":"you1","zone":"left-boards","isYou":true}],"opponents":[{"id":"f","zone":"left-corner"}],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pass coming. Defender behind. You…","options":[{"text":"Pre-scan, receive open, turn up-ice in one motion.","verdict":"correct","feedback":"Yes — pros-in-training. Pre-scan wins possession."},{"text":"Focus on the puck only.","verdict":"wrong","feedback":"You''ll catch it but get hit immediately."},{"text":"Call for a different pass.","verdict":"partial","feedback":"Too late — the pass is on its way."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink23',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink23","type":"rink","cat":"Systems","concept":"D-pair rotation","d":3,"pos":["F","D"],"sit":"Puck goes up the strong side. Weak-side D is the nearest support. What''s the rotation?","why":"D-pair rotation: one pressures, one supports. Never both pressure, never both support.","tip":"One on the puck, one reading the ice.","scene":{"team":[{"id":"ds","zone":"left-corner"},{"id":"you1","zone":"right-point","isYou":true,"label":"RD"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Weak-side D''s job here?","options":[{"text":"Read the play, slide middle, cover the slot.","verdict":"correct","feedback":"Yes — D pair always has one reading, one pressuring."},{"text":"Pinch on the weak side.","verdict":"wrong","feedback":"Now both Ds are out of position."},{"text":"Skate back to your own net.","verdict":"partial","feedback":"Too deep — you need to support."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink24',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink24","type":"rink","cat":"Offensive Zone","concept":"Layered attack","d":3,"pos":["F","D"],"sit":"Puck is below the goal line. Your team has numbers. How do you layer the attack?","why":"Layered attack = low cycle + mid-slot support + weak-side cover. Three threats, not one.","tip":"Three layers beat any defense.","scene":{"team":[{"id":"low","zone":"left-corner","hasPuck":true},{"id":"you1","zone":"slot","isYou":true,"label":"F"},{"id":"w","zone":"right-faceoff"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"You''re the mid-layer. Where do you set?","zones":{"correct":["slot","high-slot"],"partial":["left-faceoff"],"wrong":["net-front","right-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — mid-slot support, ready for the shot.","partial":"Too low. Mid-slot is the layer.","wrong":"You''re on the low layer — duplicate coverage."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink25',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink25","type":"rink","cat":"Rush","concept":"Delay and support","d":3,"pos":["F","D"],"sit":"You carry the puck at a wall with no entry open. A teammate is trailing.","why":"Delay behind the net creates time for the trailer to arrive — called a delay game.","tip":"Delay = buy time for the trailer.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"hasPuck":true},{"id":"trailer","zone":"high-slot"}],"opponents":[{"id":"d","zone":"left-point"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"No entry, trailer coming. You…","options":[{"text":"Delay behind the net, drop to the trailer.","verdict":"correct","feedback":"Yes — classic delay game."},{"text":"Force the entry anyway.","verdict":"wrong","feedback":"Turnover and transition against."},{"text":"Dump and change.","verdict":"partial","feedback":"If delay is available, use it. Dump is a last resort."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink26',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink26","type":"rink","cat":"Special Teams","concept":"PK clear — rim or ice","d":2,"pos":["F","D"],"sit":"You just cleared a puck on the PK, shorthanded. Which clear is better?","why":"On a PK clear, rim it hard if PK time is ticking; ice it only if you can''t reach the boards clean.","tip":"Rim > ice on the PK — keeps pressure off.","scene":{"team":[{"id":"you1","zone":"left-corner","isYou":true,"hasPuck":true,"label":"PK F"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"PK clear — best option?","options":[{"text":"Rim it hard around the boards to the far corner.","verdict":"correct","feedback":"Yes — rim gets it deep without icing."},{"text":"Dump it up the middle of the ice.","verdict":"wrong","feedback":"Picked off — PP goal."},{"text":"Ice it.","verdict":"partial","feedback":"Only if you can''t rim. Icing brings the draw back in."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink27',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink27","type":"rink","cat":"Defense","concept":"D-zone coverage rotation","d":3,"pos":["F","D"],"sit":"Their winger enters your zone on the weak side. Your strong-side D is caught up.","why":"Strong-side F3 drops low to pick up the winger — a rotation, not a scramble.","tip":"D in trouble → F3 drops low.","scene":{"team":[{"id":"ds","zone":"high-slot"},{"id":"dw","zone":"right-point"},{"id":"you1","zone":"slot","isYou":true,"label":"F3"}],"opponents":[{"id":"w","zone":"left-boards","hasPuck":true}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"D out of position. F3…","options":[{"text":"Drops low to cover the puck-carrier.","verdict":"correct","feedback":"Yes — rotation, not panic."},{"text":"Stays high at the point.","verdict":"wrong","feedback":"The winger has a clear lane."},{"text":"Skates to the opposite corner.","verdict":"partial","feedback":"Unrelated. Cover the puck."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink28',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink28","type":"rink","cat":"Offensive","concept":"Quick release","d":2,"pos":["F","D"],"sit":"You receive a pass at the top of the circles with a window to shoot.","why":"Quick releases — before the goalie can square — are how U15+ scorers actually score.","tip":"Don''t stickhandle. Release.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true}],"opponents":[],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pass received, window open. You…","options":[{"text":"One-timer or snap shot immediately.","verdict":"correct","feedback":"Yes — before the goalie squares up."},{"text":"Stickhandle to get a better angle.","verdict":"wrong","feedback":"You just gave the goalie time."},{"text":"Walk in toward the net.","verdict":"partial","feedback":"Sometimes. But release speed is higher value."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink29',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink29","type":"rink","cat":"Compete","concept":"Second effort","d":1,"pos":["F","D"],"sit":"You lose a puck battle along the wall. What do you do next?","why":"Second-effort plays — not giving up — are the difference between U15 and rep-level compete.","tip":"First loss is normal. Second loss is a habit.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true}],"opponents":[{"id":"o","zone":"left-boards","hasPuck":true}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You lost the battle. Now you…","options":[{"text":"Re-engage immediately — second effort, stick-lift, disrupt.","verdict":"correct","feedback":"Yes — pros make second efforts."},{"text":"Glide back defensively.","verdict":"wrong","feedback":"You just gave up on the play."},{"text":"Call for help.","verdict":"partial","feedback":"Only if you can''t second-effort."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink30',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink30","type":"rink","cat":"Systems","concept":"Off-side wall reception","d":2,"pos":["F","D"],"sit":"A pass is coming off the wall to you on the off side.","why":"Receiving on your off side requires pre-scanning and quick hands — not turning your back.","tip":"Receive open, don''t turn your back.","scene":{"team":[{"id":"you1","zone":"right-boards","isYou":true,"label":"LW on off-side"}],"opponents":[],"puck":{"zone":"right-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Off-side wall pass. You…","options":[{"text":"Open my body up-ice, receive with forehand, scan.","verdict":"correct","feedback":"Yes — pro habit. Body open = vision open."},{"text":"Turn my back to the defender.","verdict":"wrong","feedback":"Now you can''t see anything. Bad habit."},{"text":"Catch it on the backhand.","verdict":"partial","feedback":"Workable, but forehand-open is cleaner."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink31',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink31","type":"rink","cat":"Awareness","concept":"Read the reset","d":3,"pos":["F","D"],"sit":"The other team just reset through their D. Where are you looking next?","why":"Reads after the reset — the next pass option — are what the best U15s see two steps ahead.","tip":"Anticipate, don''t chase.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[{"id":"d","zone":"right-point","hasPuck":true},{"id":"w","zone":"right-boards"}],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"After reset. You scan for…","options":[{"text":"The next pass option — usually the weak-side wing or a backdoor.","verdict":"correct","feedback":"Yes — anticipate the pattern."},{"text":"The D''s shot.","verdict":"wrong","feedback":"Too late — react to the next puck, not this one."},{"text":"The puck only.","verdict":"partial","feedback":"You''ll be a step behind."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u15rink32',
  'U15 / Bantam',
  'u15',
  null,
  '{"level":"U15 / Bantam","id":"u15rink32","type":"rink","cat":"Leadership","concept":"Call out coverage","d":1,"pos":["F","D"],"sit":"Your teammate''s check is in the slot unmarked. What do you do?","why":"Communication wins games. Call it out — your teammate covers.","tip":"Talk is the cheapest edge in hockey.","scene":{"team":[{"id":"you1","zone":"right-boards","isYou":true},{"id":"m","zone":"right-point"}],"opponents":[{"id":"o","zone":"slot"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Their F is open in the slot and nobody''s on them. You…","options":[{"text":"Yell to your teammate — ''slot, slot!'' — they cover.","verdict":"correct","feedback":"Yes — talking saves goals."},{"text":"Skate over and cover yourself.","verdict":"wrong","feedback":"Now you''ve left your check."},{"text":"Assume someone''s on it.","verdict":"partial","feedback":"That''s how open-net goals happen."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink13',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink13","type":"rink","cat":"Game Management","concept":"Protect the lead","d":2,"pos":["F","D"],"sit":"Up 3-2 with 2:00 left. You have the puck on the half-wall with a winger closing.","why":"In game-management situations, possession and wall-play outrank risk. Simple wins.","tip":"Up late = chip deep or wall rim. Never force the middle.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"hasPuck":true}],"opponents":[{"id":"f","zone":"left-faceoff"}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Up 3-2, 2:00 left. You…","options":[{"text":"Chip it deep to their zone, change if possible.","verdict":"correct","feedback":"Yes — keep it simple, kill time."},{"text":"Try a cross-ice pass.","verdict":"wrong","feedback":"Turnover → tying goal. Never force in this situation."},{"text":"Hold and eat the hit.","verdict":"partial","feedback":"Fine, but chip-and-change is cleaner."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink14',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink14","type":"rink","cat":"Neutral Zone","concept":"Counter-trap strategy","d":3,"pos":["F","D"],"sit":"Their team plays a tight 1-3-1. Your team is in the D-zone with possession.","why":"Against a 1-3-1, use the strong-side wing with speed, then flip to the weak-side D for a stretch.","tip":"1-3-1 = exploit the seams with fast switches.","scene":{"team":[{"id":"d","zone":"left-corner","hasPuck":true},{"id":"c","zone":"slot"},{"id":"lw","zone":"left-boards"},{"id":"rw","zone":"right-boards"},{"id":"you1","zone":"right-point","isYou":true,"label":"RD"}],"opponents":[],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Break the 1-3-1 how?","options":[{"text":"Quick D-to-D, stretch to weak-side winger in full flight.","verdict":"correct","feedback":"Yes — switch sides, exploit the seam."},{"text":"Skate it up the middle.","verdict":"wrong","feedback":"That''s exactly where their box is. Dead puck."},{"text":"Dump and chase.","verdict":"partial","feedback":"Gives up possession — the whole point of the trap."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink15',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink15","type":"rink","cat":"Defense","concept":"Active stick in the slot","d":2,"pos":["F","D"],"sit":"You''re a D covering a slot man. The puck swings to the half-wall.","why":"Active stick in the slot denies the one-timer pass. Static stick = goal.","tip":"Stick in the passing lane, not beside you.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true,"label":"D"}],"opponents":[{"id":"nf","zone":"slot"},{"id":"w","zone":"left-boards","hasPuck":true}],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Coverage position?","options":[{"text":"Stick in the passing lane to the slot man, body between them and puck.","verdict":"correct","feedback":"Yes — active stick wins."},{"text":"Face the puck only.","verdict":"wrong","feedback":"Slot man gets a clean one-timer."},{"text":"Hug the slot man.","verdict":"partial","feedback":"Good body but no stick = pass still goes through."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink16',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink16","type":"rink","cat":"Transition","concept":"Weak-side F in the rush","d":3,"pos":["F","D"],"sit":"Your team broke out. You''re the weak-side F. Where should you be at the opposing blue line?","why":"Weak-side F is the late-man threat — drives the far post for the back-door tap-in.","tip":"Late-man drives hard to the far post.","scene":{"team":[{"id":"c","zone":"high-slot","hasPuck":true},{"id":"lw","zone":"left-faceoff"},{"id":"you1","zone":"right-boards","isYou":true,"label":"RW"}],"opponents":[{"id":"d1","zone":"slot"},{"id":"d2","zone":"right-faceoff"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Weak-side F drive to…","zones":{"correct":["net-front"],"partial":["right-faceoff"],"wrong":["slot","high-slot","left-faceoff","left-corner","right-corner","behind-net","left-boards","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — far post, back-door for the tap-in.","partial":"Faceoff is fine for a shot, but the back-door is higher value.","wrong":"You took yourself out of the scoring chance."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink17',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink17","type":"rink","cat":"Systems","concept":"Forecheck F2 rotation","d":3,"pos":["F","D"],"sit":"Your F1 finishes a check in the corner. The D reverses the puck. What does F2 do?","why":"F2 reads the reverse and cuts it off at the high boards, keeping the D from escaping wide.","tip":"F2 = shadow the reverse.","scene":{"team":[{"id":"f1","zone":"left-corner"},{"id":"you1","zone":"slot","isYou":true,"label":"F2"}],"opponents":[{"id":"d1","zone":"left-corner"},{"id":"d2","zone":"right-corner","hasPuck":true}],"puck":{"zone":"right-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"F2 takes…","zones":{"correct":["right-boards","right-faceoff"],"partial":["right-corner"],"wrong":["net-front","slot","high-slot","left-faceoff","left-corner","behind-net","left-boards","left-point","right-point"]},"feedback":{"correct":"Yes — cut the reverse at the high boards.","partial":"You''re on the puck now — that''s F1''s new job. F2 stays high.","wrong":"Way off the rotation."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink18',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink18","type":"rink","cat":"Special Teams","concept":"PP entry — drop option","d":3,"pos":["F","D"],"sit":"On the PP, your team enters the zone with a drop-pass option. Who''s the right drop target?","why":"Drop passes work when the trailer has speed and the PK is sagging — usually a late D or C.","tip":"Drop = speed and a trailing shooter.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"hasPuck":true,"label":"LW"},{"id":"trailer","zone":"slot","label":"D"}],"opponents":[{"id":"pk","zone":"left-point"}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"PP entry, drop option. Drop to…","options":[{"text":"The trailing D with speed for a quick shot.","verdict":"correct","feedback":"Yes — classic PP entry play."},{"text":"A net-front F.","verdict":"wrong","feedback":"Too close — they''d be stopped immediately."},{"text":"A wall winger.","verdict":"partial","feedback":"Workable, but trailer-shot is higher danger."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink19',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink19","type":"rink","cat":"Pre-scan","concept":"Scan before reception, every time","d":2,"pos":["F","D"],"sit":"A stretch pass is coming to you in the neutral zone.","why":"Elite U18s scan 2-3 times before a pass arrives. Rec players scan zero.","tip":"Scan. Scan. Scan.","scene":{"team":[{"id":"d","zone":"behind-net","hasPuck":true},{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[],"puck":{"zone":"behind-net"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Pass incoming. You…","options":[{"text":"Scan left and right before the puck arrives; plan the next touch.","verdict":"correct","feedback":"Yes — pre-scan is the difference."},{"text":"Focus only on the puck.","verdict":"wrong","feedback":"You''ll get the pass but not the play."},{"text":"Call for a different pass.","verdict":"partial","feedback":"Too late. Scan the one coming."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink20',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink20","type":"rink","cat":"Game Management","concept":"Down late — pull goalie","d":2,"pos":["F","D"],"sit":"Down 3-4 with 1:20 left, your team in the O-zone.","why":"Pulling the goalie with possession deep gives you a 6v5 — take every second of O-zone time with the extra skater.","tip":"Call for the extra attacker with O-zone possession.","scene":{"team":[{"id":"you1","zone":"left-boards","isYou":true,"hasPuck":true}],"opponents":[],"puck":{"zone":"left-boards"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Down late, O-zone possession, 1:20 left. Coach calls…","options":[{"text":"Pull the goalie — extra attacker for max pressure.","verdict":"correct","feedback":"Yes — standard late-game play."},{"text":"Dump it in and line change.","verdict":"wrong","feedback":"You waste seconds. Keep possession."},{"text":"Hold possession and wait.","verdict":"partial","feedback":"You''ll still need the extra attacker. Pull."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink21',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink21","type":"rink","cat":"Systems","concept":"Strong-side lock","d":3,"pos":["F","D"],"sit":"Their team is breaking out on the strong side. You''re the weak-side winger.","why":"Strong-side lock: weak-side W mirrors across, stays ready to collapse.","tip":"Weak-side W = mirror, not mirror + drift.","scene":{"team":[{"id":"you1","zone":"right-faceoff","isYou":true,"label":"RW"}],"opponents":[{"id":"d","zone":"left-corner","hasPuck":true},{"id":"w","zone":"left-boards"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Their breakout''s on the strong side. You…","options":[{"text":"Mirror across, stay in shooting lane, ready to collapse.","verdict":"correct","feedback":"Yes — strong-side lock."},{"text":"Swing wide to the corner.","verdict":"wrong","feedback":"You just broke the lock."},{"text":"Drop to your own blue line.","verdict":"partial","feedback":"Too passive — you''re a lock."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink22',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink22","type":"rink","cat":"Offensive","concept":"Deny the dump","d":2,"pos":["F","D"],"sit":"Their D looks to dump into your zone. You''re the D reading the play.","why":"Closing the shooting lane early forces them to eat a hit or pass back — no dump.","tip":"Step up. Deny dumps.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true,"label":"D"}],"opponents":[{"id":"d","zone":"high-slot","hasPuck":true}],"puck":{"zone":"high-slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Their D is about to dump in. You…","options":[{"text":"Step up into the shooting lane — force them to pass back.","verdict":"correct","feedback":"Yes — denial is possession."},{"text":"Retreat.","verdict":"wrong","feedback":"You gave them the zone for free."},{"text":"Drop to your knees.","verdict":"partial","feedback":"Only if you know the shot''s coming. Step up first."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink23',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink23","type":"rink","cat":"Compete","concept":"Net-front battle","d":2,"pos":["F","D"],"sit":"You''re the net-front forward on offense. Their D is tying you up.","why":"Net-front = where goals happen. Don''t get moved. Get underneath them, stick on puck.","tip":"Low and underneath wins the net-front.","scene":{"team":[{"id":"d","zone":"right-point","hasPuck":true},{"id":"you1","zone":"net-front","isYou":true,"label":"F"}],"opponents":[{"id":"o","zone":"net-front"}],"puck":{"zone":"right-point"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Net-front battle. You…","options":[{"text":"Get low, body underneath them, stick ready for the tip.","verdict":"correct","feedback":"Yes — lowest player wins the net-front."},{"text":"Stand still and wait.","verdict":"wrong","feedback":"You''ll get boxed out."},{"text":"Try to elbow them.","verdict":"partial","feedback":"Penalty and you lose the post."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink24',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink24","type":"rink","cat":"Faceoff","concept":"Offensive zone set-play","d":2,"pos":["F","D"],"sit":"Your team runs an O-zone set play: centre ties up, LW picks it up. You''re the LW.","why":"Set plays win goals off draws. Execute your role exactly.","tip":"Set plays = trust your spot.","scene":{"team":[{"id":"you1","zone":"left-faceoff","isYou":true,"label":"LW"},{"id":"c","zone":"slot","label":"C"},{"id":"d","zone":"left-point","label":"D"}],"opponents":[],"puck":{"zone":"left-faceoff"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"zone-click","prompt":"Your LW spot for the set play?","zones":{"correct":["left-faceoff","left-boards"],"partial":["slot"],"wrong":["net-front","high-slot","right-faceoff","left-corner","right-corner","behind-net","right-boards","left-point","right-point"]},"feedback":{"correct":"Yes — the LW attacks the loose puck zone in the set play.","partial":"Slot is the C''s job — stay on your side.","wrong":"Wrong side entirely."}}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink25',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink25","type":"rink","cat":"Leadership","concept":"Third-period compete","d":2,"pos":["F","D"],"sit":"It''s late in a tight game. You''re exhausted. What''s your third-period habit?","why":"Third-period compete level separates good from great — habits, not emotion, win in the third.","tip":"Short shifts. Hard backchecks. Win pucks.","scene":{"team":[{"id":"you1","zone":"slot","isYou":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Third period, you''re gassed. Your habit?","options":[{"text":"Shorter shifts, full effort on each one.","verdict":"correct","feedback":"Yes — sustainable compete."},{"text":"Longer shifts to conserve shift counts.","verdict":"wrong","feedback":"You''ll be half a step slow. That''s the losing play."},{"text":"Hope the coach switches lines.","verdict":"partial","feedback":"Passive. Own it."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink26',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink26","type":"rink","cat":"Game Management","concept":"Line-matching awareness","d":2,"pos":["F","D"],"sit":"Your coach is matching your line against their top line. What does that signal?","why":"Line-matching = defensive priority. Cover-first mentality, simple O-zone exits, no cheating.","tip":"Matched against their top = zero mistakes.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[],"puck":{"zone":"slot"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"You''re matched vs their top line. Mindset?","options":[{"text":"Defense first. Simple plays. No risk.","verdict":"correct","feedback":"Yes — your job is to neutralize."},{"text":"Try to out-score them.","verdict":"wrong","feedback":"Mismatch. Your job is deny, not score."},{"text":"Avoid contact.","verdict":"partial","feedback":"Soft — you want contact, not risk."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

insert into review_questions (id, level, age, original, current, status, created_in_tool) values (
  'u18rink27',
  'U18 / Midget',
  'u18',
  null,
  '{"level":"U18 / Midget","id":"u18rink27","type":"rink","cat":"Pre-scout","concept":"Scouting report applied","d":3,"pos":["F","D"],"sit":"The scouting report said their #12 cheats for offense — coach wants you to exploit.","why":"Applying scouting reads is pro-level — know the tendency and attack it.","tip":"Scouting = use it, don''t just know it.","scene":{"team":[{"id":"you1","zone":"high-slot","isYou":true}],"opponents":[{"id":"12","zone":"slot","label":"12"}],"puck":{"zone":"left-corner"},"showGoalie":true,"showHomePlate":false,"texts":[],"arrows":[],"flags":[],"hiddenLabels":[],"question":{"mode":"choice","prompt":"Scouting says #12 cheats offense. Best play?","options":[{"text":"Get behind #12 on every transition — chip past them for an odd-man.","verdict":"correct","feedback":"Yes — apply the scout."},{"text":"Ignore the scout — play normal.","verdict":"wrong","feedback":"You wasted the preparation."},{"text":"Tell the ref.","verdict":"partial","feedback":"Not applicable."}]}}}',
  'unreviewed',
  true
) on conflict (id) do nothing;

commit;

-- Total rows: 100