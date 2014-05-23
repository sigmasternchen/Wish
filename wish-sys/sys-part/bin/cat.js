var CatClass = function() {
}
CatClass.prototype = new Process();
CatClass.prototype.buffer = new Array();
CatClass.prototype.stream;
CatClass.prototype.index = 0;
CatClass.prototype.flags = new Array();
CatClass.prototype.main = function(args) {
	console.log("cat: started");
	console.log("cat: checking for input stream");
	
	var i = 1;
	for (i; i < args.length; i++) {
		if (args[i].substring(0, 1) == "-") {
			switch(args[i]) {
				case "-u":
					this.flags['u'] = true;
					break;
				default:
					this.files['stdout'].write("cat: Unknown parameter " + args[i] + "\n");
					this.exit(2);
					break;
			}
		} else {
			break;
		}
	}
	
	args.splice(0, i);
	
	if (args.length == 0) {
		console.log("cat: found stdin");
		this.file = this.files['stdin'];
	} else {
		var env = this.Environment;
		var name = args[0];
		if (name.substring(0, 1) != "/")
			name = env.global['PWD'] + "/" + name;
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
	
	if (this.flags['u']) {
		var text = this.file.read(1, this.index);
		stdout.write(text);
		if (text.charAt(i) == EOF)
			this.exit(0);
	} else {
		var text = this.file.read(200, this.index);
		
		for (var i = 0; i < text.length; i++) {
			if (this.buffer.length >= 300) {
				// because we need a maximal buffer size
				stdout.write(this.buffer.join(""));
				this.buffer = new Array();
			}
			if (KeyCodes.isEnter(text.charCodeAt(i))) {
				this.buffer.push(text.charAt(i));
				stdout.write(this.buffer.join(""));
				this.buffer = new Array();
				continue;
			}
			if (text.charAt(i) == EOF) {
				stdout.write(this.buffer.join(""));
				this.buffer = new Array();
				this.exit(0);
			}
			this.buffer.push(text.charAt(i));
		}
		this.index += 200;
	}
}
