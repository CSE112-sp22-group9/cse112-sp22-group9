import {
    getBase64,
    getCurrentDate,
    getDateObj,
    getDay,
    getMonthlyGoals,
    getTheme,
    getYearlyGoals,
    redirectNotLoggedInUser,
    updateDay,
    updateNote,
} from '../Backend/BackendInit.js';

window.img = new Array(); // used to load image from <input> and draw to CANVAS
const CANVAS = document.getElementById('myCanvas');
const CANV = CANVAS.getContext('2d');
const IMAGE_INPUT = document.getElementById('image-input');

// Buttons
const LEFT_BUTTON = document.getElementById('left');
const RIGHT_BUTTON = document.getElementById('right');
const SAVE_BUTTON = document.getElementById('save');
const DELETE_BUTTON = document.getElementById('delete');

const URL_PARAMS = new URLSearchParams(window.location.search);
let currDateObj;
if (URL_PARAMS.has('date')) {
    currDateObj = getDateObj(URL_PARAMS.get('date'));
} else {
    currDateObj = getCurrentDate();
}
const { day, month, year } = currDateObj;
const CURR_DATE_STRING = `${month}/${day}/${year}`;

let relative = 0; // index used for accessing images

// stores all db data for the current day. this is constantly updated and
// pushed to the db to reflect iterative changes throughout the user's
// session with daily.js
let currentDay;

const PAGE_TIMEOUT_FOR_INVALID_USER = 3;

window.onload = async () => {
    await redirectNotLoggedInUser(
        (msg) => customAlert(msg),
        PAGE_TIMEOUT_FOR_INVALID_USER
    );

    eventListenerSetup();
    // load page's theme based on user's selected theme from weekly overview
    loadTheme();
    // get the day and also the monthly and yearly goals
    requestDay();
    fetchGoals(
        await getMonthlyGoals(`${month}/${year}`),
        '#monthGoal',
        'month-goal'
    );
    fetchGoals(await getYearlyGoals(`${year}`), '#yearGoal', 'year-goal');
};

/**
 * When a bullet is updated in any way, clear the 'New Bullet Text' input field,
 * re-render all bullets, and update the database
 * @returns void
 */
