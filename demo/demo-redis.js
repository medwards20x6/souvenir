var Souvenir = require("..");
var Cache = new Souvenir.Cache(new Souvenir.CacheProviders.Redis(require("redis")));

// This function takes a full second to compute the sum!
// Options: { "x": [number], "y": [number] }.
function SlowSum(Options, Callback)
{
	setTimeout
	(
		function() { Callback(null, Options.x + Options.y); },
		1000
	);
}

// The function Sum() is a drop-in replacement anywhere that SlowSum() was used,
// but it caches results so they don't take a full second after the first call.
var Sum = Cache.Wrap(SlowSum, { "Namespace": "SlowSum" });



// See it in action...
function TimeIt(Operation)
{
	var Time = Date.now();
	Operation(function(E, R) { console.log("1 + 1 = " + R + "; this took " + (Date.now() - Time) + " milliseconds"); });
}

TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); });
setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 1500);

// Output:
// 1 + 1 = 2; this took 1012 milliseconds
// 1 + 1 = 2; this took 0 milliseconds
