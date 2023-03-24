// If we update any of our static files like any html of js files, then we can change the version number below, so that the service worker gets changed and start to begin installation again
const staticCacheName = 'site-static-v4';
const dynamicCacheName = 'site-dynamic-v2';

const assets = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/app.js',
    '/js/ui.js',
    '/js/materialize.min.js',
    '/css/styles.css',
    '/css/materialize.min.css',
    '/img/dish.png',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
    '/pages/fallback.html',
];

// cache size limit function
const limitCacheSize = (name, size) => {
    caches.open(name).then((cache) => {
        cache.keys().then((keys) => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(limitCacheSize(name, size));
            }
        });
    });
};

// listening for install event
self.addEventListener('install', (evt) => {
    // "evt.waitUntil()" is used to make sure all the required assets are cached and then only the service worker is stopped because if the browser identifies a service worker as fully installed then it would stop the service worker, i.e. the function inside the "install" event listener would be stopped before it could finish fetching all the assets
    // "evt.waitUntil()" expects a promise as the argument
    evt.waitUntil(
        // "caches" is used to access the "cache API" and ".open" is used to open a cache with name the provided name. If the cache with the provided name does not exists then a new one is created with that name. This is an async operation, so the response we get back when the promise resolves is the reference to the cache
        caches.open(staticCacheName).then((cache) => {
            // "addAll() function can be used to add a list of objects to the cache. The keys of the objects would be the different paths we specify for which we need to store the assets and the actual values of the objects would be the assets that are required for that path. So what the "addAll" function is doing is sending a request to get all the specified paths to the server and caching the responses
            // "shell" means that we are caching the basic shell of an application, i.e. the assets that never change and are basically static all the time

            console.log('caching shell assets');
            cache.addAll(assets);
        })
    );
});

// listening for active event
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keys) => {
            // We make use of "Promise.all" because it returns a promise which only resolves if all the promises inside "Promise.all" resolves. So we are only passing a single promise to "evt.WaitUntil()" as it expects a single promise
            return Promise.all(
                keys
                    .filter(
                        (key) =>
                            key !== staticCacheName && key !== dynamicCacheName
                    )
                    // "caches.delete(key)" returns a promise
                    .map((key) => caches.delete(key))
            );
        })
    );
});

// listening for fetch event
self.addEventListener('fetch', (evt) => {
    // "evt.respondWith" is used to provide a custom response to some requests comming in
    // "caches.match(evt.request)" checks inside the caches if there is any record for the current request path
    // We are checking to make sure we don't cache anything which is comming from firestore because firestore handles the caching on its own and we have to do this or else the data might not get displayed properly
    if (evt.request.url.indexOf('firestore.googleapis.com') === -1) {
        evt.respondWith(
            caches
                .match(evt.request)
                .then((cacheRes) => {
                    // if a record was found inside the cache for the particular request path, then the "cacheRes" variable would contains the assets but if there was no record it would be an empty variable. So if its an empty varible we will be returning the actual request than came in and that would fetch the assets from the server
                    return (
                        cacheRes ||
                        // We add the content whic is fetched dynamically to the dynamic cache. Once the promise of the fetch is resolved, we open the dynamic cache and use the "put()" method to store it inside the cache. We are not using the "add()" or "addAll()" method because they sent out actual requests and then store the response to cache, in this case we already have the response. We are cloning the "fetchRes" because if we use it inside the "put" then its content is lost because it is siphoned off and we cannot use it again to return
                        fetch(evt.request).then((fetchRes) => {
                            return caches
                                .open(dynamicCacheName)
                                .then((cache) => {
                                    cache
                                        .put(evt.request.url, fetchRes.clone())
                                        .then((res) => {
                                            limitCacheSize(
                                                dynamicCacheName,
                                                15
                                            );
                                        });

                                    return fetchRes;
                                });
                        })
                    );
                })
                .catch((err) => {
                    // We make sure that we return this page only for request for html pages which are not cached yet and not return it for other requests like images or something.
                    // We can do a similar thing for images also by returning some dummy image for image requests
                    if (evt.request.url.indexOf('.html') > -1) {
                        return caches.match('/pages/fallback.html');
                    }
                })
        );
    }
});