function bulletChangeResolution() {
    document.querySelector('#bullets').innerHTML = '';
    renderBullets(currentDay.bullets);
    updateDay(currentDay);
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
    // ~~~~~~~~~~~~~~~ Event Listeners ~~~~~~~~~~~~~~~

    // the space in the template literal below is needed for proper rendering
    document.getElementById('date').innerHTML += ` ${CURR_DATE_STRING}`;

    // set back button
    document.getElementById('home').addEventListener('click', () => {
        updateDay(currentDay);
        window.location.replace('../WeeklyOverview/WeeklyOverview.html');
    });

    // add listener for saving notes
    const noteSave = document.getElementById('notes-save');
    noteSave.addEventListener('click', () => {
        updateNotes();
        customAlert('Notes saved!');
    });

    // ~~~~~~~~~~~~~~~ Bullet Event Listeners ~~~~~~~~~~~~~~~
    const bullets = document.querySelector('#bullets');

    // lets bullet component listen to when a bullet child is added
    bullets.addEventListener('added', function (e) {
        // gets the index and json object of the current bullet we want to look at
        const newJson = JSON.parse(
            e.composedPath()[0].getAttribute('bulletJson')
        );
        const index = JSON.parse(e.composedPath()[0].getAttribute('index'));

        // if 3rd layer of nesting, add it to our children
        if (e.composedPath().length > 7) {
            currentDay.bullets[index[0]].childList[index[1]] = newJson;
        } else {
            currentDay.bullets[index[0]] = newJson;
        }

        bulletChangeResolution();
    });

    // lets bullet component listen to when a bullet is deleted
    bullets.addEventListener('deleted', function (e) {
        const callback = (...indexes) => {
            const list = getBulletList(...indexes);

            // if there is only one index, we are deleting a top-level bullet. if
            // there is a second index, we are deleting an intermediate-level bullet.
            // if there is a third index, we are deleting a bottom-level bullet.
            if (indexes.length == 1) {
                generalOp(list, Array.prototype.splice, indexes[0], 1);
            } else if (indexes.length == 2) {
                generalOp(list, Array.prototype.splice, indexes[1], 1);
            } else {
                generalOp(list, Array.prototype.splice, indexes[2], 1);
            }
        };

        // sets up event listener for bullet when it is deleted
        generalBulletListener(e, callback);
    });

    // lets bullet component listen to when a bullet is marked done
    bullets.addEventListener('done', function (e) {
        const callback = (...indexes) => {
            // we need to access the last index after getting the bullet list here
            // because we are trying to access an object to edit its properties
            const list = getBulletList(...indexes)[indexes[indexes.length - 1]];
            generalOp(list, toggleBulletStatus, list);
        };

        // sets up event listener for bullet when it is marked as done
        generalBulletListener(e, callback);
    });

    // lets bullet component listen to when a bullet is edited
    bullets.addEventListener('edited', function (e) {
        const jsonAttribute = e.composedPath()[0].getAttribute('bulletJson');
        const newText = JSON.parse(jsonAttribute).text;

        const callback = (...indexes) => {
            // see callback explanation for 'done' event listener above
            const list = getBulletList(...indexes)[indexes[indexes.length - 1]];
            generalOp(list, setBulletText, list, newText);
        };

        // sets up event listener for bullet when it is edited
        generalBulletListener(e, callback);
    });

    // lets bullet component listen to when a bullet is clicked category
    bullets.addEventListener('features', function (e) {
        const path = e.composedPath()[0];
        const newFeature = JSON.parse(path.getAttribute('bulletJson')).features;

        const callback = (...indexes) => {
            // see callback explanation for 'done' event listener above
            const list = getBulletList(...indexes)[indexes[indexes.length - 1]];
            generalOp(list, setBulletFeature, list, newFeature);
        };

        // sets up event listener for bullet when its feature is altered
        generalBulletListener(e, callback);
    });

    const entryForm = document.querySelector('.entry-form');
    entryForm.addEventListener('submit', (submit) => {
        submit.preventDefault(); // prevent page refresh on button press
        const bText = document.querySelector('.entry-form-text').value;
        if (bText === undefined || bText === '') {
            return;
        }

        document.querySelector('.entry-form-text').value = '';

        if (!('bullets' in currentDay)) {
            currentDay.bullets = [];
        }
        // get the text in form on a submit, then push an object representing the
        // bullet into our current day
        currentDay.bullets.push({
            text: bText,
            done: false,
            childList: [],
            features: 'normal',
        });

        bulletChangeResolution();
    });

    // ~~~~~~~~~~~~~~~ Image Event Listeners ~~~~~~~~~~~~~~~

    LEFT_BUTTON.addEventListener('click', () => {
        // if there are no images, do nothing
        if (window.img.length === 0) {
            return;
        }

        // if the left button is selected, wrap the index around to the last index
        // (if the user clicks back on the first image, render the last image)
        const n = window.img.length;
        relative = (((relative - 1) % n) + n) % n;

        CANV.clearRect(0, 0, CANVAS.width, CANVAS.height);

        // if there is no image at the 'last index' (ie the user deletes the only
        // image) don't render anything
        if (window.img[relative]) {
            processCurrentImage();
        }
    });

    RIGHT_BUTTON.addEventListener('click', () => {
        // if there are no images, do nothing
        if (window.img.length === 0) {
            return;
        }

        // if the right button is selected, wrap the index around to the first index
        // (if the user clicks forward on the last image, render the first image)
        relative = (relative + 1) % window.img.length;

        CANV.clearRect(0, 0, CANVAS.width, CANVAS.height);
        // if there is no image at the 'last index' (ie the user deletes the only
        // image) don't render anything
        if (window.img[relative]) {
            processCurrentImage();
        }
    });

    // save image that was chosen in file selector to db and display it
    // on image CANVAS
    SAVE_BUTTON.addEventListener('click', async () => {
        // if a file had not been loaded, do nothing
        if (IMAGE_INPUT.files === undefined) {
            return;
        }

        // This allows you to store blob -> base64
        const base64 = await getBase64(IMAGE_INPUT.files[0]);

        if (!('photos' in currentDay)) {
            currentDay.photos = [];
        }

        currentDay.photos.push(base64);

        // we save an image to the very end of our image array, so set the current
        // index of the image we want to render to the very end of the list
        relative = window.img.length;
        renderPhotos(currentDay.photos !== undefined ? currentDay.photos : []);

        IMAGE_INPUT.value = null;
        updateDay(currentDay);
    });

    DELETE_BUTTON.addEventListener('click', async () => {
        if (window.img[relative] === undefined) {
            return;
        }

        // get the current photo's index and remove it from our current day object
        const dbPhotoIdx = currentDay.photos.indexOf(window.img[relative].src);
        currentDay.photos.splice(dbPhotoIdx, 1);
        window.img.splice(relative, 1);

        // render the first image in our array after deletion
        relative = 0;
        if (window.img.length == relative) {
            CANV.clearRect(0, 0, CANVAS.width, CANVAS.height);
        }

        renderPhotos(currentDay.photos !== undefined ? currentDay.photos : []);

        updateDay(currentDay);
    });
}

