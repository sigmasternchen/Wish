Kernel.IO = function() {
}
Kernel.IO.inputBuffer;
Kernel.IO.init = function() {
	Kernel.IO.inputBuffer = new Array();
}
Kernel.IO.key = function(code) {
	Kernel.IO.inputBuffer.push(code);
}
Kernel.IO.powersw = function() {
	console.log("Kernel: power switch pressed, but no action defined");
}
Kernel.IO.input = function() {
	return Kernel.IO.inputBuffer;
}
Kernel.IO.output = function(string) {
	Emulator.output(string);
}
