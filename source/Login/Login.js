import {
    GoogleAuthProvider,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    getAdditionalUserInfo,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
} from '../Backend/firebase-src/firebase-auth.min.js';
import { auth, db, googleProvider } from '../Backend/FirebaseInit.js';
import { isValidEmail, isValidPassword } from '../Backend/BackendInit.js';
import { ref, set } from '../Backend/firebase-src/firebase-database.min.js';

window.onload = () => {
    loginSignUpSetup();
    togglePasswordSetup();
    forgetPassword();
};

/**
 * Make pop up alert with custom css and text that is passed in
 * @param {String} text
 */
function customAlert(text) {
    const closeButtonHTML =
        '<span ' +
        'class="closebtn" ' +
        'onclick="this.parentElement.style.display=\'none\';"> ' +
        '&times;' +
        '</span>';
    document.querySelector('.alert').style.display = 'block';
    document.querySelector('.alert').innerHTML = `${closeButtonHTML}${text}`;
}

/**
 * Send password reset email to the given email
 */
function handleForgotPassword() {
    return new Promise((resolve, reject) => {
        let email = document.getElementById('forget-popup-text').value;

        if (!isValidEmail(email)) {
            customAlert('Invalid Email');
            reject();
        }

        // check if email exists
        fetchSignInMethodsForEmail(auth, email).then((signInMethods) => {
            // exist -> send reset password email
            if (signInMethods.length > 0) {
                sendPasswordResetEmail(auth, email)
                    .then(() => {
                        customAlert('Password reset email sent!');
                        resolve();
                    })
                    .catch((err) => {
                        customAlert(err.message);
                        reject();
                    });
            } else {
                customAlert('Email does not exist');
                reject();
            }
        });
    });
}

/**
 * Sign in with the Google.
 * Authentication persistence is Session based.
 */
function googleSignIn() {
    // set session persistence so status unchanged after refreshing
    auth.setPersistence(browserSessionPersistence).then(() => {
        signInWithPopup(auth, googleProvider)
            .then((result) => {
                // This gives you a Google Access Token. You can use it to access the Google API.
                const credential = GoogleAuthProvider.credentialFromResult(
                    result
                );
                const token = credential.accessToken;
                // The signed-in user info.
                const user = result.user;
                const isNewUser = getAdditionalUserInfo(result).isNewUser;

                console.log(`User ${user.email} signed in. Token: ${token}`);

                // add default data for new users
                if (isNewUser) {
                    let data = {
                        email: user.email,
                        theme: '#d4ffd4',
                    };
                    set(ref(db, `${user.uid}`), data).then(() => {
                        customAlert('Successfully signed in!');
                        window.location.replace(
                            '../WeeklyOverview/WeeklyOverview.html'
                        );
                    });
                } else {
                    customAlert('Successfully signed in!');
                    window.location.replace(
                        '../WeeklyOverview/WeeklyOverview.html'
                    );
                }
            })
            .catch((error) => {
                customAlert(error.message);
            });
    });
}

/**
 * Set up event listeners for various login/signup buttons
 */
function loginSignUpSetup() {
    const loginBtn = document.getElementById('login-button');

    // Enter event handlers
    const userInputFields = document.querySelectorAll('.user-input');
    for (const userInputField of userInputFields) {
        userInputField.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') {
                loginBtn.dispatchEvent(new Event('click'));
            }
        });
    }

    // trigger login / signup event depending on what mode the page is in
    // (either login or signup mode)
    loginBtn.onclick = () => {
        if (loginBtn.innerText === 'LOGIN') {
            signIn();
        } else {
            signUp();
        }
    };

    // change view of login and signup if the sign up button is clicked
    const signupBtn = document.getElementById('signup-button');
    signupBtn.onclick = () => {
        if (signupBtn.innerText === 'LOGIN') {
            setLogin();
        } else {
            setSignUp();
        }
    };

    // login event with Google authentication
    const googleLoginBtn = document.getElementById('google-button');
    googleLoginBtn.addEventListener('click', () => googleSignIn());
}

/**
 * Modify login page to login mode
 */
