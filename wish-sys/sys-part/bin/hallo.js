var HalloClass = function() {
}
HalloClass.prototype = new Process();
HalloClass.prototype.main = function() {
	var stdout = this.files['stdout'];
	stdout.write("Hallo Welt\n");
	this.exit(0);
}
