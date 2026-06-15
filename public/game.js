// ============================================================
// QUEST OF MESH 3 — RULER OF WORLDS
// Sign-in, Gamepad, PVP, Colorful multiverse, Mesh powers
// ============================================================
var Game=(function(){
var canvas,ctx,W,H,cam={x:0,y:0},time=0,dt=0,lt=0;
var keys={},phase='title',combo=0,ct=0,shopOpen=false,dlgOpen=false,pvpOpen=false;
var dashCd=0,atkCd=0,specCd=0,domCd=0,domActive=false,domT=0,inv=0;
var username='',wsConn=null;

// WORLDS
var worlds=[
    {name:'Neon City',sky1:'#0a001a',sky2:'#1a0033',sky3:'#000a1a',ground:'#1a1a2a',plat:'#2a1a3a',accent:'#ff44aa',moon:'#ff44aa',stars:'rgba(255,100,200,0.4)',enemyC:['#aa2255','#552244','#882266'],buildC:['#1a0828','#120520','#0f0418']},
    {name:'Golden Desert',sky1:'#1a0f00',sky2:'#2a1a00',sky3:'#1a1000',ground:'#3a2a1a',plat:'#4a3a2a',accent:'#ffaa00',moon:'#ffcc44',stars:'rgba(255,200,50,0.3)',enemyC:['#885522','#664411','#aa6633'],buildC:['#2a1a0a','#1f140a','#33200a']},
    {name:'Crystal Depths',sky1:'#000a1a',sky2:'#001a2a',sky3:'#000a14',ground:'#1a2a3a',plat:'#2a3a4a',accent:'#44ffff',moon:'#44ddff',stars:'rgba(100,220,255,0.4)',enemyC:['#224466','#113355','#335577'],buildC:['#0a1828','#081420','#0f1f2a']},
    {name:'Floating Islands',sky1:'#0a0a1a',sky2:'#1a1a3a',sky3:'#0a1a2a',ground:'#2a3a2a',plat:'#3a4a3a',accent:'#44ff88',moon:'#88ffaa',stars:'rgba(100,255,150,0.3)',enemyC:['#226633','#115522','#338844'],buildC:['#0a1a0f','#081408','#0f1f0a']},
    {name:'Void Throne',sky1:'#050505',sky2:'#0a0008',sky3:'#080008',ground:'#111',plat:'#1a1a1a',accent:'#f0c040',moon:'#f0c040',stars:'rgba(240,192,64,0.5)',enemyC:['#442200','#662200','#884400'],buildC:['#0a0804','#080604','#0f0a06']},
];
var curWorld=0,worldW=4000;

// PLAYER
var P={x:100,y:0,vx:0,vy:0,w:30,h:52,hp:300,mhp:300,sp:100,msp:100,mesh:100,maxMesh:100,money:3000,lv:1,xp:0,speed:320,facing:1,grounded:true,weapon:0,attacking:false,dashing:false,dashT:0};
var avatar={gender:'male',skin:0xc68642,hair:'spiky',hairC:0xff44aa,outfit:'cyber',outfitC:0x2a1a3a};

var weapons=[
    {n:'Mesh Fists',t:'melee',d:50,r:50,s:0.15,i:'👊',c:'#ffaa00'},
    {n:'Cosmic Blade',t:'melee',d:80,r:60,s:0.22,i:'⚔️',c:'#ff44aa'},
    {n:'Void Cleaver',t:'melee',d:130,r:70,s:0.4,i:'🪓',c:'#44ffff'},
    {n:'Plasma Pistol',t:'gun',d:40,r:400,s:0.18,i:'🔫',c:'#ffaa00',a:80,ma:80},
    {n:'Nova Cannon',t:'gun',d:100,r:300,s:0.7,i:'💥',c:'#ff44aa',a:20,ma:20},
    {n:'Star Rifle',t:'gun',d:20,r:450,s:0.05,i:'🔫',c:'#44ff88',a:250,ma:250},
];

// WORLD DATA
var platforms=[],buildings=[],vehicles=[],enemies=[],npcs=[],projectiles=[],particles=[],portals=[];
var checkpoint={x:100};

// MISSIONS (per world)
var allMissions=[
    // World 0: Neon City
    [{t:'Arrive',d:'Talk to Nyx',npc:'Nyx'},{t:'Dominate',d:'Defeat 8 enemies',k:0,kn:8},{t:'Open Portal',d:'Reach the portal (far right)',loc:3600}],
    // World 1: Golden Desert
    [{t:'Desert Lord',d:'Talk to Sandking',npc:'Sandking'},{t:'Sandstorm',d:'Defeat 10 enemies',k:0,kn:10},{t:'Oasis Portal',d:'Reach the portal',loc:3600}],
    // World 2: Crystal Depths
    [{t:'Crystal Power',d:'Talk to Prism',npc:'Prism'},{t:'Shatter',d:'Defeat 12 enemies',k:0,kn:12},{t:'Deep Portal',d:'Reach the portal',loc:3600}],
    // World 3: Floating Islands
    [{t:'Sky King',d:'Talk to Zephyr',npc:'Zephyr'},{t:'Conquer the Sky',d:'Defeat 14 enemies',k:0,kn:14},{t:'Final Portal',d:'Reach the portal',loc:3600}],
    // World 4: Void Throne
    [{t:'The Throne',d:'Talk to the Echo',npc:'Echo'},{t:'DESTROY ALL',d:'Defeat 20 enemies',k:0,kn:20},{t:'RULE COMPLETE',d:'You are the Mesh God.',loc:3800}],
];
var curMI=0; // mission index within current world

// SHOP
var shopItems=[
    {n:'Heal',d:'Full HP',p:60,fn:function(){P.hp=P.mhp;}},
    {n:'Max HP+50',d:'Permanent',p:400,fn:function(){P.mhp+=50;P.hp=P.mhp;}},
    {n:'Mesh Charge',d:'Full Mesh energy',p:200,fn:function(){P.mesh=P.maxMesh;}},
    {n:'Ammo All',d:'Refill guns',p:100,fn:function(){weapons.forEach(function(w){if(w.a!==undefined)w.a=w.ma;});}},
    {n:'Damage+25%',d:'All weapons',p:600,fn:function(){weapons.forEach(function(w){w.d=Math.floor(w.d*1.25);});}},
    {n:'Galaxy Sword',d:'150dmg melee',p:5000,fn:function(){weapons.push({n:'Galaxy Sword',t:'melee',d:150,r:75,s:0.35,i:'🌟',c:'#ffff44'});}},
    {n:'Annihilator',d:'500dmg 2shots',p:8000,fn:function(){weapons.push({n:'Annihilator',t:'gun',d:500,r:600,s:2.5,i:'☠️',c:'#ff0044',a:2,ma:2});}},
    {n:'Spawn Vehicle',d:'Speed machine',p:1000,fn:function(){vehicles.push(mkV(P.x+80));}},
];

// === INIT ===
function init(){canvas=document.getElementById('game');ctx=canvas.getContext('2d');W=canvas.width=innerWidth;H=canvas.height=innerHeight;window.addEventListener('resize',function(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;});document.addEventListener('keydown',function(e){keys[e.code]=true;onKey(e.code);});document.addEventListener('keyup',function(e){keys[e.code]=false;});}

function onKey(c){
    if(phase!=='playing')return;
    if(c==='KeyB')toggleShop();
    if(c==='Space'&&dlgOpen){dlgOpen=false;document.getElementById('dlg').style.display='none';return;}
    if(c==='KeyE')interact();
    if(c==='Digit1')P.weapon=(P.weapon+1)%weapons.length;
    if(c==='Digit2')P.weapon=(P.weapon-1+weapons.length)%weapons.length;
    if(c==='KeyV')meshBlast();
    if(c==='Digit9')togglePVP();
}

// === AUTH ===
function login(){
    var u=document.getElementById('login-user').value.trim(),p=document.getElementById('login-pass').value.trim();
    if(!u||!p){document.getElementById('login-err').textContent='Fill both fields';return;}
    fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})}).then(r=>r.json()).then(d=>{
        if(!d.ok){document.getElementById('login-err').textContent=d.err;return;}
        username=d.username;P.lv=d.account.lv||1;P.money=d.account.money||3000;P.xp=d.account.xp||0;curWorld=d.account.world||0;
        if(d.account.avatar)Object.assign(avatar,d.account.avatar);
        document.getElementById('title').classList.add('hidden');document.getElementById('avatar-screen').classList.remove('hidden');buildAvUI();
    }).catch(()=>{document.getElementById('login-err').textContent='Server error';});
}
function register(){
    var u=document.getElementById('login-user').value.trim(),p=document.getElementById('login-pass').value.trim();
    if(!u||!p||u.length<2){document.getElementById('login-err').textContent='Username 2+ chars + password';return;}
    fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,avatar:avatar})}).then(r=>r.json()).then(d=>{
        if(!d.ok){document.getElementById('login-err').textContent=d.err;return;}
        username=d.username;
        document.getElementById('title').classList.add('hidden');document.getElementById('avatar-screen').classList.remove('hidden');buildAvUI();
    }).catch(()=>{document.getElementById('login-err').textContent='Server error';});
}
function saveGame(){if(!username)return;fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username,lv:P.lv,money:P.money,xp:P.xp,world:curWorld,avatar:avatar})}).catch(()=>{});}