function setLogin() {
    document.getElementById('title').innerText = 'Login to your Account';
    document.getElementById('google-button').innerHTML =
        '<img src="../Images/google.png">Sign in with Google';
    document.getElementById('sign-in-email-text').innerText =
        'or sign in with email';
    document.getElementById('sign-up-text').innerText =
        // eslint-disable-next-line
        "Don't have an account?";
    document.getElementById('passConfirm').style.display = 'none';
    document.getElementById('passReq').style.display = 'none';

    document.getElementById('login-button').innerText = 'LOGIN';
    document.getElementById('signup-button').innerText = 'SIGN UP';
}

/**
 * Modify login page from login mode to signup mode
 */
function setSignUp() {
    document.getElementById('title').innerText = 'Make your Account';

    document.getElementById('passConfirm').style.display = 'flex';
    document.getElementById('passReq').style.display = 'flex';
    document.getElementById('sign-in-email-text').innerText =
        'or sign up with email';
    document.getElementById('google-button').innerHTML =
        '<img src="../Images/google.png">Sign up with Google';
    document.getElementById('sign-up-text').innerText =
        'Already have an account?';

    document.getElementById('login-button').innerText = 'SIGN UP';
    document.getElementById('signup-button').innerText = 'LOGIN';
}

/**
 * Sign in with the email and pin from the user input.
 * Authentication persistence is Session based.
 */
function signIn() {
    let userEmail = document.getElementById('email').value;
    let password = document.getElementById('pin').value;

    // validity check
    if (!isValidEmail(userEmail)) {
        customAlert('Invalid Email!');
        return;
    }

    // set session persistence so status unchanged after refreshing
    auth.setPersistence(browserSessionPersistence).then(() => {
        signInWithEmailAndPassword(auth, userEmail, password)
            // eslint-disable-next-line no-unused-vars
            .then((userCredential) => {
                customAlert('Successfully signed in!');
                window.location.replace(
                    '../WeeklyOverview/WeeklyOverview.html'
                );
            })
            .catch((error) => {
                customAlert('Login Failed: ' + error.message);
            });
    });
}

/**
 * New user sign up with email and password given.
 */
function signUp() {
    let userEmail = document.getElementById('email').value;
    let password = document.getElementById('pin').value;
    let passConfirm = document.getElementById('passConf').value;

    // validity check
    if (!isValidEmail(userEmail)) {
        return;
    }

    // errMsg will contain a string of an error message is the password doesn't met criteria
    let errMsg = isValidPassword(password);
    if (errMsg !== '') {
        // displays custom error message
        customAlert(errMsg);
        return;
    }

    // ensure password is the same as confirmed password
    if (password !== passConfirm) {
        customAlert('Password and re-typed password are different!');
        return;
    }

    auth.setPersistence(browserSessionPersistence).then(() => {
        createUserWithEmailAndPassword(auth, userEmail, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (user) {
                    let data = {
                        email: userEmail,
                        theme: '#d4ffd4',
                        bannerImage: 'default',
                    };

                    // add user data to db
                    set(ref(db, `${user.uid}`), data).then(() => {
                        customAlert('Successful Sign Up');
                        window.location.replace(
                            '../WeeklyOverview/WeeklyOverview.html'
                        );
                    });
                }
            })
            .catch((error) => {
                customAlert(error.message);
            });
    });
}

/**
 * Toggle the eye logo depending on its current state
 */
function togglePasswordSetup() {
    const togPassword = document.querySelector('.right-icons');
    const password = document.querySelector('.pass');

    // Show or hide password
    togPassword.addEventListener('click', function () {
        const type =
            password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        if (type === 'password') {
            togPassword.setAttribute('src', '../Images/show-pass.png');
        } else {
            togPassword.setAttribute('src', '../Images/hide-pass.png');
        }
    });
}

/**
 * Forgot password to send email a reset password
 */
function forgetPassword() {
    let forgetButton = document.getElementById('forget-button');
    let forgetPopup = document.getElementById('forget-popup');
    let subEmailBtn = document.getElementById('submit-email');
    let canForBtn = document.getElementById('cancel-forget');

    // pull up forgot password pop up
    forgetButton.addEventListener('click', function () {
        forgetPopup.style.display = 'block';
    });

    // submit email
    subEmailBtn.addEventListener('click', function () {
        handleForgotPassword().then(() => (forgetPopup.style.display = 'none'));
    });

    // close pop up
    canForBtn.addEventListener('click', function () {
        forgetPopup.style.display = 'none';
    });
}
