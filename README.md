souvenir
========
<img src="http://i.imgur.com/JhjEVWD.jpg" />

Unobtrusive caching for asynchronous functions.

Example
---


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

In this example, `SlowSum` is the function that you're already using -- e.g. a call out to the database or across the network. That function is left as it is, and `Sum` is the cache-wrapped version which can be used as a drop-in replacement everywhere that `SlowSum` was previously being called.

Here is some sample code to run `Sum` and time it:

	// See it in action...
	function TimeIt(Operation)
	{
		var Time = Date.now();
		Operation(function(E, R) { console.log("1 + 1 = " + R + "; this took " + (Date.now() - Time) + " milliseconds"); });
	}

	TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); });
	setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 1500);

The output:

	1 + 1 = 2; this took 1012 milliseconds
	1 + 1 = 2; this took 0 milliseconds


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