// === GAMEPAD (PS5/PS4) ===
function pollGamepad(){
    var gps=navigator.getGamepads();if(!gps)return;
    var gp=null;for(var i=0;i<gps.length;i++){if(gps[i]){gp=gps[i];break;}}
    if(!gp)return;
    var dz=0.2;
    // Left stick = movement
    if(gp.axes[0]<-dz)keys['KeyA']=true;else if(!keys['ArrowLeft'])keys['KeyA']=false;
    if(gp.axes[0]>dz)keys['KeyD']=true;else if(!keys['ArrowRight'])keys['KeyD']=false;
    // X/A = Jump
    if(gp.buttons[0]&&gp.buttons[0].pressed)keys['KeyW']=true;else keys['KeyW']=false;
    // Square/X = Melee
    if(gp.buttons[2]&&gp.buttons[2].pressed)keys['KeyF']=true;else keys['KeyF']=false;
    // Triangle/Y = Special
    if(gp.buttons[3]&&gp.buttons[3].pressed)keys['KeyK']=true;else keys['KeyK']=false;
    // R1 = Shoot
    if(gp.buttons[5]&&gp.buttons[5].pressed)keys['KeyL']=true;else keys['KeyL']=false;
    // R2 = Dash
    if(gp.buttons[7]&&gp.buttons[7].pressed)keys['Space']=true;else keys['Space']=false;
    // L1 = Mesh Blast
    if(gp.buttons[4]&&gp.buttons[4].pressed)meshBlast();
    // D-pad up = weapon switch
    if(gp.buttons[12]&&gp.buttons[12].pressed){P.weapon=(P.weapon+1)%weapons.length;}
}

