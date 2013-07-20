var EchoClass = function() {}
EchoClass.prototype = new Process();
EchoClass.prototype.main = function(args){
	args.splice(0,1); // we do not want to echo the "echo"
	this.files["stdout"].write(args.join(" ")+"\n");
	this.exit(0);
}