/**
 * load either monthly or yearly goals into respective list depending on input
 * @param {Object} goalsObj - the object containing monthly/yearly goals
 * @param {String} listId - the id of the list to append the goals to
 * @param {String} newClass - the class that the goal will identify with
 * (monthly or yearly class)
 * @returns void
 */
async function fetchGoals(goalsObj, listId, newClass) {
    if (goalsObj === undefined) {
        return;
    }

    // load in bullets
    // eslint-disable-next-line no-unused-vars
    for (const [_, goal] of Object.entries(goalsObj)) {
        const goalElem = document.createElement('p');
        goalElem.innerHTML = goal.text;
        goalElem.style.wordBreak = 'break-all';
        goalElem.style.overflowX = 'hidden';
        goalElem.style.marginTop = '0';
        goalElem.style.paddingRight = '1vh';
        goalElem.style.fontSize = '1.25vh';
        if (goal.done == true) {
            goalElem.style.textDecoration = 'line-through';
        }

        goalElem.classList.add(newClass);
        document.querySelector(listId).appendChild(goalElem);
    }
}

/**
 * Generalize bullet event listeners and include a callback to execute when
 * a bullet is interacted with
 * @param {event} e - DOM event
 * @param {Function} callback - function to call on bullet interaction (ie this
 * callback is dependent on the type of trigger event - delete, submit, etc.)
 * @returns void
 */
function generalBulletListener(e, callback) {
    const index = JSON.parse(e.composedPath()[0].getAttribute('index'));
    const firstIndex = index[0];
    if (index.length > 1) {
        const secondIndex = index[1];
        if (index.length > 2) {
            const thirdIndex = index[2];
            callback(firstIndex, secondIndex, thirdIndex);
        } else {
            callback(firstIndex, secondIndex);
        }
    } else {
        callback(firstIndex);
    }

    bulletChangeResolution();
}

/**
 * Call any arbitrary function on a list with an arbitrary number of
 * arguments
 * @param {Array} list - Any list object
 * @param {Function} func - function to call on list with funcArgs
 * @param  {...any} funcArgs - arguments for func
 * @returns void
 */
function generalOp(list, func, ...funcArgs) {
    func.call(list, ...funcArgs);
}

/**
 * return a bullet list or a child list of a bullet list depending on how many
 * arguments are passed in.
 *
 * NOTE: arguments must be numbers representing the indexes of which list you
 * would like to access at each level (eg passing in 0,0,0 will grab the first
 * bullets list, then the first bullet in its child list, then will return the
 * childList of the childList's first bullet)
 * @returns array
 */
function getBulletList() {
    if (arguments.length == 1) {
        return currentDay.bullets;
    } else {
        let bulletList = currentDay.bullets[arguments[0]];
        for (let i = 1; i < arguments.length - 1; i++) {
            bulletList = bulletList.childList[arguments[i]];
        }

        return bulletList.childList;
    }
}

/**
 * Takes in the dimensions of the CANVAS and the new image, then calculates the
 * new dimensions of the image so that it fits perfectly into the Canvas and
 * maintains aspect ratio
 * @param {number} canvasWidth Width of the CANVAS element to insert image into
 * @param {number} canvasHeight Height of the CANVAS element to insert image
 * into
 * @param {number} imageWidth Width of the new user submitted image
 * @param {number} imageHeight Height of the new user submitted image
 * @returns {Object} An object containing four properties: The newly calculated
 * width and height, and also the starting X and starting Y coordinate to be
 * used when you draw the new image to the Canvas. These coordinates align with
 * the top left of the image.
 */
function getDimensions(canvasWidth, canvasHeight, imageWidth, imageHeight) {
    let aspectRatio, height, width, startX, startY;

    // Get the aspect ratio, used so the picture always fits inside the CANVAS
    aspectRatio = imageWidth / imageHeight;

    // If the aspect ratio is less than 1 it's a vertical image
    if (aspectRatio < 1) {
        // Height is the max possible given the CANVAS
        height = canvasHeight;
        // Width is then proportional given the height and aspect ratio
        width = canvasHeight * aspectRatio;
        // Start the Y at the top since it's max height, but center the width
        startY = 0;
        startX = (canvasWidth - width) / 2;
        // This is for horizontal images now
    } else {
        // Width is the maximum width possible given the CANVAS
        width = canvasWidth;
        // Height is then proportional given the width and aspect ratio
        height = canvasWidth / aspectRatio;
        // Start the X at the very left since it's max width, but center the
        // height
        startX = 0;
        startY = (canvasHeight - height) / 2;
    }

    return { width: width, height: height, startX: startX, startY: startY };
}

/**
 * Load the user's theme that is stored in the db and set the main page's
 * background color to this theme
 * @returns void
 */