// === PVP ===
function togglePVP(){
    pvpOpen=!pvpOpen;var el=document.getElementById('shop-panel');
    if(pvpOpen){el.style.display='block';el.innerHTML='<h2>⚔️ PVP</h2><p style="color:#888;font-size:10px;text-align:center">Loading...</p>';
        fetch('/api/pvp-list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username})}).then(r=>r.json()).then(d=>{
            var h='<h2>⚔️ PVP ARENA</h2>';
            if(!d.ok||!d.players.length)h+='<p style="color:#666;text-align:center;font-size:11px">No opponents yet</p>';
            else d.players.forEach((o,i)=>{h+='<div class="sitem" onclick="Game.pvpFight(\''+o.name+'\','+o.lv+','+o.wins+')"><div><div class="sn">'+o.name+'</div><div class="sd">Lv.'+o.lv+' | '+o.wins+' wins</div></div><div class="sp2">⚔️</div></div>';});
            h+='<div class="pclose" onclick="Game.closePVP()">Close [9]</div>';el.innerHTML=h;
        }).catch(()=>{el.innerHTML='<h2>PVP</h2><p style="color:#f44;text-align:center">Error</p><div class="pclose" onclick="Game.closePVP()">Close</div>';});
    }else el.style.display='none';
}
function closePVP(){pvpOpen=false;document.getElementById('shop-panel').style.display='none';}
function pvpFight(name,lv,wins){
    closePVP();
    var oppHp=100+lv*25,yourDmg=weapons[P.weapon].d*2+P.lv*4,oppDmg=lv*6+wins,rounds=0;
    while(oppHp>0&&P.hp>0&&rounds<25){oppHp-=yourDmg+Math.floor(Math.random()*15);P.hp-=Math.max(0,oppDmg-P.lv*2+Math.floor(Math.random()*8));rounds++;}
    if(oppHp<=0){var r=200+lv*40;P.money+=r;P.xp+=40;notify('🏆 WIN vs '+name,'+$'+r);}
    else{notify('💀 LOST to '+name,'Level up!');}
    if(P.hp<=0)P.hp=30;chkLv();updHUD();saveGame();
}

