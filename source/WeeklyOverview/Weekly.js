import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    signOut,
    updatePassword,
} from '../Backend/firebase-src/firebase-auth.min.js';
import {
    getBannerImage,
    getBase64,
    getCurrentDate,
    getCurrentWeek,
    getDay,
    getMonthName,
    getMonthlyGoals,
    getProfileImage,
    getTheme,
    getYearlyGoals,
    isValidPassword,
    redirectNotLoggedInUser,
    updateBannerImage,
    updateNote,
    updateProfileImage,
    updateTheme,
} from '../Backend/BackendInit.js';

import { auth } from '../Backend/FirebaseInit.js';

const CURR_DATE_OBJ = getCurrentDate();
const PAGE_TIMEOUT_FOR_INVALID_USER = 3;

/**
 * add a bullet to a specified unordered list
 * @param {Object} bullet - can either be a goals object (with keys text and
 * done) or a bullet object (with keys text, done, features, and possibly
 * childList)
 * @param {HTMLElement} list - the unordered list we add the parsed bullet to
 * @returns void
 */
function appendBulletToList(bullet, list) {
    const newBullet = document.createElement('li');
    newBullet.textContent = bullet.text;

    // if a bullet is marked as completed, add a strikethrough. otherwise,
    // render it normally
    if (bullet.done == true) {
        newBullet.style.textDecoration = 'line-through';
    }

    list.append(newBullet);

    // if there is a childList containing more bullets, begin rendering
    // the childList and append those bullets to a new unordered-list
    // that is nested under the parent unordered-list
    if ('childList' in bullet) {
        const subList = document.createElement('ul');
        bulletParser(bullet['childList'], subList);
        list.append(subList);
    }
}

/**
 * recursively build all the bullets for the passed-in bullet list and append
 * the final list into the passed-in list
 * @param {Object} bullets - object that contains the bullet notes for a
 *                           particular day
 * @param {HTMLElement:ul} list - unordered list where bullet elements (li) are
 *                                appended to
 * @returns void
 */
function bulletParser(bullets, list) {
    // eslint-disable-next-line no-unused-vars
    for (const [_, bullet] of Object.entries(bullets)) {
        appendBulletToList(bullet, list);
    }
}

/**
 * Make pop up alert with custom css and text that is passed in
 * @param {String} text
 */
function customAlert(text) {
    const closeButtonHTML =
        '<span class="closebtn" onclick="this.parentElement.style.display=\'none\';">&times;</span>';
    document.querySelector('.alert').style.display = 'flex';
    document.querySelector('.alert').innerHTML = `${text}${closeButtonHTML}`;
    setTimeout(() => {
        document.querySelector('.alert').style.display = 'none';
    }, 3000);
}

