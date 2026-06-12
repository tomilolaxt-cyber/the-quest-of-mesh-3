// ============================================================
// THE QUEST OF MESH 3 - Open World / Online / PVP
// ============================================================
var Game = (function() {

var canvas, ctx, W, H, cam = {x:0,y:0}, time=0, dt=0, lastTime=0;
var keys = {}, phase = 'auth'; // auth, avatar, playing
var combo=0, comboTimer=0, shopOpen=false, dlgOpen=false, pvpOpen=false;
var dashCd=0, atkCd=0, specCd=0, domainCd=0, domainActive=false, domainTimer=0, invincible=0;
var authMode = 'login';
var username = '';
var account = null;

// === PLAYER ===
var P = {x:100,y:0,vx:0,vy:0,w:32,h:56,hp:200,mhp:200,sp:80,msp:80,ce:0,maxCe:100,money:2000,lv:1,xp:0,speed:300,facing:1,grounded:true,weapon:0,attacking:false,dashing:false,dashTime:0};
var avatar = {gender:'male',skin:0xc68642,hair:'spiky',hairCol:0x1a1a1a,outfit:'jacket',outfitCol:0x2a2a4a};

var weapons = [
    {n:'Fists',t:'melee',d:20,r:45,s:0.18,i:'👊',c:'#88ccff'},
    {n:'Katana',t:'melee',d:40,r:55,s:0.22,i:'⚔️',c:'#00ccff'},
    {n:'Pistol',t:'gun',d:28,r:400,s:0.2,i:'🔫',c:'#ffcc44',a:60,ma:60},
    {n:'Shotgun',t:'gun',d:70,r:180,s:0.6,i:'💥',c:'#ff4444',a:20,ma:20},
    {n:'SMG',t:'gun',d:12,r:350,s:0.05,i:'🔫',c:'#44ff44',a:200,ma:200},
];

// === WORLD ===
var WORLD_W=10000;
var platforms=[],buildings=[],vehicles=[],enemies=[],npcs=[],projectiles=[],particles=[];
var gameMode='story', activeJob=null;
var cursedEnergy=0, domainExpansions=0;
var checkpoint={x:100,y:0};

// === MISSIONS ===
var missions = [
    {t:'New City, New Life',d:'Talk to Zero',done:false,npc:'Zero',act:1},
    {t:'Street Cred',d:'Defeat 5 enemies',done:false,k:0,kn:5,act:1},
    {t:'Wheels',d:'Get in a car and drive past 2000',done:false,loc:2000,act:1},
    {t:'Underground',d:'Talk to Viper',done:false,npc:'Viper',act:2},
    {t:'Gang Territory',d:'Defeat 10 enemies',done:false,k:0,kn:10,act:2},
    {t:'The Whisper',d:'Talk to Nyx',done:false,npc:'Nyx',act:2},
    {t:'Power Surge',d:'Fill CE bar fully',done:false,ceFill:true,act:3},
    {t:'Arena Trial',d:'Defeat 12 enemies',done:false,k:0,kn:12,act:3},
    {t:'The Broker',d:'Talk to Silk',done:false,npc:'Silk',act:3},
    {t:'Domain Awakening',d:'Defeat 15 enemies in a row',done:false,k:0,kn:15,act:4},
    {t:'The Mesh Signal',d:'Reach position 8000',done:false,loc:8000,act:4},
    {t:'The Vault',d:'Talk to Oracle',done:false,npc:'Oracle',act:5},
    {t:'Mesh Guardian',d:'Defeat 20 enemies',done:false,k:0,kn:20,act:5},
    {t:'THE MESH',d:'Reach the Mesh at position 9500',done:false,loc:9500,act:5},
];
var curMission = 0;

// === SHOP ===
var shopItems = [
    {n:'Health Pack',d:'Full HP',p:80,fn:function(){P.hp=P.mhp;}},
    {n:'Max HP +40',d:'Permanent',p:300,fn:function(){P.mhp+=40;P.hp=P.mhp;}},
    {n:'Max SP +20',d:'Permanent',p:250,fn:function(){P.msp+=20;P.sp=P.msp;}},
    {n:'Ammo Refill',d:'All guns',p:100,fn:function(){weapons.forEach(function(w){if(w.a!==undefined)w.a=w.ma;});}},
    {n:'Damage +20%',d:'All weapons',p:500,fn:function(){weapons.forEach(function(w){w.d=Math.floor(w.d*1.2);});}},
    {n:'AK-47',d:'Gun, 38dmg, 120 ammo',p:2500,fn:function(){weapons.push({n:'AK-47',t:'gun',d:38,r:450,s:0.1,i:'🔫',c:'#cc8844',a:120,ma:120});}},
    {n:'Dual Katanas',d:'Melee, 50dmg, fast',p:3500,fn:function(){weapons.push({n:'Dual Katanas',t:'melee',d:50,r:55,s:0.1,i:'⚔️',c:'#88ddff'});}},
    {n:'Minigun',d:'8dmg but 500 ammo',p:5000,fn:function(){weapons.push({n:'Minigun',t:'gun',d:8,r:350,s:0.03,i:'🔫',c:'#44ff44',a:500,ma:500});}},
    {n:'Railgun',d:'400dmg, 3 shots',p:8000,fn:function(){weapons.push({n:'Railgun',t:'gun',d:400,r:700,s:2.0,i:'⚡',c:'#00ffff',a:3,ma:3});}},
    {n:'Demon Blade',d:'Melee, 95dmg',p:6000,fn:function(){weapons.push({n:'Demon Blade',t:'melee',d:95,r:65,s:0.35,i:'🗡️',c:'#ff0044'});}},
    {n:'Spawn Car',d:'Vehicle',p:1500,fn:function(){vehicles.push(mkVehicle(P.x+80,'car'));}},
    {n:'Spawn Bike',d:'Fast',p:800,fn:function(){vehicles.push(mkVehicle(P.x+80,'bike'));}},
    {n:'Bounty Job',d:'Kill 5 = $500',p:0,fn:function(){startJob('bounty');}},
    {n:'Delivery Job',d:'Drive to 4000 = $400',p:0,fn:function(){startJob('delivery');}},
];

// === INIT ===
function init(){canvas=document.getElementById('game');ctx=canvas.getContext('2d');resize();window.addEventListener('resize',resize);document.addEventListener('keydown',function(e){keys[e.code]=true;handleKey(e.code);});document.addEventListener('keyup',function(e){keys[e.code]=false;});}
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;}

function handleKey(code){
    if(phase==='auth')return;
    if(phase==='avatar')return;
    if(code==='KeyB')toggleShop();
    if(code==='Space'&&dlgOpen){closeDlg();return;}
    if(code==='KeyE')interact();
    if(code==='Digit1')P.weapon=(P.weapon+1)%weapons.length;
    if(code==='Digit2')P.weapon=(P.weapon-1+weapons.length)%weapons.length;
    if(code==='KeyV')activateDomain();
    if(code==='KeyU')toggleMode();
    if(code==='Digit9')togglePVP();
}

// === AUTH ===
function authTab(mode){authMode=mode;document.getElementById('tab-login').className='tab'+(mode==='login'?' active':'');document.getElementById('tab-reg').className='tab'+(mode==='register'?' active':'');document.getElementById('auth-btn').textContent=mode==='login'?'LOG IN':'CREATE ACCOUNT';document.getElementById('auth-err').textContent='';}

function authSubmit(){
    var user=document.getElementById('auth-user').value.trim();
    var pass=document.getElementById('auth-pass').value.trim();
    if(!user||!pass){document.getElementById('auth-err').textContent='Fill in both fields';return;}
    var url=authMode==='login'?'/api/login':'/api/register';
    var body={username:user,password:pass};
    if(authMode==='register'){body.gender=avatar.gender;body.avatar=avatar;}
    fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}).then(function(d){
        if(!d.ok){document.getElementById('auth-err').textContent=d.err;return;}
        username=d.username;account=d.account;
        if(authMode==='register'){document.getElementById('auth').classList.add('hidden');document.getElementById('avatar-screen').classList.remove('hidden');setupAvatarUI();}
        else{document.getElementById('auth').classList.add('hidden');P.lv=account.level||1;P.money=account.money||2000;P.mhp=200+P.lv*12;P.hp=P.mhp;curMission=account.story_progress||0;beginGame();}
    }).catch(function(){document.getElementById('auth-err').textContent='Server error. Is server running?';});
}