// === AVATAR ===
function goAvatar(){document.getElementById('title').classList.add('hidden');document.getElementById('avatar-screen').classList.remove('hidden');buildAvUI();}
function buildAvUI(){
    var o=document.getElementById('av-opts');o.innerHTML='';
    function cat(t){var d=document.createElement('div');d.className='acat';d.innerHTML='<h3>'+t+'</h3>';var r=document.createElement('div');r.className='arow';d.appendChild(r);o.appendChild(d);return r;}
    var gr=cat('Gender');['male','female'].forEach(function(g){var b=document.createElement('div');b.className='atxt'+(g===avatar.gender?' s':'');b.textContent=g;b.onclick=function(){avatar.gender=g;buildAvUI();drawAv();};gr.appendChild(b);});
    var sr=cat('Skin');[0xf5d0a9,0xe8b88a,0xc68642,0x8d5524,0x4a2c17,0x2c1810].forEach(function(c){var b=document.createElement('div');b.className='acol'+(c===avatar.skin?' s':'');b.style.background='#'+c.toString(16).padStart(6,'0');b.onclick=function(){avatar.skin=c;buildAvUI();drawAv();};sr.appendChild(b);});
    var hr=cat('Hair');['spiky','short','long','afro','mohawk','ponytail'].forEach(function(h){var b=document.createElement('div');b.className='atxt'+(h===avatar.hair?' s':'');b.textContent=h;b.onclick=function(){avatar.hair=h;buildAvUI();drawAv();};hr.appendChild(b);});
    var hcr=cat('Hair Color');[0xff44aa,0x44ffaa,0xffaa00,0x4488ff,0xff4444,0x44ff44,0xffffff,0x1a1a1a].forEach(function(c){var b=document.createElement('div');b.className='acol'+(c===avatar.hairC?' s':'');b.style.background='#'+c.toString(16).padStart(6,'0');b.onclick=function(){avatar.hairC=c;buildAvUI();drawAv();};hcr.appendChild(b);});
    var or=cat('Outfit');['cyber','royal','shadow','nature','golden'].forEach(function(x){var b=document.createElement('div');b.className='atxt'+(x===avatar.outfit?' s':'');b.textContent=x;b.onclick=function(){avatar.outfit=x;buildAvUI();drawAv();};or.appendChild(b);});
    drawAv();
}
function drawAv(){
    var c=document.getElementById('avp'),x=c.getContext('2d');x.clearRect(0,0,140,220);x.fillStyle='#0a0a18';x.fillRect(0,0,140,220);
    var sk='#'+avatar.skin.toString(16).padStart(6,'0'),hc='#'+avatar.hairC.toString(16).padStart(6,'0');
    var ocs={cyber:'#2a1a4a',royal:'#3a2a1a',shadow:'#1a1a2a',nature:'#1a3a1a',golden:'#3a2a00'};
    var oc=ocs[avatar.outfit]||'#333';
    x.fillStyle=oc;x.beginPath();x.ellipse(70,120,avatar.gender==='female'?16:20,32,0,0,Math.PI*2);x.fill();
    x.fillStyle=sk;x.beginPath();x.arc(70,65,18,0,Math.PI*2);x.fill();
    x.fillStyle='#fff';x.beginPath();x.arc(63,63,3,0,6.28);x.fill();x.beginPath();x.arc(77,63,3,0,6.28);x.fill();
    x.fillStyle='#222';x.beginPath();x.arc(64,64,1.8,0,6.28);x.fill();x.beginPath();x.arc(78,64,1.8,0,6.28);x.fill();
    x.fillStyle=hc;
    switch(avatar.hair){case'spiky':x.beginPath();x.moveTo(52,62);x.lineTo(56,42);x.lineTo(62,56);x.lineTo(70,38);x.lineTo(78,56);x.lineTo(84,42);x.lineTo(88,62);x.closePath();x.fill();break;case'short':x.beginPath();x.arc(70,56,18,Math.PI,0);x.fill();break;case'long':x.fillRect(54,47,32,48);break;case'afro':x.beginPath();x.arc(70,60,25,0,6.28);x.fill();break;case'mohawk':x.fillRect(64,36,12,24);break;case'ponytail':x.beginPath();x.arc(70,55,17,Math.PI,0);x.fill();x.fillRect(80,52,7,30);break;}
    x.fillStyle=sk;x.fillRect(48,98,10,35);x.fillRect(82,98,10,35);
    x.fillStyle='#2a2a3a';x.fillRect(58,152,11,40);x.fillRect(71,152,11,40);
    x.fillStyle='#111';x.fillRect(56,190,14,8);x.fillRect(70,190,14,8);
    // Mesh glow
    x.strokeStyle='rgba(255,170,0,0.3)';x.lineWidth=3;x.beginPath();x.arc(70,110,40,0,6.28);x.stroke();
}

// === START GAME ===
function play(){document.getElementById('avatar-screen').classList.add('hidden');document.getElementById('hud').style.display='block';document.getElementById('world-name').style.display='block';phase='playing';loadWorld(0);lt=performance.now();loop();}

function loadWorld(idx){
    curWorld=idx;curMI=0;
    platforms=[];buildings=[];vehicles=[];enemies=[];npcs=[];portals=[];projectiles=[];particles=[];
    P.x=100;P.y=0;P.vy=0;P.hp=P.mhp;P.sp=P.msp;checkpoint={x:100};
    var w=worlds[idx];
    document.getElementById('world-name').textContent='🌍 '+w.name;
    document.getElementById('world-name').style.color=w.accent;
    // Ground
    platforms.push({x:-200,y:H-60,w:worldW+400,h:200});
    for(var i=0;i<25;i++)platforms.push({x:150+i*160+Math.random()*60,y:H-60-40-Math.random()*150,w:60+Math.random()*80,h:10});
    // Buildings
    for(var b=0;b<35;b++)buildings.push({x:-50+b*115+Math.random()*30,y:H-60-(60+Math.random()*220),w:40+Math.random()*50,h:60+Math.random()*220});
    // Vehicles
    vehicles.push(mkV(400));vehicles.push(mkV(1800));vehicles.push(mkV(3000));
    // Portal at end
    portals.push({x:3700,y:H-60-90,w:50,h:90});
    // NPCs
    var npcNames=[['Nyx','⚡'],['Sandking','👑'],['Prism','💎'],['Zephyr','🌪️'],['Echo','🔮']][idx];
    npcs.push({x:200,y:H-60-52,name:npcNames[0],portrait:npcNames[1],color:w.accent,lines:["This world is yours now.","Conquer. Destroy. Rule.","The portal ahead leads to the next realm."]});
    // Enemies
    for(var e=0;e<30+idx*5;e++)enemies.push(mkE(300+e*120+Math.random()*50,idx));
    updQuest();updHUD();
    notify('🌍 '+w.name,'World '+(idx+1)+'/5 — Conquer it!');
}

