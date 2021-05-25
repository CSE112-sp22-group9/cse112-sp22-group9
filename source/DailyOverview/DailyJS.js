window.img = new Image(); // used to load image from <input> and draw to canvas
var input = document.getElementById('image-input');
const canvas = document.getElementById('myCanvas');
let canv = canvas.getContext('2d');

let relative = 0;
// Buttons
const add = document.getElementById('addPhoto');
const save = document.getElementById('save');
const right = document.getElementById('right');
const left = document.getElementById('left');

// store current day data to update when user leaves page
let currentDay;
//  = {
//     date: "05/20/2021",
//     bullets: [
//         {
//             text: "O, Wonder!",
//             symb: "•",
//             done: true,
//             childList: [],
//             time: null
//         }
//     ],
//     photos: [],
//     notes: "Here is some notes sample test this is a note possibly here could be another"
// }

window.addEventListener('load', () => {
    // getting backend sample day
    let req = getDay('05/20/2021');
    req.onsuccess = function (e) {
        console.log('got day');
        console.log(e.target.result);
        currentDay = e.target.result;
        //Load in bullets
        let bullets = currentDay.bullets;
        renderBullets(bullets);

        // Load in notes
        let newNote = document.createElement('note-box');
        newNote.entry = currentDay.notes;
        document.querySelector('#notes').appendChild(newNote);
    };
});

/* Here is another version of what to do when the window loads, TODO, merge these into one
window.onload = () => {
    // eslint-disable-next-line no-undef
    let req = getDay('05/20/2021');
    req.onsuccess = function (e) {
        console.log('got day');
        console.log(e.target.result);
        let bullets = e.target.result.bullets;
        let photos = e.target.result.photos;
        renderPhotos(photos);

        renderBullets(bullets);
    };
};
*/

document.getElementById('notesb').addEventListener('click', () => {
    // var divs = document.getElementsByClassName('divs');
    // for (var i = 0; i < arrows.length; i++) {
    //     if (this != arrows[i]) {
    //         arrows[i].style.display = 'none';
    //     }
    // }
    updateNote();
    updateDay(currentDay);
});

document.querySelector('.entry-form').addEventListener('submit', (submit) => {
    submit.preventDefault();
    let bText = document.querySelector('.entry-form-text').value;
    document.querySelector('.entry-form-text').value = '';
    currentDay.bullets.push({
        text: bText,
        symb: '•',
        done: false,
        childList: [],
        time: null,
    });
    console.log(currentDay);
    document.querySelector('#bullets').innerHTML = '';
    renderBullets(currentDay.bullets);
    updateDay(currentDay);
});

// lets bullet component listen to when a bullet child is added
document.querySelector('#bullets').addEventListener('added', function (e) {
    console.log('got event');
    console.log(e.composedPath());
    let newJson = JSON.parse(e.composedPath()[0].getAttribute('bulletJson'));
    let index = JSON.parse(e.composedPath()[0].getAttribute('index'));
    currentDay.bullets[index[0]] = newJson;
    updateDay(currentDay);
});

// lets bullet component listen to when a bullet is deleted
document.querySelector('#bullets').addEventListener('deleted', function (e) {
    console.log('got event');
    console.log(e.composedPath());
    let index = JSON.parse(e.composedPath()[0].getAttribute('index'));
    let firstIndex = index[0];
    if (index.length > 1) {
        let secondIndex = index[1];
        currentDay.bullets[firstIndex].childList.splice(secondIndex, 1);
    } else {
        currentDay.bullets.splice(firstIndex, 1);
    }
    updateDay(currentDay);
    document.querySelector('#bullets').innerHTML = '';
    renderBullets(currentDay.bullets);
});

// lets todo component listen to when a bullet is deleted
document.querySelector('#bullets').addEventListener('edited', function (e) {
    console.log('got event');
    console.log(e.composedPath()[0]);
    let newText = JSON.parse(e.composedPath()[0].getAttribute('bulletJson'))
        .text;
    let index = JSON.parse(e.composedPath()[0].getAttribute('index'));
    let firstIndex = index[0];
    if (index.length > 1) {
        let secondIndex = index[1];
        currentDay.bullets[firstIndex].childList[secondIndex].text = newText;
    } else {
        currentDay.bullets[firstIndex].text = newText;
    }
    updateDay(currentDay);
    document.querySelector('#bullets').innerHTML = '';
    renderBullets(currentDay.bullets);
});

/**
 * Function that renders a list of bullets into the todo area
 * Update currentDay json with updated bullets
 * @param {[Object]} a list of bullet objects to render
 */
function renderBullets(bullets) {
    let iNum = 0;
    bullets.forEach((bullet) => {
        let i = [iNum];
        let newPost = document.createElement('bullet-entry');
        newPost.setAttribute('bulletJson', JSON.stringify(bullet));
        newPost.setAttribute('index', JSON.stringify(i));
        newPost.entry = bullet;
        console.log(bullet);
        if (bullet.childList.length != 0) {
            i.push(0);
            bullet.childList.forEach((child) => {
                let newChild = renderChild(child, i);
                newPost.child = newChild;
                i[i.length - 1]++;
            });
        }
        console.log(newPost);
        document.querySelector('#bullets').appendChild(newPost);
        iNum++;
    });
}

