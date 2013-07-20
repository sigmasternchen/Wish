/**
 * probably the first game for WishOS
 * a quite traditional, simple snake game
 *
 * bitowl, 2013-07-20
 */
SnakeClass = function() {}
SnakeClass.prototype = new Process();

// key codes
SnakeClass.prototype.LEFT  = 97
SnakeClass.prototype.RIGHT = 100
SnakeClass.prototype.UP    = 119
SnakeClass.prototype.DOWN  = 115
SnakeClass.prototype.QUIT  = 113

// game states
SnakeClass.prototype.INTRO    = 0
SnakeClass.prototype.INGAME   = 1
SnakeClass.prototype.GAMEOVER = 2
SnakeClass.prototype.SOONQUIT = 3

// game world
SnakeClass.prototype.WIDTH  = 80
SnakeClass.prototype.HEIGHT = 22 // 24 - topbar bottombar

// entities
SnakeClass.prototype.EMPTY  = 0
SnakeClass.prototype.PLAYER = 1
SnakeClass.prototype.WALL   = 2
SnakeClass.prototype.FRUIT  = 3 // snake is always healthy

// ASCII art
SnakeClass.prototype.TITLE="            ::::::::  ::::    :::     :::     :::    ::: :::::::::: \n"+
"           :+:    :+: :+:+:   :+:   :+: :+:   :+:   :+:  :+:        \n"+
"           +:+        :+:+:+  +:+  +:+   +:+  +:+  +:+   +:+        \n"+
"           +#++:++#++ +#+ +:+ +#+ +#++:++#++: +#++:++    +#++:++#   \n"+
"                  +#+ +#+  +#+#+# +#+     +#+ +#+  +#+   +#+        \n"+
"           #+#    #+# #+#   #+#+# #+#     #+# #+#   #+#  #+#        \n"+
"            ########  ###    #### ###     ### ###    ### ########## \n";



SnakeClass.prototype.GAME_OVER="             ____                            ___                    \n"+
"            / ___|  __ _  _ __ ___    ___   / _ \\ __   __ ___  _ __ \n"+
"           | |  _  / _` || '_ ` _ \\  / _ \\ | | | |\\ \\ / // _ \\| '__|\n"+
"           | |_| || (_| || | | | | ||  __/ | |_| | \\ V /|  __/| |   \n"+
"            \\____| \\__,_||_| |_| |_| \\___|  \\___/   \\_/  \\___||_|   \n";
                                                          



SnakeClass.prototype.main = function(args){	
	Kernel.Scheduler.add(this);

	this.stdin=this.files["stdin"];	
	this.stdout=this.files["stdout"];

	this.stdout.write("\033[2J"); // clear screen

	
	this.drawCentered(2,"bitowl presents");
	this.stdout.write("\033[5;0H" + this.TITLE);
	this.drawCentered(17,"any key to continue");
	this.drawCentered(23,"v 0.1");
	
	this.gameState=this.INTRO;

}