function mkV(x){return{x:x,y:H-60-22,w:70,h:22,spd:600,c:['#ff44aa','#ffaa00','#44ffaa','#4488ff','#ff8844'][Math.floor(Math.random()*5)]};}
function mkE(x,wi){var hp=60+wi*20+Math.floor(Math.random()*30);var w=worlds[wi];return{x:x,y:H-60-46,w:24,h:46,hp:hp,mhp:hp,facing:-1,st:'patrol',cd:0,dead:false,dmg:5+wi*3,spd:80+wi*20+Math.random()*40,c:w.enemyC[Math.floor(Math.random()*w.enemyC.length)],fl:0};}

// === UPDATE ===
function update(){
    if(dlgOpen||shopOpen)return;
    var mx=0;if(keys['KeyA']||keys['ArrowLeft']){mx=-1;P.facing=-1;}if(keys['KeyD']||keys['ArrowRight']){mx=1;P.facing=1;}
    if(P.inV){var v=P.vr;v.x+=mx*v.spd*dt;P.x=v.x;P.y=v.y-18;if(keys['KeyW']||keys['ArrowUp']){P.inV=false;P.vr=null;P.vy=-300;}var m=allMissions[curWorld][curMI];if(m&&m.loc&&P.x>m.loc)compM();}
    else{
        P.vx=mx*P.speed;
        if(keys['Space']&&dashCd<=0&&P.sp>=12){P.dashing=true;P.dashT=0.14;P.vx=P.facing*800;P.sp-=12;dashCd=0.35;spawnP(P.x,P.y+26,worlds[curWorld].accent,6,140);}
        if(P.dashing){P.dashT-=dt;if(P.dashT<=0)P.dashing=false;}if(dashCd>0)dashCd-=dt;
        if((keys['KeyW']||keys['ArrowUp'])&&P.grounded){P.vy=-600;P.grounded=false;}
        P.vy+=1500*dt;P.x+=P.vx*dt;P.y+=P.vy*dt;
        P.grounded=false;platforms.forEach(function(pl){if(P.x+P.w/2>pl.x&&P.x-P.w/2<pl.x+pl.w&&P.y+P.h>pl.y&&P.y+P.h<pl.y+22&&P.vy>0){P.y=pl.y-P.h;P.vy=0;P.grounded=true;}});
        if(P.y>H+200){P.y=H-60-P.h;P.vy=0;P.grounded=true;P.hp-=10;if(P.hp<=0)die();}
        P.x=Math.max(0,Math.min(worldW,P.x));
        if((keys['KeyF']||keys['KeyJ'])&&atkCd<=0)melee();
        if((keys['KeyL']||keys['KeyY'])&&atkCd<=0)shoot();
        if(keys['KeyK']&&specCd<=0&&P.sp>=30)special();
    }
    if(atkCd>0)atkCd-=dt;if(specCd>0)specCd-=dt;if(domCd>0)domCd-=dt;if(inv>0)inv-=dt;
    if(domActive){domT-=dt;if(domT<=0)domActive=false;}
    P.sp=Math.min(P.msp,P.sp+14*dt);P.mesh=Math.min(P.maxMesh,P.mesh+3*dt);
    // Enemies
    enemies.forEach(function(e){if(e.dead)return;var d=Math.abs(e.x-P.x),vd=Math.abs((e.y+e.h/2)-(P.y+P.h/2));if(e.fl>0)e.fl-=dt;if(d<260&&vd<55){e.st='chase';e.facing=P.x>e.x?1:-1;if(d>30)e.x+=e.facing*e.spd*dt;else if(e.cd<=0&&vd<35){if(!P.dashing&&inv<=0){P.hp-=e.dmg;spawnP(P.x,P.y+20,'#ff4444',3,120);if(P.hp<=0)die();}e.cd=1.5;}}else{e.st='patrol';e.x+=Math.sin(time+e.x*.01)*18*dt;}if(e.cd>0)e.cd-=dt;});
    // Projectiles
    for(var i=projectiles.length-1;i>=0;i--){var p=projectiles[i];p.x+=p.vx*dt;p.life-=dt;if(p.life<=0){projectiles.splice(i,1);continue;}enemies.forEach(function(e){if(!e.dead&&Math.abs(p.x-e.x)<22&&Math.abs(p.y-e.y-22)<22){hitE(e,p.d);p.life=0;}});}
    // Particles
    for(var j=particles.length-1;j>=0;j--){var pt=particles[j];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=350*dt;pt.life-=dt;if(pt.life<=0)particles.splice(j,1);}
    // Respawn
    var m=allMissions[curWorld][curMI];if(m&&m.kn){var alive=0;enemies.forEach(function(e){if(!e.dead)alive++;});if(alive<3){for(var ri=0;ri<3;ri++)enemies.push(mkE(P.x+200+Math.random()*250,curWorld));}}
    // Portal check
    portals.forEach(function(po){if(Math.abs(P.x-po.x)<35&&m&&m.loc&&P.x>m.loc-50)compM();});
    if(ct>0){ct-=dt;if(ct<=0)combo=0;}
    cam.x+=(P.x-W/2-cam.x)*5*dt;cam.y+=(P.y-H/2+70-cam.y)*3*dt;
}

