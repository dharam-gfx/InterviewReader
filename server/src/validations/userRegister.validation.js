import Validations from "./validations.js";

class UserRegisterValidation{
    constructor(firstName="", lastName="", userName="", email="", password=""){
        this.firstName = firstName;
        this.lastName = lastName;
        this.userName = userName;
        this.email = email;
        this.password = password;
    }

    checkValidation(){
        const errors ={};
        if(!Validations.nameValidation(this.firstName , 2 , 15)){
            errors.firstName = "firstName is invalid";
        }
        if(!Validations.nameValidation(this.lastName , 1 , 15)){
            errors.lastName = "lastName is invalid";
        }
        if(!Validations.userNameValidation(this.userName)){
            errors.userName = "userName is invalid";
        }
        if(!Validations.emailValidation(this.email)){
            errors.email ="email is invalid";
        }
        if(!Validations.passwordValidation(this.password)){
            errors.password = "password is invalid";
        }
        return errors
    }

}

export default UserRegisterValidation