// === AVATAR ===
function setupAvatarUI(){
    var o=document.getElementById('av-options');o.innerHTML='';
    function cat(title){var d=document.createElement('div');d.className='av-cat';d.innerHTML='<h3>'+title+'</h3>';var r=document.createElement('div');r.className='av-row';d.appendChild(r);o.appendChild(d);return r;}
    // Gender
    var gr=cat('Gender');
    ['male','female'].forEach(function(g){var b=document.createElement('div');b.className='av-text'+(g===avatar.gender?' sel':'');b.textContent=g;b.onclick=function(){avatar.gender=g;setupAvatarUI();drawAvPreview();};gr.appendChild(b);});
    // Skin
    var sr=cat('Skin');
    [0xf5d0a9,0xe8b88a,0xc68642,0x8d5524,0x4a2c17,0x2c1810].forEach(function(c){var b=document.createElement('div');b.className='av-color'+(c===avatar.skin?' sel':'');b.style.background='#'+c.toString(16).padStart(6,'0');b.onclick=function(){avatar.skin=c;setupAvatarUI();drawAvPreview();};sr.appendChild(b);});
    // Hair
    var hr=cat('Hair');
    ['spiky','short','long','afro','mohawk','ponytail'].forEach(function(h){var b=document.createElement('div');b.className='av-text'+(h===avatar.hair?' sel':'');b.textContent=h;b.onclick=function(){avatar.hair=h;setupAvatarUI();drawAvPreview();};hr.appendChild(b);});
    // Hair color
    var hcr=cat('Hair Color');
    [0x1a1a1a,0x4a2c17,0x8B6914,0xc8a44e,0xcc2222,0x2222cc,0x22cc22,0xffffff].forEach(function(c){var b=document.createElement('div');b.className='av-color'+(c===avatar.hairCol?' sel':'');b.style.background='#'+c.toString(16).padStart(6,'0');b.onclick=function(){avatar.hairCol=c;setupAvatarUI();drawAvPreview();};hcr.appendChild(b);});
    // Outfit
    var or=cat('Outfit');
    ['jacket','hoodie','suit','tactical','streetwear'].forEach(function(x){var b=document.createElement('div');b.className='av-text'+(x===avatar.outfit?' sel':'');b.textContent=x;b.onclick=function(){avatar.outfit=x;setupAvatarUI();drawAvPreview();};or.appendChild(b);});
    drawAvPreview();
}

