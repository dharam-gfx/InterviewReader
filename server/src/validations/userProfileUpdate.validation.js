import Validations from "./validations.js";

class UserProfileUpdateValidation{
    constructor(firstName="", lastName="", userName=""){
        this.firstName = firstName;
        this.lastName = lastName;
        this.userName = userName;
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
        return errors
    }  
}

export default UserProfileUpdateValidation
    