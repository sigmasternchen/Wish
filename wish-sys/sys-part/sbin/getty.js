var GettyClass = function() {
	// pseudo getty
}
GettyClass.prototype = new Process();
GettyClass.prototype.file = "";
GettyClass.prototype.login = "/sbin/login";
GettyClass.prototype.main = function(args) {
	console.log("getty: started");
	this.parseArgs(args);
	pathArray = new Array();
	pathArray[0] = ["stdout", this.file + "/o"];
	pathArray[1] = ["stdin", this.file + "/i"];
	var s = "";
	s += "var func = function () { ";
	s += "	try {";
	s += "		var prog = new " + Kernel.ProcessManager.getClassNameFromFileName(this.login) + "();";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "	prog.init(" + this.pid + ");";
	s += "	var paths = JSON.parse('" + JSON.stringify(pathArray) + "');";
	s += "	for(var i = 0; i < paths.length; i++) {";
	s += "		prog.files[paths[i][0]] = Kernel.Filesystem.getFile(paths[i][1]);";
	s += "	}";
	s += "	Kernel.ProcessManager.add(prog);";
	s += "	console.log(\"getty: start shell '" + name + "'...\");";
	s += "	try {";
	s += "		prog.main(new Array());";
	s += "	} catch (exception) {";
	s += "		console.log(\"Prozess \" + prog.pid + \": \");";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "}";
	eval(s);
	Kernel.ProcessManager.load(this.login + ".js", func);
}
GettyClass.prototype.parseArgs = function(args) {
	if (args.length == 1) {
		var error = "getty: not enough arguments";
		if (this.files['stdout'])
			this.files['stdout'].write(error);
		else
			console.log(error);
		this.exit(1);
	}
	if (args.length > 2) {
		var error = "getty: too many arguments";
		if (this.files['stdout'])
			this.files['stdout'].write(error);
		else
			console.log(error);
		this.exit(1);
	}
	this.file = args[1];
	// TODO login
}