function drawAvPreview(){
    var c=document.getElementById('av-preview');if(!c)return;var x=c.getContext('2d');x.clearRect(0,0,160,240);x.fillStyle='#111';x.fillRect(0,0,160,240);
    var sk='#'+avatar.skin.toString(16).padStart(6,'0'),hc='#'+avatar.hairCol.toString(16).padStart(6,'0');
    var oc={jacket:'#2a2a4a',hoodie:'#3a3a6a',suit:'#1a1a2e',tactical:'#2a4a2a',streetwear:'#4a2a4a'}[avatar.outfit]||'#333';
    x.fillStyle=oc;x.beginPath();x.ellipse(80,130,avatar.gender==='female'?18:22,36,0,0,Math.PI*2);x.fill();
    x.fillStyle=sk;x.beginPath();x.arc(80,72,20,0,Math.PI*2);x.fill();
    x.fillStyle='#fff';x.beginPath();x.arc(73,70,3.5,0,6.28);x.fill();x.beginPath();x.arc(87,70,3.5,0,6.28);x.fill();
    x.fillStyle='#222';x.beginPath();x.arc(74,71,2,0,6.28);x.fill();x.beginPath();x.arc(88,71,2,0,6.28);x.fill();
    x.fillStyle=hc;
    switch(avatar.hair){case'spiky':x.beginPath();x.moveTo(60,68);x.lineTo(65,45);x.lineTo(72,62);x.lineTo(80,40);x.lineTo(88,62);x.lineTo(95,45);x.lineTo(100,68);x.closePath();x.fill();break;case'short':x.beginPath();x.arc(80,63,20,Math.PI,0);x.fill();break;case'long':x.fillRect(62,52,36,55);break;case'afro':x.beginPath();x.arc(80,66,28,0,6.28);x.fill();break;case'mohawk':x.fillRect(74,40,12,26);break;case'ponytail':x.beginPath();x.arc(80,62,19,Math.PI,0);x.fill();x.fillRect(90,58,8,35);break;}
    x.fillStyle=sk;x.fillRect(55,105,12,40);x.fillRect(93,105,12,40);
    x.fillStyle='#2a2a4a';x.fillRect(68,165,12,46);x.fillRect(80,165,12,46);
    x.fillStyle='#111';x.fillRect(66,209,15,9);x.fillRect(79,209,15,9);
}

function finishAvatar(){document.getElementById('avatar-screen').classList.add('hidden');beginGame();}

// === BEGIN GAME ===
function beginGame(){
    phase='playing';document.getElementById('hud').style.display='block';
    document.getElementById('pvp-indicator').style.display='block';
    document.getElementById('pvp-indicator').textContent='Press 9 for PVP';
    genWorld();updHUD();updQuest();
    msg('Welcome, '+username+'. The Mesh is out there.');
    lastTime=performance.now();loop();
}