/**
 * Function that recursively renders the nested bullets of a given bullet
 * @param {Object} a bullet object of child to create
 * @param {[int]} array of integers of index of bullets
 * @return {Object} new child created
 */
function renderChild(bullet, i) {
    let newChild = document.createElement('bullet-entry');
    newChild.setAttribute('bulletJson', JSON.stringify(bullet));
    newChild.setAttribute('index', JSON.stringify(i));
    newChild.entry = bullet;
    if (bullet.childList.length != 0) {
        i.push(0);
        bullet.childList.forEach((child) => {
            let newNewChild = renderChild(child, i);
            newChild.child = newNewChild;
            i[i.length - 1]++;
        });
    }
    console.log(newChild);
    return newChild;
}

function editBullet() {
    console.log('in here');
    let editedEntry = prompt(
        'Edit Bullet',
        this.shadowRoot.querySelector('.bullet-content').innerText
    );
    if (editedEntry != null && editedEntry != '') {
        this.shadowRoot.querySelector(
            '.bullet-content'
        ).innerText = editedEntry;
    }
}

/**
 * Function that updates the notes
 */
function updateNote() {
    let currNote = document
        .querySelector('note-box')
        .shadowRoot.querySelector('.noteContent').innerHTML;
    currentDay.notes = currNote;
}

input.addEventListener('change', (event) => {
    window.img[relative] = new Image();
    window.img[relative].src = URL.createObjectURL(event.target.files[0]); // User picks image location
});
// Add an image to the canvas
add.addEventListener('click', () => {
    input.type = 'file';
    save.style.display = 'inline';
});
// Save image and will hide everything else
// REQUIRED TO PRESS SAVE AFTER UPLOAD
save.addEventListener('click', () => {
    input.type = 'hidden';
    save.style.display = 'none';
    let imgDimension = getDimensions(
        canvas.width,
        canvas.height,
        window.img[relative].width,
        window.img[relative].height
    );
    canv.drawImage(
        window.img[relative],
        imgDimension['startX'],
        imgDimension['startY'],
        imgDimension['width'],
        imgDimension['height']
    );
});
left.addEventListener('click', () => {
    relative -= 1;
    canv.clearRect(0, 0, canvas.width, canvas.height);
    if (window.img[relative]) {
        var imgDimension = getDimensions(
            canvas.width,
            canvas.height,
            window.img[relative].width,
            window.img[relative].height
        );
        canv.drawImage(
            window.img[relative],
            imgDimension['startX'],
            imgDimension['startY'],
            imgDimension['width'],
            imgDimension['height']
        );
    }
});
right.addEventListener('click', () => {
    relative += 1;
    canv.clearRect(0, 0, canvas.width, canvas.height);
    if (window.img[relative]) {
        var imgDimension = getDimensions(
            canvas.width,
            canvas.height,
            window.img[relative].width,
            window.img[relative].height
        );
        canv.drawImage(
            window.img[relative],
            imgDimension['startX'],
            imgDimension['startY'],
            imgDimension['width'],
            imgDimension['height']
        );
    }
});

/**
 * Takes in the dimensions of the canvas and the new image, then calculates the new
 * dimensions of the image so that it fits perfectly into the Canvas and maintains aspect ratio
 * @param {number} canvasWidth Width of the canvas element to insert image into
 * @param {number} canvasHeight Height of the canvas element to insert image into
 * @param {number} imageWidth Width of the new user submitted image
 * @param {number} imageHeight Height of the new user submitted image
 * @returns {Object} An object containing four properties: The newly calculated width and height,
 * and also the starting X and starting Y coordinate to be used when you draw the new image to the
 * Canvas. These coordinates align with the top left of the image.
 */
function getDimensions(canvasWidth, canvasHeight, imageWidth, imageHeight) {
    let aspectRatio, height, width, startX, startY;

    // Get the aspect ratio, used so the picture always fits inside the canvas
    aspectRatio = imageWidth / imageHeight;

    // If the apsect ratio is less than 1 it's a verical image
    if (aspectRatio < 1) {
        // Height is the max possible given the canvas
        height = canvasHeight;
        // Width is then proportional given the height and aspect ratio
        width = canvasHeight * aspectRatio;
        // Start the Y at the top since it's max height, but center the width
        startY = 0;
        startX = (canvasWidth - width) / 2;
        // This is for horizontal images now
    } else {
        // Width is the maximum width possible given the canvas
        width = canvasWidth;
        // Height is then proportional given the width and aspect ratio
        height = canvasWidth / aspectRatio;
        // Start the X at the very left since it's max width, but center the height
        startX = 0;
        startY = (canvasHeight - height) / 2;
    }

    return { width: width, height: height, startX: startX, startY: startY };
}

//set back button
document.getElementById('monthView').children[0].href +=
    '#' + currentDay.substring(0, 2) + '/' + currentDay.substring(6);

/**
 * Function that recursively renders the nested bullets of a given bullet
 * @param {Object} a bullet object
 * @return {Object} new child created
 */
// eslint-disable-next-line no-unused-vars
function renderPhotos(photos) {
    for (let i = 0; i < photos.length; i++) {
        window.img[i] = new Image();
        window.img[i].src = photos[i];
    }
}
