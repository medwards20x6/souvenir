var async = require("async");

// RedisModule should be an instance of the "redis" module:
// https://github.com/mranney/node_redis
// e.g. new Souvenir.CacheProviders.Redis(require("redis"))
// It is not included as a dependence of souvenir because there exist
// projects which will not need to use the redis cache provider.
//
// Options: placeholder object
module.exports = function(RedisClient, Options)
{
	this.Get = function(Key, Callback)
	{
		RedisClient.GET
		(
			Key,
			function(Error, Data)
			{
				if (Error || !Data)
					return Callback();

				var Value;
				try { Value = JSON.parse(Data); }
				catch (E) { Value = null; }
				Callback(null, Value);
			}
		);
	};

	this.Set = function(Key, Value, TTL, Callback)
	{
		Callback = Callback || function() {};
		RedisClient.SETEX(Key, TTL, JSON.stringify(Value), function() { Callback(); });
	};

	this.Invalidate = function(Key, Callback)
	{
		Callback = Callback || function() {};
		RedisClient.DEL(Key, function() { Callback(); });
	}
}