// === COMBAT ===
function melee(){var w=weapons[P.weapon];if(w.t!=='melee'){P.weapon=0;w=weapons[0];}atkCd=w.s;P.attacking=true;setTimeout(function(){P.attacking=false;},100);spawnP(P.x+P.facing*28,P.y+24,w.c,5,90);enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<w.r&&(e.x-P.x)*P.facing>-12&&Math.abs(e.y-P.y)<45)hitE(e,w.d);});}
function shoot(){var w=weapons[P.weapon];if(w.t!=='gun'){P.weapon=3;w=weapons[3];}if(w.a<=0){atkCd=0.4;msg('No ammo!');return;}w.a--;atkCd=w.s;projectiles.push({x:P.x+P.facing*18,y:P.y+20,vx:P.facing*950,d:w.d,life:1.5,c:w.c});spawnP(P.x+P.facing*22,P.y+20,'#fff',2,120);}
function special(){P.sp-=30;specCd=1;spawnP(P.x,P.y+20,worlds[curWorld].accent,18,280);enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<170)hitE(e,100);});}
function meshBlast(){if(P.mesh<50){msg('Need 50 Mesh Energy!');return;}P.mesh-=50;domActive=true;domT=2.5;domCd=12;notify('⚡ MESH BLAST','EVERYTHING DIES');enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<600)hitE(e,300);});spawnP(P.x,P.y+20,'#ffaa00',50,400);}
function hitE(e,dm){e.hp-=dm;e.fl=0.08;e.x+=P.facing*10;spawnP(e.x,e.y+18,worlds[curWorld].accent,4,150);P.mesh=Math.min(P.maxMesh,P.mesh+3);combo++;ct=2;updCombo();if(e.hp<=0){e.dead=true;P.xp+=8;P.money+=10+Math.floor(Math.random()*15);var m=allMissions[curWorld][curMI];if(m&&m.kn){m.k=(m.k||0)+1;if(m.k>=m.kn)compM();}spawnP(e.x,e.y+22,e.c,12,250);chkLv();updHUD();}}
function chkLv(){if(P.xp>=P.lv*60){P.xp-=P.lv*60;P.lv++;P.mhp+=20;P.hp=P.mhp;notify('⬆️ LEVEL '+P.lv,'More power!');}}
function die(){P.hp=0;notify('💀 DIED','Respawning...');spawnP(P.x,P.y+26,'#ff0000',20,300);setTimeout(function(){P.hp=P.mhp;P.sp=P.msp;P.x=checkpoint.x;P.y=H-60-P.h;P.vy=0;P.grounded=true;inv=3;msg('Respawned. 3s shield.');updHUD();},1000);}

// === MISSIONS ===
function compM(){var ms=allMissions[curWorld];var m=ms[curMI];if(!m)return;curMI++;checkpoint={x:P.x};P.xp+=30;P.money+=200;notify('✅ '+m.t,'Complete!');chkLv();updHUD();updQuest();saveGame();
    if(curMI>=ms.length){// World complete — go to next
        if(curWorld<worlds.length-1){setTimeout(function(){notify('🌀 PORTAL','Entering next world...');setTimeout(function(){loadWorld(curWorld+1);},1500);},1000);}
        else{notify('👑 YOU ARE THE MESH GOD','All worlds conquered. You rule everything.');msg('GAME COMPLETE. You are infinite.');}}}

// === INTERACT ===
function interact(){if(dlgOpen){dlgOpen=false;document.getElementById('dlg').style.display='none';return;}if(P.inV){P.inV=false;P.vr=null;return;}for(var i=0;i<vehicles.length;i++){if(Math.abs(P.x-vehicles[i].x)<vehicles[i].w){P.inV=true;P.vr=vehicles[i];msg('Driving!');return;}}for(var j=0;j<npcs.length;j++){if(Math.abs(P.x-npcs[j].x)<50){dlgOpen=true;var n=npcs[j];document.getElementById('dlg').style.display='block';document.getElementById('dp').textContent=n.portrait;document.getElementById('dn').textContent=n.name;document.getElementById('dt').textContent=n.lines[Math.floor(Math.random()*n.lines.length)];var m=allMissions[curWorld][curMI];if(m&&m.npc===n.name)compM();return;}}}

