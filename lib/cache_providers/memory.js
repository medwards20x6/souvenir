// Note that values are JSON-stringified before insertion to the cache and
// JSON-parsed before extraction from the cache. This is so that references
// aren't passed around that may accidentally corrupt the data in the cache.
module.exports = function()
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
		Cache[Key] = { "Expiration": Date.now() + ~~(1000 * TTL), "Value": JSON.stringify(Value) };
		Callback();
	};

	this.Invalidate = function(Key, Callback)
	{
		Callback = Callback || function() {};
		delete Cache[Key];
		Callback();
	}
};
