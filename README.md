souvenir
========
<img src="http://i.imgur.com/JhjEVWD.jpg" />

Unobtrusive caching for asynchronous functions.

Example
---

```javascript
var Souvenir = require("souvenir");
var Cache = new Souvenir.Cache(new Souvenir.CacheProviders.Memory());

// This function takes a full second to compute the sum!
// Options: { "x": [number], "y": [number] }.
function SlowSum(Options, Callback)
{
	setTimeout
	(
		function() { Callback(null, Options.x + Options.y); },
		1000
	);
}

// The function Sum() is a drop-in replacement anywhere that SlowSum() was used,
// but it caches results so they don't take a full second after the first call.
var Sum = Cache.Wrap(SlowSum, { "Namespace": "SlowSum" });
```

In this example, `SlowSum` is the function that you're already using -- e.g. a call out to the database or across the network. That function is left as it is, and `Sum` is the cache-wrapped version which can be used as a drop-in replacement everywhere that `SlowSum` was previously being called.

Here is some sample code to run `Sum` and time it:

```javascript
// See it in action...
function TimeIt(Operation)
{
	var Time = Date.now();
	Operation(function(E, R) { console.log("1 + 1 = " + R + "; this took " + (Date.now() - Time) + " milliseconds"); });
}

TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); });
setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 1500);
```

The output:

	1 + 1 = 2; this took 1012 milliseconds
	1 + 1 = 2; this took 0 milliseconds



Souvenir
---
A souvenir cache is created by

```javascript
var Souvenir = require("souvenir");
var Cache = new Souvenir.Cache([CacheProvider]);
```

where `[CacheProvider]` is a cache provider, as defined below. The two cache providers that come with souvenir are `Souvenir.CacheProviders.Memory` and `Souvenir.CacheProviders.Redis`.

The souvenir cache `Cache` exposes the following methods:

###`Cache.Wrap(Operation, CacheOptions)`

* Wrap the function `Operation` in a souvenir caching layer.
* `Operation`: `function(Options, Callback)`, the function whose results are to be cached.
	* Only the function prototype above is supported, but any function can (and should) be cast into that form (i.e. pass its parameters as a hash instead of as individual parameters).
	* `Operation` is expected to call back with the customary `Callback(Error, Result)` pattern.
* `CacheOptions`: optional object with
	* `Namespace`: optional string, used for avoiding cache key collisions between functions that may receive the same arguments.
	* `TTL`: optional integer (default 300), the number of seconds before cached function results will expire.

####Example: only exporting the wrapped version of a slow function

```javascript
function MySlowQuery(Options, Callback)
{
	// perform some slow query then Callback(null, Result) once the result happens.
}

exports.MyQuery = Cache.Wrap(MySlowQuery, { "Namespace": "MyQuery", "TTL": 60 });
```


###`Cache.Invalidate(Namespace, Options, Callback)`

* Explicitly remove something from the cache.
* `Namespace`: string, the namespace where results for the cached function are being kept.
* `Options`: object, the input to the cached function whose result should be removed from the cache.
* `Callback`: optional `function(Error)` to be called when the operation finishes.

####Example: invalidating a cache entry

```javascript
...
exports.GetUser = Cache.Wrap(GetUser, { "Namespace": "GetUserNS" });

...

function UpdateUserName(Options)
{
	...
	// Make sure that subsequent calls to GetUser don't get stale data.
	Cache.Invalidate("GetUserNS", { "UserID": Options.UserID });
}
```


Cache Providers
---
Souvenir is not tied to a particular way of storing cached data. The caching provider abstracts away the details of interacting with a particular type of storage. Souvenir comes with two caching providers: one for caching in memory and one for caching in redis. Others can be added on top.

A cache provider is an object implementing the following interface to a key/value store:

###`Get(Key, Callback)`

* `Key`: string, the key to retrieve from the cache.
* `Callback`: `function(Error, Result)`
	* This method should be called once the data has been retrieved from the cache.
	* If `Key` is not found in the cache, both `Error` and `Result` should be left falsy.
	* If `Key` is found in the cache, the cached value should be passed back as `Result`.


###`Set(Key, Value, TTL, Callback)`

* `Key`: string, the key under which to store the value in the cache.
* `Value`: object, the value to be stored in the cache.
* `TTL`: integer, the number of seconds until the cached data should expire (time-to-live).
* `Callback`: optional `function(Error)` to be called when the operation finishes.

Note: it is the cache provider's job to expire cache entries based on `TTL`.


###`Invalidate(Key, Callback)`

* `Key`: is the key to be invalidated/deleted in the cache
* `Callback`: optional `function(Error)` to be called when the operation finishes.
