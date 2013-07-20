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

var main = function () {
	Emulator.init(document.getElementById("output"), document.forms['form'].elements['input'], 80, 24);
}

var powerOn = function() {
	if (Emulator.running)
		Emulator.kill();
	else
		Emulator.main();
}