// === WORLD ===
function genWorld(){
    platforms.push({x:-500,y:H-70,w:WORLD_W+1000,h:200,c:'#0a0a14'});
    for(var i=0;i<50;i++)platforms.push({x:200+i*190+Math.random()*80,y:H-70-50-Math.random()*180,w:70+Math.random()*100,h:12,c:'#14141f'});
    for(var b=0;b<60;b++)buildings.push({x:-100+b*165+Math.random()*40,y:H-70-(80+Math.random()*300),w:50+Math.random()*70,h:80+Math.random()*300,c:['#0a1018','#0f141f','#080c14','#101822','#0a0f16'][Math.floor(Math.random()*5)]});
    vehicles.push(mkVehicle(500,'bike'));vehicles.push(mkVehicle(1800,'car'));vehicles.push(mkVehicle(3500,'car'));vehicles.push(mkVehicle(5000,'bike'));vehicles.push(mkVehicle(7000,'car'));
    npcs.push({x:250,y:H-70-56,name:'Zero',portrait:'⚡',color:'#00ccff',lines:["Welcome to the city. You're new here.","The Mesh exists. Far east. Everyone wants it.","Earn your place first. Fight. Drive. Survive."]});
    npcs.push({x:1500,y:H-70-56,name:'Viper',portrait:'🐍',color:'#44ff44',lines:["The gangs run everything here.","You want the Mesh? Get through them first.","I can point you in the right direction... for a price."]});
    npcs.push({x:3000,y:H-70-56,name:'Nyx',portrait:'🌙',color:'#aa44ff',lines:["I've seen the Mesh's glow from here.","It changes people. Makes them gods.","Or destroys them. Depends on your will."]});
    npcs.push({x:5000,y:H-70-56,name:'Silk',portrait:'🎭',color:'#ff8844',lines:["Weapons, cars, anything you need.","The domain power is real. I've seen it.","Keep pushing east. The signal gets stronger."]});
    npcs.push({x:7500,y:H-70-56,name:'Oracle',portrait:'🔮',color:'#f0c040',lines:["The Mesh is at the edge of the world.","Only those who survive all trials may claim it.","You're close. Don't stop now."]});
    for(var e=0;e<60;e++)enemies.push(mkEnemy(400+e*150+Math.random()*60));
}
function mkVehicle(x,t){return{x:x,y:H-70-24,t:t,w:t==='car'?80:50,h:24,spd:t==='car'?550:700,c:['#cc0000','#222','#0044aa','#444','#ff4400','#00aa44'][Math.floor(Math.random()*6)]};}
function mkEnemy(x){var hp=50+Math.floor(Math.random()*40);return{x:x,y:H-70-48,w:26,h:48,hp:hp,mhp:hp,facing:-1,state:'patrol',cd:0,dead:false,dmg:6+Math.floor(Math.random()*6),spd:80+Math.random()*80,c:['#442222','#222244','#224422'][Math.floor(Math.random()*3)],flash:0};}

// === UPDATE ===
function update(){
    if(dlgOpen||shopOpen||pvpOpen)return;
    var mx=0;if(keys['KeyA']||keys['ArrowLeft']){mx=-1;P.facing=-1;}if(keys['KeyD']||keys['ArrowRight']){mx=1;P.facing=1;}
    if(P.inVehicle){var v=P.vRef;v.x+=mx*v.spd*dt;P.x=v.x;P.y=v.y-20;if(keys['KeyW']||keys['ArrowUp']){P.inVehicle=false;P.vRef=null;P.vy=-300;}var m=missions[curMission];if(m&&m.loc&&!m.done&&P.x>m.loc)compMission();}
    else{
        P.vx=mx*P.speed;
        if(keys['Space']&&dashCd<=0&&P.sp>=15){P.dashing=true;P.dashTime=0.15;P.vx=P.facing*750;P.sp-=15;dashCd=0.4;spawnP(P.x,P.y+28,'#00ccff',6,150);}
        if(P.dashing){P.dashTime-=dt;if(P.dashTime<=0)P.dashing=false;}
        if(dashCd>0)dashCd-=dt;
        if((keys['KeyW']||keys['ArrowUp'])&&P.grounded){P.vy=-580;P.grounded=false;}
        P.vy+=1500*dt;P.x+=P.vx*dt;P.y+=P.vy*dt;
        P.grounded=false;
        platforms.forEach(function(pl){if(P.x+P.w/2>pl.x&&P.x-P.w/2<pl.x+pl.w&&P.y+P.h>pl.y&&P.y+P.h<pl.y+25&&P.vy>0){P.y=pl.y-P.h;P.vy=0;P.grounded=true;}});
        if(P.y>H+200){P.y=H-70-P.h;P.vy=0;P.grounded=true;P.hp-=10;if(P.hp<=0)die();}
        P.x=Math.max(0,Math.min(WORLD_W,P.x));
        if((keys['KeyF']||keys['KeyJ'])&&atkCd<=0)melee();
        if((keys['KeyL']||keys['KeyY'])&&atkCd<=0)shoot();
        if(keys['KeyK']&&specCd<=0&&P.sp>=35)special();
    }
    if(atkCd>0)atkCd-=dt;if(specCd>0)specCd-=dt;if(domainCd>0)domainCd-=dt;if(invincible>0)invincible-=dt;
    if(domainActive){domainTimer-=dt;if(domainTimer<=0)domainActive=false;}
    P.sp=Math.min(P.msp,P.sp+12*dt);
    var m=missions[curMission];if(m&&m.ceFill&&!m.done&&P.ce>=P.maxCe)compMission();
    // Enemies
    enemies.forEach(function(e){if(e.dead)return;var d=Math.abs(e.x-P.x),vd=Math.abs((e.y+e.h/2)-(P.y+P.h/2));if(e.flash>0)e.flash-=dt;if(d<280&&vd<60){e.state='chase';e.facing=P.x>e.x?1:-1;if(d>35)e.x+=e.facing*e.spd*dt;else if(e.cd<=0&&vd<40){if(!P.dashing&&invincible<=0){P.hp-=e.dmg;spawnP(P.x,P.y+20,'#ff4444',3,150);if(P.hp<=0)die();}e.cd=1.5;}}else{e.state='patrol';e.x+=Math.sin(time+e.x*.01)*20*dt;}if(e.cd>0)e.cd-=dt;});
    // Projectiles
    for(var i=projectiles.length-1;i>=0;i--){var p=projectiles[i];p.x+=p.vx*dt;p.life-=dt;if(p.life<=0){projectiles.splice(i,1);continue;}enemies.forEach(function(e){if(!e.dead&&Math.abs(p.x-e.x)<25&&Math.abs(p.y-e.y-24)<25){hitE(e,p.dmg);p.life=0;}});}
    // Particles
    for(var j=particles.length-1;j>=0;j--){var pt=particles[j];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=400*dt;pt.life-=dt;if(pt.life<=0)particles.splice(j,1);}
    // Respawn enemies
    if(m&&m.kn&&!m.done){var alive=0;enemies.forEach(function(e){if(!e.dead)alive++;});if(alive<4){for(var ri=0;ri<3;ri++)enemies.push(mkEnemy(P.x+250+Math.random()*300));}}
    // Jobs
    if(activeJob&&activeJob.type==='delivery'&&P.x>activeJob.target){P.money+=activeJob.reward;notify('💼 JOB DONE','+$'+activeJob.reward);activeJob=null;updHUD();}
    if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
    cam.x+=(P.x-W/2-cam.x)*5*dt;cam.y+=(P.y-H/2+80-cam.y)*3*dt;
}

