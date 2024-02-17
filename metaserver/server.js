
var createServer = require('https').createServer;
var readFileSync = require('fs').readFileSync;
const server = createServer({
  cert: readFileSync('./cert.pem'),
  key: readFileSync('./key.pem')
});

//require our websocket library
var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090
var wss = new WebSocketServer({server});



//require our websocket library 
//var WebSocketServer = require('ws').Server; 

//creating a websocket server at port 9090 
//var wss = new WebSocketServer({port: 9090}); 





//all connected to the server users 
var users = {};

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

//when a user connects to our sever 
wss.on('connection', function(connection) {
  
   console.log("User connected");
	
   //when server gets a message from a connected user 
   connection.on('message', function(message) { 
	
      var data;
		
      //accepting only JSON messages 
      try { 
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      }
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login 
		  case "stats": 
				
				sendToAll( { 
                  type: "stats", 
					
					name: data.name,
					stats: data.stats
               },data.name);
			   
			   break;
			   
			   
			    case "nearest": 
			//	console.log(data.name +" WANTS TO TAL WITH "+data.targetplayer);
				
				try{
				  if(users[data.name].nearest==""){
					  users[data.name].nearest =  data.targetplayer;
					    users[data.targetplayer].isInitiator=-1;
				  }
				  
				  else{
					  users[data.name].nearest =  data.targetplayer;
					 
				  }
				  
				  
				  if(users[data.name].nearest==data.targetplayer && users[data.targetplayer].nearest==data.name && users[data.name].isInitiator==-1 && users[data.targetplayer].isInitiator==-1){
					  
					 var rno =  getRandomInt(2);
					 var snt = "ddddddddd";
					 if  (rno==0){
						 users[data.name].isInitiator= 1;
						 users[data.targetplayer].isInitiator= 0;
						  sendTo(connection, { 
                  type: "isInitiator", 
                 
               }); 
			     var conn = users[data.targetplayer]["conn"]; 
					   	  sendTo(conn, { 
                  type: "notInitiator", 
                 
						}); 
						
						snt = "INITIATOR "+data.name+" TARGET "+data.targetplayer;
					 }
					 
					 else{
						  
						  users[data.targetplayer].isInitiator= 1;
						   users[data.name].isInitiator= 0;
						  sendTo(connection, { 
                  type: "notInitiator", 
                 
               }); 
			     var conn = users[data.targetplayer]["conn"]; 
					   	  sendTo(conn, { 
                  type: "isInitiator", 
                 
						}); 
					 	snt = "INITIATOR "+data.targetplayer+" TARGET "+data.name;
					 }
					 
					console.log(snt);
				  }
				  
				}
				
				catch(ee){
					// console.log(ee);
				  }
		
				  
				break;
		  
         case "login": 
            console.log("User logged", data.name); 

            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(connection, { 
                  type: "login", 
                  success: false 
               }); 
            } 
			
			else { 
               //save user connection on the server 
               users[data.name]= {conn: connection,model:data.model, nearest:"", isInitiator:-1}; 

               connection.name = data.name;
					
				sendToAll( { 
                  type: "user_joined", 
					model: data.model,
					name: data.name
               },data.name);
			   
					var usersExists = [];
					for (var key in users) {

					if (users.hasOwnProperty(key) ) { 
					
					if(key!=data.name){
				
					usersExists.push({"name":key,"model":data.model});
					}
	
					}
					
					}
					
				   sendTo(connection, { 
					  type: "login", 
					  data: usersExists,
					  success: true 
				   }); 
				   
			   
			   
            } 
				
            break;
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name); 
			
				try{
            //if UserB exists then send him offer details 
            var conn = users[data.name]["conn"]; 
				
            if(conn != null) { 
               //setting that UserA connected with UserB 
               connection.otherName = data.sender; 
				
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
				  sender: data.sender,
                  name: connection.name 
               }); 
            } 
			
				}
				catch{
					
				}
				
            break;
				
         case "answer": 
            console.log("Sending answer to: ", data.receiver); 
            //for ex. UserB answers UserA 
             var conn = users[data.sender]["conn"]; 
				
            if(conn != null) { 
               connection.otherName = data.receiver; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               });
            } 
				
            break;
				
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
             var conn = users[data.name]["conn"];  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               }); 
            } 
				
            break;
				
         case "leave": 
            console.log("Disconnecting from", data.name); 
             var conn = users[data.name]["conn"]; 
            conn.otherName = null; 
				
            //notify the other user so he can disconnect his peer connection 
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }  
				
            break;
				
         default: 
            sendTo(connection, { 
               type: "error", 
               message: "Command not found: " + data.type 
            });
				
            break; 
      }  
   });
	
   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   connection.on("close", function() { 
	
      if(connection.name) { 
         delete users[connection.name]; 
			
         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName); 
           
		   try{
		   var conn = users[connection.otherName]; 
            conn.otherName = null;  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
              }); 
            } 
		   }
		   catch{
		   }

			
         } 
      } 
   });  
	
  // connection.send("Hello world"); 
}); 

server.listen(9090);
function sendToAll(msg,sender){

	for (var key in users) {
    // check if the property/key is defined in the object itself, not in parent
    if (users.hasOwnProperty(key)) { 
		if(key!=sender){	
			
			   users[key]["conn"].send(JSON.stringify(msg));
		}
				
    }
}
}



function sendTo(connection, message) { 
   
   try{connection.send(JSON.stringify(message)); 
   }
   catch{
   }
}