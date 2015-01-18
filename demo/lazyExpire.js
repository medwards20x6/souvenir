var Souvenir = require("..");
var Cache = new Souvenir.Cache(new Souvenir.CacheProviders.LazyExpireMemory());

var firstCall;

// This function takes a full second to compute the sum!
// 7 seconds after it get's called the first time it breaks and always returns an error
// Options: { "x": [number], "y": [number] }.
function SlowBreakingSum(Options, Callback)
{
	if(!firstCall) {
		firstCall = Date.now();
	} else if(Date.now() - firstCall > 7000) { // break after 7 seconds
		console.log("SlowBreakingSum: Broken");
		return Callback("Error");
	}
	setTimeout
	(
		function() { Callback(null, Options.x + Options.y); },
		1000
	);
}

// The function Sum() is a drop-in replacement anywhere that SlowBreakingSum() was used,
// but it caches results so they don't take a full second after the first call.
var Sum = Cache.Wrap(SlowBreakingSum, { "Namespace": "SlowBreakingSum", "TTL": 3 });



// See it in action...
function TimeIt(Operation)
{
	var Time = Date.now();
	Operation(function(E, R) { console.log("1 + 1 = " + R + "; this took " + (Date.now() - Time) + " milliseconds"); });
}

TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); });
setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 1500);
setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 5000);
setTimeout(function() { TimeIt(function(CB) { Sum({ "x": 1, "y": 1 }, CB); }); }, 10000);

// Output:
// 1 + 1 = 2; this took 1012 milliseconds
// 1 + 1 = 2; this took 0 milliseconds