function eventListenerSetup() {
    // update banner image buttons after upload
    document.getElementById('banImg').addEventListener('input', () => {
        let file = document.getElementById('banImg').files[0];
        if (file !== undefined) {
            document.getElementById('banImg-label').innerHTML = file.name;
            document.getElementById('banImg-upload').style.display = 'block';
        } else {
            document.getElementById('banImg-label').innerHTML = 'Choose File';
            document.getElementById('banImg-upload').style.display = 'none';
        }
    });

    // update banner image
    const bannerImageUpload = document.getElementById('banImg-upload');
    bannerImageUpload.addEventListener('click', async () => {
        let banImg = document.getElementById('banImg').files[0];
        let banImgURL = await getBase64(banImg);
        updateBannerImage(banImgURL).then(() => loadBannerImage());
    });

    // Open and close Setting container
    document.getElementById('close-button').onclick = function () {
        document.getElementById('settings').style.display = 'none';
    };

    const headerSettingsBtn = document.getElementById('header_settings_button');
    headerSettingsBtn.addEventListener('click', () => {
        document.getElementById('settings').style.display = 'block';
    });

    // Change background color on select
    const themes = document.getElementById('themes');
    themes.addEventListener('change', async function (e) {
        const val = e.target.value;
        document.querySelector('.weekly_column').style.background = val;
        document.querySelector('.monthly_column').style.background = val;
        document.querySelector('.photo_column').style.background = val;

        // update theme preference in DB
        await updateTheme(e.target.value);

        // re-load pages theme
        loadTheme();
    });

    // update profile image
    document.getElementById('proImg').addEventListener('input', async () => {
        let proImg = document.getElementById('proImg').files[0];
        if (proImg !== undefined) {
            let proImgURL = await getBase64(proImg);
            updateProfileImage(proImgURL).then(() => loadProfileImage());
        }
    });

    // user logout handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth)
            .then(() => {
                window.location.replace('../Login/Login.html');
            })
            .catch((error) => {
                alert(error.message);
            });
    });

    const calendarButton = document.getElementById('header_calendar_button');
    // redirect to calendar page if user clicks on calendar icon
    calendarButton.addEventListener('click', () => {
        window.location.replace('../Calendar/Calendar.html');
    });

    document.getElementById('submitBtn').addEventListener('click', (e) => {
        e.preventDefault(); // prevent refreshing due to form submission
        let old_pwd = document.getElementById('old').value;
        let new_pwd = document.getElementById('new').value;
        let retype_pwd = document.getElementById('retype').value;

        // if any of the password fields are empty, throw an error
        if (old_pwd === '' || new_pwd === '' || retype_pwd === '') {
            alert('A password field is empty. Please try again');
        }

        let errMsg = isValidPassword(new_pwd);

        if (new_pwd !== retype_pwd) {
            alert('Passwords did not match');
        } else if (errMsg !== '') {
            alert(errMsg);
        } else {
            let cred = EmailAuthProvider.credential(
                auth.currentUser.email,
                old_pwd
            );
            // security check
            reauthenticateWithCredential(auth.currentUser, cred)
                .then(() => {
                    updatePassword(auth.currentUser, new_pwd).then(() => {
                        alert('Password updated!');
                        // clear form fields
                        document.getElementById('old').value = '';
                        document.getElementById('new').value = '';
                        document.getElementById('retype').value = '';
                    });
                })
                .catch((error) => {
                    console.log(error.message);
                });
        }
    });

    // make the date header of the page reflect the current date
    const headerDate = document.getElementById('header_date');
    const { day, month, year } = CURR_DATE_OBJ;
    headerDate.innerHTML = `${getMonthName(month)} ${day}, ${year}`;
    // clicking main date header on weekly overview will navigate to daily
    // overview
    headerDate.addEventListener('click', () => {
        window.location.replace('../DailyOverview/DailyOverview.html');
    });

    // add listener for saving notes
    const noteSave = document.getElementById('notes-save');
    noteSave.addEventListener('click', () => {
        updateNotes(`${month}/${day}/${year}`);
        customAlert('Notes saved!');
    });
}

/**
 * Load user customized banner image
 */
async function loadBannerImage() {
    let banImg = await getBannerImage();
    const divHeader = document.querySelector('div.header');

    // only change if user does upload their image
    if (banImg !== 'default' && banImg !== undefined) {
        divHeader.style.backgroundImage = `url(${banImg})`;
    } else {
        divHeader.style.backgroundImage = '../Images/weekly_header.jpg';
    }

    divHeader.style.backgroundRepeat = 'no-repeat';
    divHeader.style.backgroundPosition = 'center';
    divHeader.style.backgroundSize = 'cover';
}

/**
 * load monthly and yearly goals for current month and yearly from db into goal
 * reminder panel
 * @param {Object} currDateObj - Object with string keys day, month, and year
 * @returns void
 */
async function loadGoalReminders(currDateObj) {
    const { month, year } = currDateObj;
    const dbMonthlyGoals = await getMonthlyGoals(`${month}/${year}`);
    const dbYearlyGoals = await getYearlyGoals(`${year}`);

    populateGoalList('monthGoal', dbMonthlyGoals);
    populateGoalList('yearGoal', dbYearlyGoals);
}

/**
 * load notes for current day from db into notes panel
 * @param {Object} currDateObj - Object with string keys day, month, and year
 * @returns void
 */
async function loadNotes(currDateObj) {
    const { day, month, year } = currDateObj;
    const newNote = document.createElement('note-box');
    const dateStr = `${month}/${day}/${year}`;
    const currDayObj = await getDay(dateStr);

    // if the current day is not stored in the db or if there are no stored
    // notes, stop loading notes
    if (currDayObj === undefined || !('notes' in currDayObj)) {
        return;
    }

    document.querySelector('#notes').append(newNote);
    newNote.entry = currDayObj.notes.content || currDayObj.notes;
}