// === COMBAT ===
function melee(){var w=weapons[P.weapon];if(w.t!=='melee'){P.weapon=1;w=weapons[1];}atkCd=w.s;P.attacking=true;setTimeout(function(){P.attacking=false;},120);spawnP(P.x+P.facing*30,P.y+25,w.c,4,80);enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<w.r&&(e.x-P.x)*P.facing>-15&&Math.abs(e.y-P.y)<50)hitE(e,w.d);});}
function shoot(){var w=weapons[P.weapon];if(w.t!=='gun'){P.weapon=2;w=weapons[2];}if(w.a<=0){atkCd=0.5;msg('No ammo! Switch (1/2) or buy (B)');return;}w.a--;atkCd=w.s;projectiles.push({x:P.x+P.facing*20,y:P.y+22,vx:P.facing*900,dmg:w.d,life:1.5,c:w.c});spawnP(P.x+P.facing*25,P.y+22,'#ffff88',2,150);}
function special(){P.sp-=35;specCd=1.2;spawnP(P.x,P.y+20,'#00ccff',15,250);enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<160)hitE(e,80);});}
function activateDomain(){if(domainExpansions<=0){msg('No domain yet! Keep progressing.');return;}if(domainCd>0){msg('Cooldown: '+Math.ceil(domainCd)+'s');return;}if(P.ce<60){msg('Need 60 CE!');return;}P.ce-=60;domainActive=true;domainTimer=3;domainCd=18;notify('🌀 DOMAIN','EXPANSION');enemies.forEach(function(e){if(!e.dead&&Math.abs(e.x-P.x)<500)hitE(e,250);});spawnP(P.x,P.y+20,'#aa00ff',40,300);}
function hitE(e,dmg){e.hp-=dmg;e.flash=0.1;e.x+=P.facing*12;spawnP(e.x,e.y+20,'#ff8844',4,180);P.ce=Math.min(P.maxCe,P.ce+4);combo++;comboTimer=2;updCombo();if(e.hp<=0){e.dead=true;P.xp+=10;P.money+=12+Math.floor(Math.random()*18);var m=missions[curMission];if(m&&m.kn&&!m.done){m.k=(m.k||0)+1;if(m.k>=m.kn)compMission();}if(activeJob&&activeJob.kills!==undefined){activeJob.kills++;if(activeJob.kills>=activeJob.target){P.money+=activeJob.reward;notify('💼 JOB','+$'+activeJob.reward);activeJob=null;}}spawnP(e.x,e.y+24,e.c,10,250);checkLv();updHUD();}}
function checkLv(){if(P.xp>=P.lv*80){P.xp-=P.lv*80;P.lv++;P.mhp+=12;P.hp=P.mhp;if(P.lv===5)domainExpansions=1;if(P.lv===10)domainExpansions=2;notify('LEVEL UP','Level '+P.lv+(P.lv===5?' — Domain Unlocked!':''));saveProgress();}}

// === DEATH ===
function die(){P.hp=0;notify('☠️ DIED','Respawning...');spawnP(P.x,P.y+28,'#ff0000',20,300);setTimeout(function(){P.hp=P.mhp;P.sp=P.msp;P.ce=0;P.vy=0;P.x=checkpoint.x;P.y=H-70-P.h;P.grounded=true;invincible=3;msg('Respawned. 3s shield.');updHUD();},1200);}

