var CatClass = function() {
}
CatClass.prototype = new Process();
CatClass.prototype.buffer = new Array();
CatClass.prototype.stream;
CatClass.prototype.index = 0;
CatClass.prototype.main = function(args) {
	console.log("cat: started");
	console.log("cat: checking for input stream");
	if (args.length == 1) {
		console.log("cat: found stdin");
		this.file = this.files['stdin'];
	} else {
		var env = this.Environment;
		var name = args[1];
		if (name.substring(0, 1) != "/")
			name = env.array['PWD'] + "/" + name;
		name = Kernel.Filesystem.shortenPath(name);
		console.log("cat: found " + name);
		var file = new File(name);
		if ((!name) || (!file.exists())) {
			this.files['stdout'].write("cat: " + name.replace("\033", "\\033") + ": No such file or directory\n");
			this.exit(1);
		}
		this.file = file;
	}	
	Kernel.Scheduler.add(this);
}
CatClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var text = this.file.read(200, this.index);
	for (var i = 0; i < text.length; i++) {
		if (KeyCodes.isEnter(text.charCodeAt(i)) || (text.charAt(i) == "\n")) {
			stdout.write(this.buffer.join(""));
			this.buffer = new Array();
		}
		if (text.charAt(i) == EOF) {
			stdout.write(this.buffer.join(""));
			this.buffer = new Array();
			this.exit(0);
		}
		this.buffer.push(text.charAt(i));
	}
	this.index += 100;
}