// === SHOP ===
function toggleShop(){shopOpen=!shopOpen;var el=document.getElementById('shop-panel');if(shopOpen){var h='<h2>🏪</h2><p class="scash">$'+P.money+'</p>';shopItems.forEach(function(it,i){h+='<div class="sitem" onclick="Game.buy('+i+')"><div><div class="sn">'+it.n+'</div><div class="sd">'+it.d+'</div></div><div class="sp2">$'+it.p+'</div></div>';});h+='<div class="pclose" onclick="Game.toggleShop()">Close [B]</div>';el.innerHTML=h;el.style.display='block';}else el.style.display='none';}
function buy(i){var it=shopItems[i];if(P.money<it.p){msg("Can't afford!");return;}P.money-=it.p;it.fn();msg(it.n+'!');updHUD();toggleShop();toggleShop();}

// === HUD ===
function updHUD(){document.getElementById('hp').style.width=(P.hp/P.mhp*100)+'%';document.getElementById('sp').style.width=(P.sp/P.msp*100)+'%';document.getElementById('me').style.width=(P.mesh/P.maxMesh*100)+'%';var w=weapons[P.weapon];document.getElementById('info').textContent='Lv.'+P.lv+' | $'+P.money+' | '+w.i+' '+w.n+(w.a!==undefined?' ['+w.a+']':'');}
function updQuest(){var ms=allMissions[curWorld];var m=ms[curMI];document.getElementById('qbox').innerHTML=m?'<b style="color:'+worlds[curWorld].accent+'">'+m.t+'</b><br>'+m.d:'<b style="color:#4f4">WORLD CLEARED</b>';}
function updCombo(){var el=document.getElementById('combo');el.textContent=combo>1?combo+'x':'';el.style.opacity=combo>1?'1':'0';el.style.color=worlds[curWorld].accent;}
function msg(t){var d=document.createElement('div');d.className='mg';d.textContent=t;document.getElementById('msgs').appendChild(d);setTimeout(function(){d.remove();},2500);}
function notify(h,p){var n=document.getElementById('notif');n.querySelector('h2').textContent=h;n.querySelector('p').textContent=p;n.style.display='block';setTimeout(function(){n.style.display='none';},2500);}
function spawnP(x,y,c,n,f){for(var i=0;i<n;i++)particles.push({x:x,y:y,vx:(Math.random()-.5)*f*2,vy:-Math.random()*f,life:0.4+Math.random()*0.3,c:c,sz:3+Math.random()*5});}