// === INTERACT ===
function interact(){if(dlgOpen){closeDlg();return;}if(!P.inVehicle){for(var i=0;i<vehicles.length;i++){if(Math.abs(P.x-vehicles[i].x)<vehicles[i].w){P.inVehicle=true;P.vRef=vehicles[i];msg('Driving! A/D steer, W exit');return;}}for(var j=0;j<npcs.length;j++){if(Math.abs(P.x-npcs[j].x)<55){openDlg(npcs[j]);return;}}}else{P.inVehicle=false;P.vRef=null;}}
function openDlg(npc){dlgOpen=true;document.getElementById('dialogue-box').style.display='block';document.getElementById('dlg-portrait').textContent=npc.portrait;document.getElementById('dlg-name').textContent=npc.name;document.getElementById('dlg-text').textContent=npc.lines[Math.floor(Math.random()*npc.lines.length)];var m=missions[curMission];if(m&&m.npc===npc.name&&!m.done)compMission();}
function closeDlg(){dlgOpen=false;document.getElementById('dialogue-box').style.display='none';}

// === MISSIONS ===
function compMission(){var m=missions[curMission];if(!m||m.done)return;m.done=true;P.xp+=40;P.money+=150;notify('✅ COMPLETE',m.t);curMission++;checkpoint={x:P.x,y:P.y};checkLv();updHUD();updQuest();saveProgress();}

// === PVP (press 9) ===
function togglePVP(){pvpOpen=!pvpOpen;var el=document.getElementById('pvp-panel');if(pvpOpen){el.style.display='block';el.innerHTML='<h2>⚔️ PVP ARENA</h2><p style="color:#888;font-size:11px;text-align:center">Loading opponents...</p>';fetch('/api/pvp-opponents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username})}).then(function(r){return r.json();}).then(function(d){if(!d.ok)return;var html='<h2>⚔️ PVP ARENA</h2><p style="color:#888;font-size:11px;text-align:center;margin-bottom:10px">Fight other players\' stats</p>';if(d.opponents.length===0)html+='<p style="color:#666;text-align:center">No opponents yet. Tell friends to sign up!</p>';d.opponents.forEach(function(o,i){html+='<div class="pvp-opp" onclick="Game.pvpFight('+i+')"><div><div class="opp-name">'+o.name+'</div><div class="opp-stats">Lv.'+o.level+' | '+o.pvp_wins+' wins</div></div><div style="color:#00ccff;font-size:11px">FIGHT</div></div>';});html+='<div class="panel-close" onclick="Game.togglePVP()">[ Close - 9 ]</div>';el.innerHTML=html;}).catch(function(){el.innerHTML='<h2>PVP</h2><p style="color:#f44;text-align:center">Server error</p><div class="panel-close" onclick="Game.togglePVP()">Close</div>';});}else{el.style.display='none';}}
function pvpFight(i){pvpOpen=false;document.getElementById('pvp-panel').style.display='none';var oppLv=5+Math.floor(Math.random()*10);var oppHp=100+oppLv*20;var yourDmg=weapons[P.weapon].d*3+P.lv*5;var oppDmg=oppLv*8;var rounds=0;while(oppHp>0&&P.hp>0&&rounds<20){oppHp-=yourDmg;P.hp-=Math.max(0,oppDmg-P.lv*2);rounds++;}if(oppHp<=0){P.money+=300+oppLv*50;P.xp+=50;notify('🏆 PVP WIN','+$'+(300+oppLv*50));account.pvp_wins=(account.pvp_wins||0)+1;}else{notify('💀 PVP LOSS','Train harder!');account.pvp_losses=(account.pvp_losses||0)+1;}if(P.hp<=0)P.hp=30;checkLv();updHUD();saveProgress();}

// === MODE / SHOP / JOBS ===
function toggleMode(){if(gameMode==='story'){gameMode='free';P.x=4000+Math.random()*500;P.y=0;P.vy=0;notify('🌃 FREE ROAM','Explore. U = back.');msg('FREE ROAM. B=shop, E=interact.');}else{gameMode='story';var m=missions[curMission];if(m&&m.npc){for(var i=0;i<npcs.length;i++){if(npcs[i].name===m.npc){P.x=npcs[i].x-60;break;}}}P.y=0;P.vy=0;notify('⚔️ STORY','Back to quest.');msg('STORY MODE.');}updHUD();updQuest();}
function toggleShop(){shopOpen=!shopOpen;var el=document.getElementById('shop-panel');if(shopOpen){var html='<h2>🏪 SHOP</h2><p class="shop-cash">$'+P.money+'</p>';shopItems.forEach(function(it,i){html+='<div class="shop-item" onclick="Game.buy('+i+')"><div><div class="si-name">'+it.n+'</div><div class="si-desc">'+it.d+'</div></div><div class="si-price">'+(it.p>0?'$'+it.p:'FREE')+'</div></div>';});html+='<div class="panel-close" onclick="Game.toggleShop()">[ Close - B ]</div>';el.innerHTML=html;el.style.display='block';}else{el.style.display='none';}}
function buy(i){var it=shopItems[i];if(it.p>0&&P.money<it.p){msg("Can't afford!");return;}P.money-=it.p;it.fn();msg(it.n+' acquired!');updHUD();toggleShop();toggleShop();}
function startJob(t){if(activeJob){msg('Finish current job first!');return;}shopOpen=false;document.getElementById('shop-panel').style.display='none';if(t==='bounty')activeJob={type:'bounty',target:5,kills:0,reward:500};else activeJob={type:'delivery',target:4000,reward:400};msg('JOB started!');}

