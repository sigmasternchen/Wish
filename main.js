Array.prototype.diff = function(a) {
    return this.filter(function(i) {return !(a.indexOf(i) > -1);});
}

String.prototype.reverse = function() {
	return this.split("").reverse().join("");
}

Math.sign = function(x) {
	return (x > 0) ? 1 : (x < 0) ? -1 : 0; 
}

function nothing() {
}

function ret(v) {
	return v;
}

function isNumber(n) {
	return (parseInt(n) + "" == n);
}

function wait (ms) {
	var now = (new Date()).getTime();
	var to = now + ms;
	while (now != to)
		now = (new Date()).getTime();
}

function clone(object){
	if(!object)
		return object;
	if (typeof object != "object")
        	return object;

	var tmp = object.constructor();

	for(var key in object)
		tmp[key] = clone(object[key]);

	return tmp;
}

var main = function () {
	Emulator.init(document.getElementById("output"), document.forms['form'].elements['input'], 80, 24);
}

var powerOn = function() {
	if (Emulator.running)
		Emulator.kill();
	else
		Emulator.main();
}
