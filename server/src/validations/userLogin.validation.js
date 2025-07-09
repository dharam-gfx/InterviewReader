import Validations from "./validations.js";
class UserLoginValidation {
    constructor( userName = "", email = "", password = "" ) {
        this.userName = userName;
        this.email = email;
        this.password = password;
    }

    checkValidation() {
        const errors = {};

        // Check if all fields are empty
        const hasUserName = this.userName && this.userName.trim() !== "";
        const hasEmail = this.email && this.email.trim() !== "";
        const hasPassword = this.password && this.password.trim() !== "";

        // If all fields are empty, require at least username or email
        if (!hasUserName && !hasEmail && !hasPassword) {
            errors.credentials = "Please provide username or email and password.";
            return errors;
        }

        // If password is missing, add error
        if (!hasPassword) {
            errors.password = "Password is required.";
        } else if (!Validations.passwordValidation(this.password)) {
            errors.password = "Please enter a valid password.";
        }

        // If neither username nor email is provided
        if (!hasUserName && !hasEmail) {
            errors.credentials = "Please provide either username or email.";
        } else {
            // Validate username if provided
            if (hasUserName && !Validations.userNameValidation(this.userName)) {
                errors.userName = "Please enter a valid username.";
            }

            // Validate email if provided
            if (hasEmail && !Validations.emailValidation(this.email)) {
                errors.email = "Please enter a valid email.";
            }
        }

        return errors;
    }
}

export default UserLoginValidation;
