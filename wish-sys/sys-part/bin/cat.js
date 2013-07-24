var CatClass = function() {
}
CatClass.prototype.buffer = new Array();
CatClass.prototype.stream;
CatClass.prototype = new Process();
CatClass.prototype.main = function(args) {
	if (args.length == 1) {
		this.stream = this.files['stdin'];
	} else {
		this.stream = new AppStream();
		var file = new File(args[1]);
		if (!file.exists()) {
			this.files['stdout'].write("cat: " + args[2].replace("\033", "\\033") + ": No such file or directory\n");
			this.exit(1);
		}
		this.stream.fromFile(file);
	}	
	Kernel.Scheduler.add(this);
}
CatClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var code = this.stream.read();
	if (code) {
		if (KeyCodes.isEnter(code) || this.stream.eof) {
			stdout.write("\n" + this.buffer.join("") + "\n");
			this.buffer = new Array();
		} else {
			this.buffer.push(KeyCodes.normalKey(code));
		}
	}	
}
