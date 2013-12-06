var DeterministicStringify = require("json-stable-stringify");
var Crypto = require("crypto");

// CacheOptions, object with:
//		DefaultTTL: optional integer (default 300), length of time in seconds to use as a default time-to-live,
//			in seconds, for cache entries.
module.exports = function(CacheProvider, CacheOptions)
{
	CacheOptions = CacheOptions || {};
	CacheOptions.DefaultTTL = ~~CacheOptions.DefaultTTL || 300;

	function CacheKey(Namespace, Options)
	{
		return Namespace + ":" +
		Crypto.createHash("md5").update(DeterministicStringify(Options)).digest("hex");
	}

	// Wrap a function Operation with a caching layer.
	// Operation: function(Options, Callback)
	//		with Callback: function(Error, Result)
	// CacheOptions: object with
	//		Namespace: optional string, cache key namespace (so different function calls w/ same Options don't
	//			collide in cache). Defaults to "".
	//			e.g. Namespace = "MyService.MyFunction"
	// 		TTL: optional integer, time to live in seconds. Defaults to CacheOptions.DefaultTTL.
	this.Wrap = function(Operation, CacheOptions)
	{
		var TTL = ~~CacheOptions.TTL || CacheOptions.DefaultTTL;

		return function(OperationOptions, Callback)
		{
			if (!CacheProvider) return FallThrough();
			var Key = CacheKey(CacheOptions.Namespace, OperationOptions);
			CacheProvider.Get(Key, HandleCacheResponse);

			function HandleCacheResponse(Error, Result)
			{
				// If an error occurred accessing the cache, fall through to the original function.
				if (Error) return Operation(OperationOptions, Callback);

				// If the result is cached, return it. Otherwise, add it.
				if (Result) return Callback(null, Result);

				// If there is nothing in the cache: perform the operation, cache the result, and return it.
				Operation(OperationOptions, SaveAndPassBack);

				// SaveAndPassBack gets the results of actually executing Operation.
				function SaveAndPassBack(E, R)
				{
					if (!R) return Callback(E);
					CacheProvider.Set(Key, R, TTL, function() { Callback(null, R); });
				}
			}
		};
	}

	// This is exposed, rather than just expecting the user to invalidate directly through
	// the cache provider, because the cache key is not exposed to the user.
	this.Invalidate = function(Namespace, Options, Callback)
	{
		if (!CacheProvider) return Callback();
		CacheProvider.Invalidate(CacheKey(Namespace, Options), Callback);
	}
}
