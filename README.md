souvenir
========
<img src="http://i.imgur.com/JhjEVWD.jpg" />

Flexible caching for a async functions

`CacheProvider` definition
---
A `CacheProvider` must be an object exposing functions:

`Get(Key, Callback)`

* `Key` is the key from which to retrieve the result
* `Callback`: `function(Error, Result)`
	* if the key is not found in cache, both `Error` and `Result` should be undefined.
	* if `Result` is returned, it should be a javascript object with keys `Error` and/or `Result`.
Note: it is the cache provider's job to expire cache entries based on `TTL`.

`Set(Key, Value, TTL, Callback)`

* `Key` is the key under which to store the results
* `TTL` is the time for the cache entry to live, in seconds
* `Value` is a javascript object with keys `Error` and/or `Result`.
* `Callback`: optional `function(Error)` to be called when the operation finishes.

`Invalidate(Key, Callback)`
* `Key` is the key to be invalidated/deleted in the cache
* `Callback`: optional `function(Error)` to be called when the operation finishes.


Example
---
	var Souvenir = require("souvenir");

	var Cache = {};

	var MemoryCacheProvider =
	{
		"Get":
			function(Key, Callback)
			{
				var Cached = Cache[Key];
				if (!Cached || Cached.Expiration < Date.now())
				{
					delete Cache[Key];
					return Callback();
				}
				return Callback(null, Cached.Value);
			},
		"Set":
			function(Key, Value, TTL, Callback)
			{
				Callback = Callback || function() {};
				Cache[Key] = { "Expiration": Date.now() + ~~(1000 * TTL), "Value": Value };
				Callback();
			},
		"Invalidate":
			function(Key, Callback)
			{
				Callback = Callback || function() {};
				delete Cache[Key];
				Callback();
			}
	};

	Souvenir.Initialize(MemoryCacheProvider);

	function abc(Options, Callback)
	{
		console.log("NOT CACHED")
		Callback(null, JSON.stringify(Options));
	}

	var b = Souvenir.CacheMe(abc, { "Namespace": "testing.abc", "TTL": 1 });

	var Yes = "should be cached:";
	var No = "should NOT be cached:";
	var NOOP = function() {};

	setTimeout(function() { console.log(No); b({ "a": 1, "b": 2 }, NOOP); }, 0);
	setTimeout(function() { console.log(Yes); b({ "a": 1, "b": 2 }, NOOP); }, 500);
	setTimeout(function() { console.log(No); b({ "a": 1, "b": 2 }, NOOP); }, 1500);
	setTimeout(function() { console.log(Yes); b({ "a": 1, "b": 2 }, NOOP); }, 2000);
	setTimeout(function() { Souvenir.Invalidate("testing.abc", { "a": 1, "b": 2 }); }, 2100);
	setTimeout(function() { console.log(No); b({ "a": 1, "b": 2 }, NOOP); }, 2200);
