const staticCacheName = 'CurrencyConverterHyacinth-static-v4';


const filesToCache = [
  
  './index.html',
  './main.js',
  './layout.css',
  './manifest.json',
  
  
];

self.addEventListener('install', function(event) {
    console.log('Installing service worker.');
    event.waitUntil(
      caches.open(staticCacheName).then(function(cache) {
        console.log('service worker installed successfully.');
        return cache.addAll(filesToCache);
      }).catch( error => console.log('failed to cache: ' + error))
    );
  });
  
  self.addEventListener('activate', function(event) {
    console.log('service worker activated successfully');
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
             
            return cacheName.startsWith('CurrencyConverterHyacinth-static-v4-') && staticCacheName !== cacheName;
          }).map(function(cacheName) {
            if(staticCacheName !== cacheName){
                return caches.delete(cacheName);
                
            }
          })
        );
      })
    );
  });
  
  self.addEventListener('fetch', function(event) {
    let requestUrl = new URL(event.request.url);
    
    
    if (requestUrl.origin === location.origin) {
      if (requestUrl.pathname === '/') {
        caches.match(event.request).then(response => {
          if (response) {
            
             event.respondWith(caches.match('/index.html'));
             return;
          }
        });
      }
    }
   
    
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(error => {
        return error;
      })
    );

  });
