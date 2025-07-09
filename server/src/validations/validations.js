class Validations{
    
    static nameValidation(name, minChar = 2, maxChar = 30){
        const fullNameRegex = new RegExp(`^[a-zA-Z ]{${minChar},${maxChar}}$`);
        if(fullNameRegex.test(name)){
            return true;
        }
        return false;
    }
    static userNameValidation(userName){
        const userNameRegex = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;
        if(userNameRegex.test(userName)){
            return true;
        }
        return false;
    }
    static emailValidation(email){
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if(emailRegex.test(email)){
            return true;
        }
        return false;
    }
    static passwordValidation(password){
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
        if(passwordRegex.test(password)){
            return true;
        }
        return false;
    }
}

export default Validations