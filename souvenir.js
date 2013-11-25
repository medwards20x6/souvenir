var Crypto = require("crypto");

exports.Cache = function(CacheProvider)
{
	function CacheKey(Namespace, Options)
	{
		return Namespace + ":" +
		Crypto.createHash("md5").update(DeterministicStringify(Options)).digest("hex");
	}

	// Wrap a function Operation with a caching layer.
	// Operation: function(Options, Callback)
	// with Callback: function(Error, Result)
	// Options: object with
	//		Namespace: string, cache key namespace (so different function calls w/ same Options don't collide in cache)
	// 			e.g. Namespace = "MyService.MyFunction"
	// 		TTL: integer (default 300), time to live in seconds.
	this.Wrap = function(Operation, Options)
	{
		var TTL = ~~Options.TTL || 300;

		return function(OperationOptions, Callback)
		{
			if (!CacheProvider) return FallThrough();
			var Key = CacheKey(Options.Namespace, OperationOptions);
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

function DeterministicStringify(A)
{
	// TODO: deterministic
	return JSON.stringify(A);
}

// Note that values are JSON-stringified before insertion to the cache and
// JSON-parsed before extraction from the cache. This is so that references
// aren't passed around that may accidentally corrupt the data in the cache.
exports.MemoryCacheProvider = function()
{
	var Cache = {};

	this.Get = function(Key, Callback)
	{
		var Cached = Cache[Key];
		if (!Cached || Cached.Expiration < Date.now())
		{
			delete Cache[Key];
			return Callback();
		}

		var Value;
		try { Value = JSON.parse(Cached.Value); }
		catch (E) { Value = null; }
		return Callback(null, Value);
	};

	this.Set = function(Key, Value, TTL, Callback)
	{
		Callback = Callback || function() {};
		Cache[Key] = { "Expiration": Date.now() + ~~(1000 * TTL), "Value":
		JSON.stringify(Value) };
		Callback();
	};

	this.Invalidate = function(Key, Callback)
	{
		Callback = Callback || function() {};
		delete Cache[Key];
		Callback();
	}
};