/**
 * Load user customized profile picture
 */
async function loadProfileImage() {
    let proImg = await getProfileImage();

    // only change profile picture if user does upload their image
    if (proImg !== 'default' && proImg !== undefined) {
        document.getElementById('proImg-label-pic').src = `${proImg}`;
        document.getElementById('profile-btn-img').src = `${proImg}`;
    } else {
        document.getElementById('proImg-label-pic').src =
            '../Images/settings-icon.png';
        document.getElementById('profile-btn-img').src =
            '../Images/settings-icon.png';
    }
}

/**
 * Set various background properties around weekly page to the user's selected
 * theme in the backend
 */
async function loadTheme() {
    let theme = await getTheme();
    document.getElementsByClassName(
        'weekly_column'
    )[0].style.background = theme;
    document.getElementsByClassName(
        'monthly_column'
    )[0].style.background = theme;
    document.getElementsByClassName('photo_column')[0].style.background = theme;
    document.getElementById('themes').value = theme;
    // document.getElementById('notes-save').style.color = theme;
}

/**
 * Loads the current week (7 days worth of data) into the weekly preview
 * @returns void
 */
async function loadWeek() {
    const currWeekList = getCurrentWeek();
    const weekData = {
        Sunday: await getDay(currWeekList[0]),
        Monday: await getDay(currWeekList[1]),
        Tuesday: await getDay(currWeekList[2]),
        Wednesday: await getDay(currWeekList[3]),
        Thursday: await getDay(currWeekList[4]),
        Friday: await getDay(currWeekList[5]),
        Saturday: await getDay(currWeekList[6]),
    };

    const photoList = document.querySelector('.stage');
    const todoList = document.getElementById('weekly_list');
    const days = Object.keys(weekData);

    // iterates through each day and creates list of tasks
    for (let i = 0; i < days.length; i++) {
        const currentDay = weekData[days[i]];
        // if there is no data for the current day in the database
        if (currentDay === undefined) {
            continue;
        }

        // parse and render bullets only if they exist
        if (currentDay.bullets !== undefined) {
            // create the day header
            const header = document.createElement('h2');
            header.textContent = `${days[i]}, ${currentDay.date}`;
            todoList.append(header);

            // load in the day's todos
            bulletParser(currentDay.bullets, todoList);

            // adding separator
            const line = document.createElement('hr');
            todoList.append(line);
        }

        // parse and render photos only if they exist
        if (currentDay.photos !== undefined) {
            // add photos to photo panel
            const photoListEntry = document.createElement('li');
            const photoListEntryCaption = document.createElement('span');
            photoListEntryCaption.innerText = `From ${currentDay.date}`;
            photoListEntry.classList.add('image-wrapper');
            photoListEntry.append(photoListEntryCaption);
            // eslint-disable-next-line no-unused-vars
            for (const [_, base64String] of Object.entries(currentDay.photos)) {
                const photoListEntrySrc = document.createElement('img');
                photoListEntrySrc.src = base64String;
                photoListEntry.append(photoListEntrySrc);
            }
            photoList.append(photoListEntry);
        }
    }
}

/**
 * populate a newly created unordered list by iterating through goals object.
 * This is list is then stored under the HTML element with id goalDivId
 * @param {String} goalDivId - the HTML div id of the goals section
 * @param {Object} goalsObj - the object we need to parse through and append to a
 *                      newly created unordered list
 * @returns void
 */
function populateGoalList(goalDivId, goalsObj) {
    if (goalsObj === undefined) {
        return;
    }

    const goalDiv = document.getElementById(goalDivId);
    const list = document.createElement('ul');

    bulletParser(goalsObj, list);

    goalDiv.append(list);
}

/**
 * Function that updates the notes
 */
function updateNotes(currDateString) {
    const newNote = document.querySelector('note-box').entry.content;
    updateNote(currDateString, newNote);
}

// call setup functions
window.onload = async () => {
    await redirectNotLoggedInUser(
        (msg) => customAlert(msg),
        PAGE_TIMEOUT_FOR_INVALID_USER
    );

    eventListenerSetup();

    // load panels
    loadTheme();
    loadBannerImage();
    loadProfileImage();
    loadWeek();
    loadNotes(CURR_DATE_OBJ);
    loadGoalReminders(CURR_DATE_OBJ);
};