// === SAVE ===
function saveProgress(){if(!username)return;fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username,level:P.lv,money:P.money,xp:P.xp,kills:account?account.kills||0:0,pvp_wins:account?account.pvp_wins||0:0,pvp_losses:account?account.pvp_losses||0:0,story_progress:curMission})}).catch(function(){});}

// === HUD ===
function updHUD(){document.getElementById('hp-bar').style.width=(P.hp/P.mhp*100)+'%';document.getElementById('sp-bar').style.width=(P.sp/P.msp*100)+'%';document.getElementById('ce-bar').style.width=(P.ce/P.maxCe*100)+'%';var w=weapons[P.weapon];var a=w.a!==undefined?' ['+w.a+']':'';var j=activeJob?' | 💼'+(activeJob.kills!==undefined?activeJob.kills+'/'+activeJob.target:'Drive'):'';document.getElementById('hud-info').textContent='Lv.'+P.lv+' | $'+P.money+' | '+w.i+' '+w.n+a+' | CE:'+Math.floor(P.ce)+j;}
function updQuest(){var el=document.getElementById('quest-box');if(gameMode==='free'){el.innerHTML='<span style="color:#44ff88;font-size:9px;font-weight:700">🌃 FREE ROAM</span><br><span style="color:#555;font-size:8px">B=Shop E=Interact 9=PVP U=Story</span>';}else{var m=missions[curMission];el.innerHTML=m?'<b style="color:#00ccff">'+m.t+'</b><br>'+m.d+'<br><span style="color:#444;font-size:8px">'+(curMission+1)+'/'+missions.length+' | U=FreeRoam 9=PVP</span>':'<b style="color:#4f4">GAME COMPLETE - THE MESH IS YOURS</b>';}}
function updCombo(){var el=document.getElementById('combo-counter');el.textContent=combo>1?combo+'x':'';el.style.opacity=combo>1?'1':'0';}
function msg(t){var d=document.createElement('div');d.className='mg';d.textContent=t;document.getElementById('msgs').appendChild(d);setTimeout(function(){d.remove();},2500);}
function notify(h,p){var n=document.getElementById('notif');n.querySelector('h2').textContent=h;n.querySelector('p').textContent=p;n.style.display='block';setTimeout(function(){n.style.display='none';},2500);}
function spawnP(x,y,col,n,f){for(var i=0;i<n;i++)particles.push({x:x,y:y,vx:(Math.random()-.5)*f*2,vy:-Math.random()*f,life:0.4+Math.random()*0.3,c:col,sz:3+Math.random()*5});}