async function loadTheme() {
    const userTheme = await getTheme();
    // if the user does not have a theme, use a default white background
    if (userTheme === undefined) {
        return;
    }

    document.querySelector('body').style.backgroundColor = userTheme;

    // Colors are hard to see with colors, so we do not attach the userTheme
    // to them
    // document.getElementById('notes-save').style.color = userTheme;
    // document.getElementById('delete').style.color = userTheme;
    // document.getElementById('image-input').style.color = userTheme;
    // document.getElementById('left').style.color = userTheme;
    // document.getElementById('right').style.color = userTheme;
    // document.getElementById('save').style.color = userTheme;
}

/**
 * Function that recursively renders the nested bullets of a given bullet
 * @param {Object} bullet - a bullet object of child to create
 * @param {Number} i - array of integers of index of bullets
 * @return {Object} new child created
 */
function processBullet(bullet, i) {
    const newPost = document.createElement('bullet-entry');
    newPost.setAttribute('bulletJson', JSON.stringify(bullet));
    newPost.setAttribute('index', JSON.stringify(i));
    newPost.entry = bullet;
    newPost.index = i;
    if ('childList' in bullet && bullet.childList.length != 0) {
        i.push(0);
        bullet.childList.forEach((child) => {
            const newChild = processBullet(child, i);
            newPost.child = newChild;
            i[i.length - 1]++;
        });
        i.pop();
    }
    return newPost;
}

/**
 * Render the image at our current relative index and draw it on the CANVAS
 * (photo album area)
 * @returns void
 */
function processCurrentImage() {
    if (window.img.length <= relative) {
        return;
    }

    CANV.clearRect(0, 0, CANVAS.width, CANVAS.height);
    const imgDimension = getDimensions(
        CANVAS.width,
        CANVAS.height,
        window.img[relative].width,
        window.img[relative].height
    );
    CANV.drawImage(
        window.img[relative],
        imgDimension['startX'],
        imgDimension['startY'],
        imgDimension['width'],
        imgDimension['height']
    );
}

/**
 * Function that renders a list of bullets into the todo area
 * Update currentDay json with updated bullets
 * @param {Object} bullets - a list of bullet objects to render
 * @returns void
 */
function renderBullets(bullets) {
    if (bullets === undefined || bullets === []) {
        return;
    }

    let iNum = 0;
    bullets.forEach((bullet) => {
        let i = [iNum];
        const newPost = processBullet(bullet, i);
        document.querySelector('#bullets').appendChild(newPost);
        iNum++;
    });
}

/**
 * Function that gets photos and renders
 * @param {Object} photos takes in photo object
 * @return nothing
 */
function renderPhotos(photos) {
    for (let i = 0; i < photos.length; i++) {
        window.img[i] = new Image();
        window.img[i].src = photos[i];
    }
    setTimeout(() => processCurrentImage(), 100);
}

/**
 * Gets the current day object (and creates one if one doesn't exist)
 * and sets the "currentDay" variable
 * Also renders the days notes and bullets if there are any
 * @returns void
 */
async function requestDay() {
    await getDay(CURR_DATE_STRING).then((currDay) => {
        if (currDay === undefined) {
            currDay = {
                bullets: [],
                date: CURR_DATE_STRING,
                notes: '',
                photos: [],
            };
        }
        currentDay = currDay;

        //Load in bullets
        renderBullets(currentDay.bullets ? currentDay.bullets : undefined);

        // Load in notes
        const newNote = document.createElement('note-box');
        newNote.entry = currentDay.notes.content || currentDay.notes || '';
        newNote.shadowRoot.querySelector('.noteContent').style.height = '66vh';
        document.querySelector('#notes').appendChild(newNote);

        // Load photos
        renderPhotos(currDay.photos !== undefined ? currDay.photos : []);
    });
}

/**
 * set feature for bullet
 * @param {bullet} obj - a bullet object that has a feature field
 * @param {String} newFeature - new feature to assign to bullet
 * @returns void
 */
function setBulletFeature(obj, newFeature) {
    obj.features = newFeature;
}

/**
 * set text for bullet
 * @param {bullet} obj - a bullet object that has a text field
 * @param {String} newText - new text to assign to bullet
 * @returns void
 */
function setBulletText(obj, newText) {
    obj.text = newText;
}

/**
 * toggle bullet done status
 * @param {bullet} obj - a bullet object that has a done field
 * @returns void
 */
function toggleBulletStatus(obj) {
    obj.done ^= true;
}

/**
 * update the current day's note field in the db
 * @returns void
 */
function updateNotes() {
    const newNote = document.querySelector('note-box').entry.content;
    currentDay.notes = newNote;
    updateNote(CURR_DATE_STRING, newNote);
}
