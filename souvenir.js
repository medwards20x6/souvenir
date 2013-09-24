var Crypto = require("crypto");

var CacheProvider = null;
exports.Initialize = function(Provider) { CacheProvider = Provider; }

function CacheKey(Namespace, Options)
{
	return Namespace + ":" + Crypto.createHash("md5").update(DeterministicStringify(Options)).digest("hex");
}

// F: function(Options, Callback)
//		with Callback: function(Error, Result)
// Namespace: string, cache key namespace (so different function calls w/ same Options don't collide in cache)
//		e.g. Namespace = "MyService.MyFunction"
// TTL: integer (default 300), time to live in seconds.
exports.CacheMe = function(F, Namespace, TTL)
{
	TTL = ~~TTL || 300;

	return function(Options, Callback)
	{
		if (!CacheProvider) return FallThrough();
		var Key = CacheKey(Namespace, Options);
		CacheProvider.Get(Key, HandleCacheResponse);

		function FallThrough() { F(Options, Callback); }

		function HandleCacheResponse(Error, Result)
		{
			// If an error occurred, fall through to the original function.
			if (Error) return FallThrough();

			// If the result is cached, return it. Otherwise, add it.
			if (Result) return Callback(Result.Error, Result.Result);

			F(Options, SaveAndPassBack);

			function SaveAndPassBack(E, R)
			{
				CacheProvider.Set(Key, { "Error": E, "Result": R }, TTL);
				Callback(E, R);
			}
		}
	};
}

exports.Invalidate = function(Namespace, Options, Callback)
{
	if (!CacheProvider) return Callback();
	CacheProvider.Invalidate(CacheKey(Namespace, Options), Callback);
}

function DeterministicStringify(A)
{
	// TODO: deterministic
	return JSON.stringify(A);
}
