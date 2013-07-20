var ClearClass = function() {}
ClearClass.prototype = new Process();
ClearClass.prototype.main = function(args){
	this.files["stdout"].write("\033[0:0H");
	this.files["stdout"].write("\033[2J");
	this.exit(0);
}