// === DRAW ===
function draw(){
    ctx.fillStyle='#030308';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-cam.x,-cam.y);
    var sky=ctx.createLinearGradient(0,cam.y,0,cam.y+H);sky.addColorStop(0,'#030310');sky.addColorStop(0.5,'#080418');sky.addColorStop(1,'#050510');ctx.fillStyle=sky;ctx.fillRect(cam.x,cam.y,W,H);
    ctx.fillStyle='rgba(255,255,255,0.25)';for(var s=0;s<70;s++)ctx.fillRect(((s*137+50)%WORLD_W)*0.8+cam.x*0.1,(s*73%300)+cam.y*0.05,1.5,1.5);
    ctx.fillStyle='#001133';ctx.beginPath();ctx.arc(cam.x+W*0.8,cam.y+70,25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0088ff';ctx.globalAlpha=0.2;ctx.beginPath();ctx.arc(cam.x+W*0.8,cam.y+70,32,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    buildings.forEach(function(b){var bx=b.x*0.7+cam.x*0.3;ctx.fillStyle=b.c;ctx.fillRect(bx,b.y,b.w,b.h);ctx.fillStyle='rgba(0,180,255,0.1)';for(var wy=b.y+12;wy<b.y+b.h-8;wy+=18)for(var wx=bx+6;wx<bx+b.w-6;wx+=12){if(Math.random()>.5)ctx.fillRect(wx,wy,5,7);}});
    platforms.forEach(function(pl){ctx.fillStyle=pl.c;ctx.fillRect(pl.x,pl.y,pl.w,pl.h);ctx.fillStyle='#222';ctx.fillRect(pl.x,pl.y,pl.w,2);});
    vehicles.forEach(function(v){ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(v.x-v.w/2+4,v.y+v.h-2,v.w-8,3);ctx.fillStyle=v.c;ctx.fillRect(v.x-v.w/2,v.y+6,v.w,v.h-6);ctx.fillStyle='#111';ctx.beginPath();ctx.arc(v.x-v.w/3,v.y+v.h,5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(v.x+v.w/3,v.y+v.h,5,0,6.28);ctx.fill();if(Math.abs(P.x-v.x)<v.w&&!P.inVehicle){ctx.fillStyle='#00ccff';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('[E] '+(v.t==='bike'?'Bike':'Car'),v.x,v.y-8);}});
    npcs.forEach(function(n){ctx.fillStyle=n.color;ctx.fillRect(n.x-11,n.y+14,22,28);ctx.fillStyle='#dda870';ctx.beginPath();ctx.arc(n.x,n.y+9,9,0,6.28);ctx.fill();ctx.fillStyle='#00ccff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(n.name,n.x,n.y-4);if(Math.abs(P.x-n.x)<55){ctx.fillStyle='#fff';ctx.font='8px sans-serif';ctx.fillText('[E] Talk',n.x,n.y-14);}});
    enemies.forEach(function(e){if(e.dead)return;var f=e.flash>0;ctx.fillStyle=f?'#fff':e.c;ctx.fillRect(e.x-e.w/2,e.y,e.w,e.h);ctx.fillStyle=f?'#fff':'#8a6050';ctx.beginPath();ctx.arc(e.x,e.y+8,7,0,6.28);ctx.fill();ctx.fillStyle=e.state==='chase'?'#ff2222':'#555';ctx.fillRect(e.x+e.facing*2-1,e.y+7,3,3);if(e.hp<e.mhp){ctx.fillStyle='#222';ctx.fillRect(e.x-12,e.y-6,24,3);ctx.fillStyle='#ff4444';ctx.fillRect(e.x-12,e.y-6,24*(e.hp/e.mhp),3);}});
    // Player
    var px=P.x-P.w/2,py=P.y;ctx.shadowBlur=8;ctx.shadowColor='#00ccff';
    var sk='#'+avatar.skin.toString(16).padStart(6,'0');var hc='#'+avatar.hairCol.toString(16).padStart(6,'0');
    var oc={jacket:'#2a2a4a',hoodie:'#3a3a6a',suit:'#1a1a2e',tactical:'#2a4a2a',streetwear:'#4a2a4a'}[avatar.outfit]||'#333';
    ctx.fillStyle=oc;ctx.fillRect(px+6,py+18,20,26);
    ctx.fillStyle=sk;ctx.beginPath();ctx.arc(P.x,py+12,10,0,6.28);ctx.fill();
    ctx.fillStyle=hc;if(avatar.hair==='spiky'){ctx.beginPath();ctx.moveTo(P.x-9,py+9);ctx.lineTo(P.x-5,py-4);ctx.lineTo(P.x,py+4);ctx.lineTo(P.x+5,py-6);ctx.lineTo(P.x+9,py+3);ctx.lineTo(P.x+11,py+9);ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.arc(P.x,py+6,10,Math.PI,0);ctx.fill();}
    ctx.fillStyle='#00ccff';ctx.fillRect(P.x+P.facing*3-2,py+10,4,4);
    ctx.fillStyle='#2a2a4a';ctx.fillRect(px+8,py+44,7,12);ctx.fillRect(px+17,py+44,7,12);
    if(P.attacking){ctx.save();ctx.translate(P.x+P.facing*20,py+25);ctx.rotate(P.facing*-.7+Math.sin(time*30)*.3);ctx.fillStyle=weapons[P.weapon].c;ctx.fillRect(-2,-18,4,36);ctx.restore();}else{ctx.fillStyle=weapons[P.weapon].c;ctx.fillRect(P.x+P.facing*14,py+20,3*P.facing,18);}
    if(invincible>0){ctx.strokeStyle='rgba(0,200,255,0.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(P.x,py+28,22+Math.sin(time*8)*3,0,6.28);ctx.stroke();}
    ctx.shadowBlur=0;
    // Projectiles
    projectiles.forEach(function(p){ctx.fillStyle=p.c;ctx.shadowBlur=5;ctx.shadowColor=p.c;ctx.fillRect(p.x-4,p.y-2,8,4);});ctx.shadowBlur=0;
    // Particles
    particles.forEach(function(pt){ctx.globalAlpha=pt.life*2.5;ctx.fillStyle=pt.c;ctx.fillRect(pt.x-pt.sz/2,pt.y-pt.sz/2,pt.sz,pt.sz);});ctx.globalAlpha=1;
    ctx.restore();
    if(domainActive){ctx.fillStyle='rgba(100,0,255,0.06)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(100,0,255,0.4)';ctx.lineWidth=3;ctx.setLineDash([8,4]);ctx.strokeRect(6,6,W-12,H-12);ctx.setLineDash([]);ctx.fillStyle='#aa00ff';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.globalAlpha=.5+Math.sin(time*5)*.3;ctx.fillText('🌀 DOMAIN EXPANSION 🌀',W/2,36);ctx.globalAlpha=1;}
}

// === LOOP ===
function loop(){var now=performance.now();dt=Math.min((now-lastTime)/1000,0.05);lastTime=now;time+=dt;update();draw();updHUD();requestAnimationFrame(loop);}

// === PUBLIC ===
init();
return{start:function(){},authTab:authTab,authSubmit:authSubmit,finishAvatar:finishAvatar,toggleShop:toggleShop,buy:buy,togglePVP:togglePVP,pvpFight:pvpFight};
})();
