var DeterministicStringify = require("json-stable-stringify");
var Crypto = require("crypto");
var ExpiredValue = require("./expiredValue");

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
	// WrapOptions: object with
	//		Namespace: optional string, cache key namespace (so different function calls w/ same Options don't
	//			collide in cache). Defaults to "".
	//			e.g. Namespace = "MyService.MyFunction"
	// 		TTL: optional integer, time to live in seconds. Defaults to CacheOptions.DefaultTTL.
	this.Wrap = function(Operation, WrapOptions)
	{
		var TTL = ~~WrapOptions.TTL || CacheOptions.DefaultTTL;

		return function(__OperationOptions, _Callback)
		{
			var OperationOptions = Array.prototype.slice.call(arguments, 0, arguments.length-1);
			var Callback = arguments[arguments.length-1];

			if (!CacheProvider) return FallThrough();
			var Key = CacheKey(WrapOptions.Namespace, OperationOptions);
			CacheProvider.Get(Key, HandleCacheResponse);

			function HandleCacheResponse(Error, Result)
			{
				// If an error occurred accessing the cache, fall through to the original function.
				if (Error) return Operation.apply(null, OperationOptions.concat([Callback]));

				// If the result is cached and hasn't expired, return it immediately.
				if (typeof Result !== "undefined" && !(Result instanceof ExpiredValue)) return Callback(null, Result);

				// If there is nothing in the cache: perform the operation, cache the result, and return it.
				Operation.apply(null, OperationOptions.concat([SaveAndPassBack]));

				function SaveAndPassBack(E, R)
				{
					if (E || typeof R === "undefined") {
						// If we didn't receive an expired result from the cache return an error or nothing
						if(!Result) return Callback(E);
						// If we got here we received an ExpiredValue but we can't replace it so return it
						return Callback(null, Result.Value);
					}
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
