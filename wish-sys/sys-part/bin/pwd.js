var PwdClass = function() {
}
PwdClass.prototype = new Process();
PwdClass.prototype.main = function(args) {
	this.files['stdout'].write(this.Environment.array['PWD'] + "\n");
	this.exit(0);
}