SnakeClass.prototype.startGame = function(){
	this.stdout.write("\033[2J"); // clear screen
	
	// create world array
	this.world=new Array(this.HEIGHT);
	for(i=0;i<this.HEIGHT;i++){
		this.world[i]=new Array(this.WIDTH);
	}
	
	// init player
	this.direction=this.RIGHT;
	
	this.posX=6;
	this.posY=1;
	this.bodyParts=new Array();
	this.bodyParts.push(new BodyPart(this.posX,this.posY));
	this.bodyParts.push(new BodyPart(this.posX-1,this.posY));
	this.bodyParts.push(new BodyPart(this.posX-2,this.posY));
	this.setField(this.posX,this.posY,this.PLAYER);
	
	this.points=0;


	// bottom bar
	this.stdout.write("\033[23;0Hpress q to exit");
	
	// top bar
	this.stdout.write("\033[0;1H----\033[1mSnake\033[0m----------------------------------------------------------------------");
	this.displayPoints();
	
	this.lastMove=new Date().getTime();
	
	this.gameState=this.INGAME;
}
SnakeClass.prototype.tick = function(){
	
	if(this.gameState == this.INGAME){
	
		var input=this.stdin.read();
		if(input){
			var changedword=false;
	
			switch(input){
				case this.LEFT:
				case this.RIGHT:
				case this.UP:
				case this.DOWN:
					this.direction=input;
					break;
				case this.QUIT:
					this.quitGame();
					return;
			}
		}
	
		var deltaTime=new Date().getTime()-this.lastMove;
		if(deltaTime>=100){
			this.lastMove+=100;
			// things should not be TOO fast
		
			// randomly place fruits sometimes
			if(Math.random()<0.1){
				this.setField(Math.floor(Math.random()*this.WIDTH),Math.floor(Math.random()*this.HEIGHT),this.FRUIT);
			}
	
			// move player
			switch(this.direction){
				case this.LEFT:
					this.setPlayerPos(this.posX-1,this.posY);
					break;
				case this.RIGHT:
					this.setPlayerPos(this.posX+1,this.posY);
					break;
				case this.UP:
					this.setPlayerPos(this.posX,this.posY-1);
					break;
				case this.DOWN:
					this.setPlayerPos(this.posX,this.posY+1);
					break;				
			}
		}
	}else if(this.gameState==this.INTRO){
		var input=this.stdin.read();
		if(input){
			this.startGame();
		}
	}else if(this.gameState==this.GAMEOVER){
		var input=this.stdin.read();
		if(input){
			if(input==this.QUIT){
				this.quitGame();
				return;
			}else{
				this.startGame();
			}
		}
	}
	
	
	// move cursor to the top left at the end of every frame
	this.stdout.write("\033[0;0H");
}

SnakeClass.prototype.setPlayerPos = function(x,y){
	var removeLast=true;
	
	// move through the borders of the screen
	if(x<0){x=this.WIDTH-1;}
	if(y<0){y=this.HEIGHT-1;}
	if(x>=this.WIDTH){x=0;}
	if(y>=this.HEIGHT){y=0;}
	
	// collision handling
	switch(this.world[y][x]){
		case this.FRUIT:
			this.points++;
			this.displayPoints();
			removeLast=false; // snake will grow
			break;
		case this.WALL:
		case this.PLAYER:
			this.gameOver();
			return;
	}
	
	// remove last body part
	if(removeLast){
		var toremove=this.bodyParts.shift();
		this.setField(toremove.x,toremove.y,this.EMPTY);
	}
	
	this.posX=x;
	this.posY=y;
	
	this.bodyParts.push(new BodyPart(this.posX,this.posY));
	
	this.setField(this.posX,this.posY,this.PLAYER);
}

SnakeClass.prototype.setField = function(x,y,valuekey){

	this.world[y][x]=valuekey;
	
	var value="";
	switch(valuekey){
		case this.EMPTY:
			value=" ";
			break;
		case this.PLAYER:
			value="\033[33mX\033[0m";
			break;
		case this.WALL:
			value="#";
			break;
		case this.FRUIT:
			value="\033[32mo\033[0m";
			break;
			
	}
	// y+1 because of the top bar
	this.stdout.write("\033["+(y+1)+";"+x+"H"+value);  // the RIGHT way
}

SnakeClass.prototype.displayPoints = function(){
	var len=(this.points+"").length;
	this.stdout.write("\033[0;"+(80-len-8-2)+"Hpoints: "+this.points);
}
// draws that text in the middle of a line
SnakeClass.prototype.drawCentered = function(y,text){
	this.stdout.write("\033["+y+";"+Math.floor((80-text.length)/2)+"H"+text);
}


SnakeClass.prototype.gameOver = function(){
	this.gameState=this.GAMEOVER;
	this.stdout.write("\033[5;0H\033[1m\033[31m"+this.GAME_OVER);
	this.drawCentered(15,"\033[0mpress any key to start again");
	this.drawCentered(17,"or q if this game has stressed you enough");
}
SnakeClass.prototype.quitGame = function() {
	this.gameState=this.SOONQUIT;
	Kernel.Scheduler.remove(this);
	
	this.stdout.write("\033[2J");
	this.stdout.write("\033[6;0H" + this.TITLE);
	this.drawCentered(14,"I hope you had fun!");
	this.drawCentered(16,"created by bitowl");	
	this.drawCentered(17,"http://bitowl.de");	
	this.stdout.write("\033[18;1H\n");
	this.exit(0);

}

// one element of snake's body
function BodyPart(pX,pY){
	this.x=pX;
	this.y=pY;
}