// === DRAW ===
function draw(){
    var w=worlds[curWorld];
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-cam.x,-cam.y);
    var sky=ctx.createLinearGradient(0,cam.y,0,cam.y+H);sky.addColorStop(0,w.sky1);sky.addColorStop(0.5,w.sky2);sky.addColorStop(1,w.sky3);ctx.fillStyle=sky;ctx.fillRect(cam.x,cam.y,W,H);
    ctx.fillStyle=w.stars;for(var s=0;s<60;s++)ctx.fillRect(((s*137+50)%worldW)*.8+cam.x*.1,(s*73%280)+cam.y*.05,2,2);
    ctx.fillStyle=w.moon;ctx.globalAlpha=0.4;ctx.beginPath();ctx.arc(cam.x+W*.8,cam.y+60,22,0,6.28);ctx.fill();ctx.globalAlpha=1;
    buildings.forEach(function(b){var bx=b.x*.7+cam.x*.3;ctx.fillStyle=w.buildC[Math.floor(b.x)%w.buildC.length];ctx.fillRect(bx,b.y,b.w,b.h);ctx.fillStyle=w.accent+'22';for(var wy=b.y+10;wy<b.y+b.h-6;wy+=15)for(var wx=bx+5;wx<bx+b.w-5;wx+=10){if(Math.random()>.5)ctx.fillRect(wx,wy,4,6);}});
    platforms.forEach(function(pl){ctx.fillStyle=w.plat;ctx.fillRect(pl.x,pl.y,pl.w,pl.h);ctx.fillStyle=w.accent+'44';ctx.fillRect(pl.x,pl.y,pl.w,2);});
    // Portal
    portals.forEach(function(po){ctx.globalAlpha=.6+Math.sin(time*3)*.2;ctx.fillStyle=w.accent;ctx.fillRect(po.x-po.w/2,po.y,po.w,po.h);ctx.strokeStyle=w.accent;ctx.lineWidth=2;ctx.strokeRect(po.x-po.w/2,po.y,po.w,po.h);ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('⭐ PORTAL ⭐',po.x,po.y-10);});
    vehicles.forEach(function(v){ctx.fillStyle=v.c;ctx.fillRect(v.x-v.w/2,v.y+4,v.w,v.h-4);ctx.fillStyle='#111';ctx.beginPath();ctx.arc(v.x-v.w/3,v.y+v.h,4,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(v.x+v.w/3,v.y+v.h,4,0,6.28);ctx.fill();if(Math.abs(P.x-v.x)<v.w&&!P.inV){ctx.fillStyle=w.accent;ctx.font='8px sans-serif';ctx.textAlign='center';ctx.fillText('[E]',v.x,v.y-6);}});
    npcs.forEach(function(n){ctx.fillStyle=n.color;ctx.fillRect(n.x-10,n.y+12,20,26);ctx.fillStyle='#dda870';ctx.beginPath();ctx.arc(n.x,n.y+8,8,0,6.28);ctx.fill();ctx.fillStyle=w.accent;ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(n.name,n.x,n.y-6);if(Math.abs(P.x-n.x)<50)ctx.fillText('[E]',n.x,n.y-16);});
    enemies.forEach(function(e){if(e.dead)return;var f=e.fl>0;ctx.fillStyle=f?'#fff':e.c;ctx.fillRect(e.x-e.w/2,e.y,e.w,e.h);ctx.fillStyle=f?'#fff':'#aa8866';ctx.beginPath();ctx.arc(e.x,e.y+7,6,0,6.28);ctx.fill();ctx.fillStyle=e.st==='chase'?'#ff2222':'#555';ctx.fillRect(e.x+e.facing*2-1,e.y+6,2.5,2.5);if(e.hp<e.mhp){ctx.fillStyle='#222';ctx.fillRect(e.x-10,e.y-5,20,3);ctx.fillStyle=w.accent;ctx.fillRect(e.x-10,e.y-5,20*(e.hp/e.mhp),3);}});
    // Player
    var px=P.x-P.w/2,py=P.y;var sk='#'+avatar.skin.toString(16).padStart(6,'0'),hc='#'+avatar.hairC.toString(16).padStart(6,'0');
    var ocs={cyber:'#2a1a4a',royal:'#3a2a1a',shadow:'#1a1a2a',nature:'#1a3a1a',golden:'#3a2a00'};var oc=ocs[avatar.outfit]||'#333';
    ctx.shadowBlur=10;ctx.shadowColor=w.accent;
    ctx.fillStyle=oc;ctx.fillRect(px+5,py+16,20,24);
    ctx.fillStyle=sk;ctx.beginPath();ctx.arc(P.x,py+11,9,0,6.28);ctx.fill();
    ctx.fillStyle=hc;if(avatar.hair==='spiky'){ctx.beginPath();ctx.moveTo(P.x-8,py+9);ctx.lineTo(P.x-4,py-3);ctx.lineTo(P.x,py+4);ctx.lineTo(P.x+4,py-5);ctx.lineTo(P.x+8,py+3);ctx.lineTo(P.x+10,py+9);ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.arc(P.x,py+5,9,Math.PI,0);ctx.fill();}
    ctx.fillStyle=w.accent;ctx.fillRect(P.x+P.facing*2.5-1.5,py+9,3,3.5);
    ctx.fillStyle='#2a2a3a';ctx.fillRect(px+7,py+40,6,12);ctx.fillRect(px+17,py+40,6,12);
    if(P.attacking){ctx.save();ctx.translate(P.x+P.facing*18,py+22);ctx.rotate(P.facing*-.6+Math.sin(time*30)*.3);ctx.fillStyle=weapons[P.weapon].c;ctx.fillRect(-2,-16,4,32);ctx.restore();}else{ctx.fillStyle=weapons[P.weapon].c;ctx.fillRect(P.x+P.facing*12,py+18,2.5*P.facing,16);}
    if(inv>0){ctx.strokeStyle=w.accent+'66';ctx.lineWidth=2;ctx.beginPath();ctx.arc(P.x,py+26,20+Math.sin(time*8)*3,0,6.28);ctx.stroke();}
    ctx.shadowBlur=0;
    projectiles.forEach(function(p){ctx.fillStyle=p.c;ctx.shadowBlur=4;ctx.shadowColor=p.c;ctx.fillRect(p.x-3,p.y-1.5,6,3);});ctx.shadowBlur=0;
    particles.forEach(function(pt){ctx.globalAlpha=pt.life*2.5;ctx.fillStyle=pt.c;ctx.fillRect(pt.x-pt.sz/2,pt.y-pt.sz/2,pt.sz,pt.sz);});ctx.globalAlpha=1;
    ctx.restore();
    if(domActive){ctx.fillStyle=w.accent+'0f';ctx.fillRect(0,0,W,H);ctx.strokeStyle=w.accent+'66';ctx.lineWidth=3;ctx.setLineDash([6,4]);ctx.strokeRect(5,5,W-10,H-10);ctx.setLineDash([]);ctx.fillStyle=w.accent;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.globalAlpha=.5+Math.sin(time*5)*.3;ctx.fillText('⚡ MESH BLAST ⚡',W/2,32);ctx.globalAlpha=1;}
}

// === LOOP ===
function loop(){var now=performance.now();dt=Math.min((now-lt)/1000,.05);lt=now;time+=dt;pollGamepad();update();draw();updHUD();requestAnimationFrame(loop);}

init();
return{goAvatar:goAvatar,play:play,toggleShop:toggleShop,buy:buy,login:login,register:register,togglePVP:togglePVP,pvpFight:pvpFight,closePVP:closePVP};
})();
