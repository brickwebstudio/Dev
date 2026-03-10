// ═══════════════════════════════════════════════════════════
// MUSLIM DEV — SERVICE WORKER v3
// Real background push: works when phone is LOCKED or app CLOSED
// ═══════════════════════════════════════════════════════════
var CACHE='muslim-dev-v3';
var ASSETS=['/','./index.html'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).catch(function(){}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached||fetch(e.request).then(function(resp){
        var cl=resp.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,cl);});
        return resp;
      });
    }).catch(function(){return caches.match('./index.html');})
  );
});

// Background push from server
self.addEventListener('push',function(e){
  var d={title:'Muslim Dev',body:'Reminder',tag:'push'};
  try{if(e.data)d=Object.assign(d,e.data.json());}catch(err){}
  e.waitUntil(
    self.registration.showNotification(d.title,{
      body:d.body,tag:d.tag,icon:'./icon-192.png',badge:'./icon-72.png',
      vibrate:[300,100,300,100,300],requireInteraction:true,
      actions:[{action:'open',title:'Open'},{action:'snooze',title:'Snooze 5min'}],
      data:{snoozeMins:5}
    })
  );
});

// Scheduled alarms from app
var _timers=[];
self.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='NOTIFY'){
    self.registration.showNotification(e.data.title||'Muslim Dev',{
      body:e.data.body||'',tag:e.data.tag||'n',icon:'./icon-192.png',
      vibrate:[200,100,200],requireInteraction:false
    });
  }
  if(e.data.type==='SCHEDULE'){
    _timers.forEach(clearTimeout);_timers=[];
    (e.data.reminders||[]).forEach(function(rem){
      var parts=rem.time.split(':');
      var tgt=new Date();
      tgt.setHours(parseInt(parts[0]),parseInt(parts[1]),0,0);
      var now=Date.now();
      if(tgt.getTime()<=now)tgt.setDate(tgt.getDate()+1);
      var delay=tgt.getTime()-now;
      function fire(){
        self.registration.showNotification((rem.icon||'⏰')+' '+rem.name,{
          body:'⏰ Scheduled at '+rem.time,tag:rem.tag||'alarm',
          icon:'./icon-192.png',badge:'./icon-72.png',
          vibrate:[300,100,300,100,300],requireInteraction:true,
          actions:[{action:'open',title:'Open'},{action:'snooze',title:'Snooze'}],
          data:{snoozeMins:5,tag:rem.tag}
        });
        _timers.push(setTimeout(fire,24*60*60*1000));
      }
      _timers.push(setTimeout(fire,delay));
    });
    if(e.source)e.source.postMessage({type:'SCHEDULED',count:(e.data.reminders||[]).length});
  }
  if(e.data.type==='CANCEL_ALL'){_timers.forEach(clearTimeout);_timers=[];}
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  if(e.action==='snooze'){
    var mins=(e.notification.data&&e.notification.data.snoozeMins)||5;
    setTimeout(function(){
      self.registration.showNotification('⏰ Snooze Over',{
        body:'Your snoozed alarm is here!',tag:'snooze',
        icon:'./icon-192.png',vibrate:[400,100,400],requireInteraction:true
      });
    },mins*60*1000);
    return;
  }
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cls){
      for(var i=0;i<cls.length;i++){if('focus'in cls[i])return cls[i].focus();}
      return clients.openWindow('./');
    })
  );
});
