const fs = require("fs")
class Login {
    constructor(username, passwordhash) {
        this.username = username
        this.passwordhash = passwordhash
        this.userIndex = undefined
        this.pathToDatabase = __dirname + "/Database/database.json"
        this.database = this.readDatabase() 
        this.loginID = 0;
    }

    readDatabase() {
        var data = fs.readFileSync(this.pathToDatabase);
        data = JSON.parse(data)
        console.log(data)
        return data
    }


    login() {
           
        for(var index = 0; index < this.database.length; index++) {
            if(this.database[index]["username"] == this.username) {
                if(this.database[index]["passwordhash"] == this.passwordhash) {
                    this.userIndex = index
                    return {"success" : true, "loginID" : this.makeLoginID()}
                }
            }
        }
    
        if(this.loginID != 0) {
            return {"success" : true, "loginID" : this.makeLoginID()}
        }else {
            return {"success" : false, "message" : "wrong username or password"}
        }

    }

    makeLoginID() {
        this.loginID = Math.floor(100000000 + Math.random() * 900000000);
        return this.loginID
    }

}

module.exports = Login