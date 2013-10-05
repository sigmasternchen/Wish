var CatClass = function() {
}
CatClass.prototype = new Process();
CatClass.prototype.buffer = new Array();
CatClass.prototype.stream;
CatClass.prototype.main = function(args) {

	this.files['stdout'].write("not ready yet");
	this.exit(0);

	if (args.length == 1) {
		this.stream = this.files['stdin'];
	} else {
		this.stream = new AppStream();
		var env = this.Environment;
		var name = args[1];
		if (name.substring(0, 1) != "/")
			name = env.array['PWD'] + name;
		name = Kernel.Filesystem.shortenPath(name);
		var file = new File(name);
		if ((!name) || (!file.exists())) {
			this.files['stdout'].write("cat: " + name.replace("\033", "\\033") + ": No such file or directory\n");
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
		if (KeyCodes.isEnter(code)) {
			stdout.write(this.buffer.join("") + "\n");
			this.buffer = new Array();
		} else {
			this.buffer.push(KeyCodes.normalKey(code));
		}
		if (this.stream.eof) {
			stdout.write(this.buffer.join("") + "\n");
			this.exit(0);
		}
	} else {
	}	
}
