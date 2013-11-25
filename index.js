module.exports =
{
	"Cache": require("./lib/cache"),
	"CacheProviders":
	{
		"Memory": require("./lib/cache_providers/memory"),
		"Redis": require("./lib/cache_providers/redis")
	}
};
