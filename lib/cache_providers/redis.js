var async = require("async");

// RedisModule should be an instance of the "redis" module:
// https://github.com/mranney/node_redis
// e.g. new Souvenir.CacheProviders.Redis(require("redis"))
// It is not included as a dependence of souvenir because there exist
// projects which will not need to use the redis cache provider.
//
// RedisOptions: object with
//		Host, optional string (default localhost).
//		Port, optional integer (default 6379).
//		Password, optional string.
//		DatabaseNumber, optional integer 0-15 (default 0) specifying the redis database to select.
module.exports = function(RedisModule, RedisOptions)
{
	var RedisClient = null;

	this.Get = function(Key, Callback)
	{
		var AsyncTasks = {};
		AsyncTasks.Initialize = function(CB) { Initialize(RedisOptions, CB); }
		AsyncTasks.Value =
		[
			"Initialize",
			function(CB)
			{
				RedisClient.GET
				(
					Key,
					function(Error, Data)
					{
						if (Error || !Data)
							return CB(Error);

						var Value;
						try { Value = JSON.parse(Data); }
						catch (E) { Value = null; }
						return CB(null, Value);
					}
				);
			}
		];

		async.auto
		(
			AsyncTasks,
			function(Error, Result)
			{
				if (Error) return Callback();
				Callback(null, (Result || {}).Value);
			}
		);
	};

	this.Set = function(Key, Value, TTL, Callback)
	{
		Callback = Callback || function() {};

		var AsyncTasks = {};
		AsyncTasks.Initialize = function(CB) { Initialize(RedisOptions, CB); }
		AsyncTasks.Write =
		[
			"Initialize",
			function(CB) { RedisClient.SETEX(Key, TTL, JSON.stringify(Value), CB); }
		];

		async.auto(AsyncTasks, function() { Callback(); });
	};

	this.Invalidate = function(Key, Callback)
	{
		Callback = Callback || function() {};

		var AsyncTasks = {};
		AsyncTasks.Initialize = function(CB) { Initialize(RedisOptions, CB); }
		AsyncTasks.Delete =
		[
			"Initialize",
			function(CB) { RedisClient.DEL(Key, CB); }
		];

		async.auto(AsyncTasks, function() { Callback(); });
	}

	// If several calls to Initialize come in while a connect is pending, make them wait
	// until the connection succeeds.
	var TemporaryClient;
	var PendingInitialize = [];
	function Initialize(Options, Callback)
	{
		Callback = Callback || function() {};
		if (RedisClient) return Callback();
		if (TemporaryClient) return PendingInitialize.push(Callback);

		Options = Options || {};
		Options.Host = Options.Host || "localhost";
		Options.Port = Options.Port || 6379;
		Options.DatabaseNumber = ~~Options.DatabaseNumber;

		var Timeout = setTimeout(function() { Callback({ "message": "Timed out trying to connect to redis server" }); }, 1000);
		var TemporaryClient = RedisModule.createClient(Options.Port, Options.Host);

		// The auth function doesn't behave in the way you might expect, hence calling it here and not in the "ready" handler.
		if (Options.Password) TemporaryClient.auth(Options.Password, function() {});

		TemporaryClient.on
		(
			"ready",
			function()
			{
				clearTimeout(Timeout);
				RedisClient = TemporaryClient;
				RedisClient.SELECT
				(
					Options.DatabaseNumber,
					function()
					{
						PendingInitialize.forEach(function(CB) { CB(); })
						PendingInitialize.length = 0; // Empty the array without clearing the reference.
						Callback();
					}
				);
			}
		);
	}

	Initialize(RedisOptions);
}
