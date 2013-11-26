var DeterministicStringify = require("json-stable-stringify");
var Crypto = require("crypto");

module.exports = function(CacheProvider)
{
	function CacheKey(Namespace, Options)
	{
		return Namespace + ":" +
		Crypto.createHash("md5").update(DeterministicStringify(Options)).digest("hex");
	}

	// Wrap a function Operation with a caching layer.
	// Operation: function(Options, Callback)
	// with Callback: function(Error, Result)
	// CacheOptions: object with
	//		Namespace: string, cache key namespace (so different function calls w/ same Options don't collide in cache)
	// 			e.g. Namespace = "MyService.MyFunction"
	// 		TTL: integer (default 300), time to live in seconds.
	this.Wrap = function(Operation, CacheOptions)
	{
		var TTL = ~~CacheOptions.TTL || 300;

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
