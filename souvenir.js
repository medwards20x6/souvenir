var Crypto = require("crypto");

var CacheProvider = null;
exports.Initialize = function(Provider) { CacheProvider = Provider; }

function CacheKey(Namespace, Options)
{
	return Namespace + ":" + Crypto.createHash("md5").update(DeterministicStringify(Options)).digest("hex");
}

// Wrap a function F with the caching layer.
// F: function(Options, Callback)
//		with Callback: function(Error, Result)
// Options: object with
//		CacheErrors: boolean (default false)
//		Namespace: string, cache key namespace (so different function calls w/ same Options don't collide in cache)
//			e.g. Namespace = "MyService.MyFunction"
//		TTL: integer (default 300), time to live in seconds.
exports.CacheMe = function(F, Options)
{
	var TTL = ~~Options.TTL || 300;

	return function(FOptions, Callback)
	{
		if (!CacheProvider) return FallThrough();
		var Key = CacheKey(Options.Namespace, FOptions);
		CacheProvider.Get(Key, HandleCacheResponse);

		function FallThrough() { F(FOptions, Callback); }

		function HandleCacheResponse(Error, Result)
		{
			// If an error occurred, fall through to the original function.
			if (Error) return FallThrough();

			// If the result is cached, return it. Otherwise, add it.
			if (Result) return Callback(Result.Error, Result.Result);

			F(FOptions, SaveAndPassBack);

			function SaveAndPassBack(E, R)
			{
				var CacheValue = {};
				if (R) CacheValue.Result = R;
				if (E && Options.CacheErrors) CacheValue.Error = E;

				if (Object.keys(CacheValue).length > 0)
					CacheProvider.Set(Key, CacheValue, TTL);

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
