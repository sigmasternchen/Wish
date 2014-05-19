Kernel.Scheduler = function() {
}
Kernel.Scheduler.jobs;
Kernel.Scheduler.activ;
Kernel.Scheduler.working;
Kernel.Scheduler.init = function() {
	Kernel.msgOut("  init job list");
	Kernel.Scheduler.jobs = new Array();
	Kernel.Scheduler.activ = 0;
	Kernel.Scheduler.working = false;
	Kernel.msgSuccess(true);
}
Kernel.Scheduler.tick = function() {
	if (Kernel.Scheduler.working) {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].signalHandler(SIGXCPU);
		Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
		return;
	}
	Kernel.Scheduler.working = true;
	Kernel.Scheduler.activ++;
	Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
	var pid = Kernel.Scheduler.jobs[Kernel.Scheduler.activ].pid;
	try {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].tick();
	} catch (error) {
		if ((typeof error) != "number") {
			console.log("Kernel: a wild error appeared in pid" + pid + ".tick");
			console.log(error);
		}
	}
	Kernel.time++;
	Kernel.Scheduler.working = false;
}
Kernel.Scheduler.add = function(process) {
	if (!process.tick)
		return 2; // no tick method
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid)
			return 3; // no double processes
	}
	this.jobs.push(process);
	return 0;
}
Kernel.Scheduler.remove = function(process) {
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid) {
			if (this.activ == i)
				this.working = false;
			this.jobs.splice(i, i);
			return 0; // success
		}
	}
	return 1; // not in list
}