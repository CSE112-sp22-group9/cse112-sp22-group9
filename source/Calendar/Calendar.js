import {
    getCurrentDate,
    getDateObj,
    getMonthObj,
    getTheme,
    getYearlyGoals,
    redirectNotLoggedInUser,
    updateMonthlyGoals,
    updateYearlyGoals,
} from '../Backend/BackendInit.js';

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OV_LINK = '../DailyOverview/DailyOverview.html';
const YEAR_START = 2018;
const YEAR_END = 2025;
const PAGE_TIMEOUT_FOR_INVALID_USER = 3;

// this month object keeps track of the month object from the db. this object
// if constantly updated here and pushed to the database on change
let monthObj;
let yearObj;
let today, paddedDateStr;

window.onload = async () => {
    await redirectNotLoggedInUser(
        (msg) => customAlert(msg),
        PAGE_TIMEOUT_FOR_INVALID_USER
    );

    await setupCalendar();
};

window.onclick = function (e) {
    // if user clicks on anything that isn't the month label, close the month
    // dropdown
    if (!e.target.matches('.calMonthLabel')) {
        var myDropdown = document.getElementById('dropdown');
        if (myDropdown === undefined || myDropdown == null) {
            return;
        }

        if (myDropdown.classList.contains('dropdown-content')) {
            myDropdown.classList.remove('dropdown-content');
            myDropdown.classList.add('show-content');
        }
    }

    // if user clicks on anything that isn't the year label, close the year
    // dropdown
    if (!e.target.matches('.calYearLabel')) {
        var yearDropdown = document.getElementById('year-dropdown');
        if (yearDropdown === undefined) {
            return;
        }

        if (yearDropdown.classList.contains('dropdown-content')) {
            yearDropdown.classList.remove('dropdown-content');
            yearDropdown.classList.add('show-content');
        }
    }
};

/**
 * Add goal listeners for adding, editing, deleting, and marking monthly/yearly
 * goals as complete
 */
function addGoalListeners() {
    goalListenerSetup(monthObj, '#monthGoal', '#plus-month', (obj) =>
        updateMonthlyGoals(obj)
    );
    goalListenerSetup(yearObj, '#yearGoal', '#plus-year', (obj) =>
        updateYearlyGoals(obj)
    );
}

/**
 * Make pop up alert with custom css and text that is passed in
 * @param {String} text
 */
function customAlert(text) {
    const closeButtonHTML = '<span class="closebtn">&times;</span>';
    document.querySelector('.alert').style.display = 'flex';
    document.querySelector('.alert').innerHTML = `${text}${closeButtonHTML}`;
}

/**
 * Get the number of days in a specified month - helper function
 * @param {String} month - 0-indexed month for which we need to get number of
 * days
 * @param {String} year - year for which we need to get number of days
 * @returns number of days in a specified month
 */
function daysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Format the day number
 * @param {String} day - one-indexed day integer
 * @returns a day number string like "22" for 22nd day of month
 */
function dayNumber(day) {
    if (day > 9) {
        return '' + day;
    } else {
        return '0' + day;
    }
}

/**
 * First day-of-the-week (Sunday 0, Saturday 6) helper function
 * @param {String} month - 0-indexed month for which we need to get the first
 * day of the week
 * @param {String} year - year for which we need to get the first day of the
 * month
 * @returns the day of the week of the first day in this month (Sunday 0,
 * Saturday 6)
 */
function firstDow(month, year) {
    return new Date(year, month, 1).getDay();
}

/**
 * Remove the event listeners that were previously added by goalListenerSetup
 * @param {String} goalDivId - The id of the div that contains the goals for
 * which event listener we want to remove
 * @param {String} addHeaderId - The id of the corresponding plus button of the
 * goal mentioned above
 */
function goalListenerRemoval(goalDivId, addHeaderId) {
    const goals = document.querySelector(goalDivId);
    const addHeader = document.querySelector(addHeaderId);

    addHeader.removeEventListener('click', addHeader.clickFunction);
    goals.removeEventListener('edited', goals.editedFunction);
    goals.removeEventListener('deleted', goals.deletedFunction);
    goals.removeEventListener('done', goals.doneFunction);
}

/**
 * Set up all event listeners for monthly/yearly goals panel (add, edit, delete,
 * mark goals as complete)
 * @param {Object} goalObj - The goal object that we need to update
 * @param {String} goalDivId - The id of the div that contains the goals for
 * which event listener we want to setup
 * @param {String} addHeaderId - The id of the corresponding plus button of the
 * goal mentioned above
 * @param {Function} callback - This callback strictly updates the backend for
 * the monthly and yearly goals
 */
function goalListenerSetup(goalObj, goalDivId, addHeaderId, callback) {
    const goals = document.querySelector(goalDivId);
    const addHeader = document.querySelector(addHeaderId);

    // get the corresponding index for the goal that was edited so that
    // we can correctly update goalObj
    const getIndexFromEvent = (e) => {
        const index = e.composedPath()[0].getAttribute('index');
        return index;
    };

    addHeader.clickFunction = function () {
        // set up popup for adding monthly/yearly goal
        const popup = document.getElementById('calendar-popup');
        const popup_text = document.getElementById('calendar-popup-text');
        const popup_cancel = document.getElementById('cancel-note');
        const popup_submit = document.getElementById('submit-note');

        popup.style.display = 'block';
        popup_text.focus();
        popup_cancel.onclick = function () {
            popup_text.value = '';
            popup.style.display = 'none';
        };

        popup_submit.onclick = () => submitGoal(goalObj, goalDivId, callback);

        // make button seem clickable or non-clickable depending on whether
        // the user has added input or not
        popup_text.addEventListener('input', (e) => {
            if (e.target.value !== '') {
                popup_submit.style.backgroundColor = '#39b594';
            } else {
                popup_submit.style.backgroundColor = '#a9c7bf';
            }
        });
        popup_text.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') {
                popup_submit.dispatchEvent(new Event('click'));
            }
        });
    };

    goals.editedFunction = function (e) {
        const newText = JSON.parse(e.composedPath()[0].getAttribute('goalJson'))
            .text;
        let index = getIndexFromEvent(e);

        // updates the goalObj with the index of the goal that was edited
        goalObj.goals[index].text = newText;

        // updates the backend with the current goal object (after the text
        // was set)
        callback(goalObj);

        // re-render current goals after text is set
        renderGoals(goalObj.goals, goalDivId);
    };

    // see editedFunction comments above
    goals.deletedFunction = function (e) {
        let index = getIndexFromEvent(e);
        goalObj.goals.splice(index, 1);
        callback(goalObj);
        renderGoals(goalObj.goals, goalDivId);
    };

    // see editedFunction comments above
    goals.doneFunction = function (e) {
        let index = getIndexFromEvent(e);
        goalObj.goals[index].done ^= true;
        callback(goalObj);
        renderGoals(goalObj.goals, goalDivId);
    };

    addHeader.addEventListener('click', addHeader.clickFunction);
    goals.addEventListener('edited', goals.editedFunction);
    goals.addEventListener('deleted', goals.deletedFunction);
    goals.addEventListener('done', goals.doneFunction);
}

/**
 * last day-of-the-week (Sunday 0, Saturday 6) helper function
 * @param {String} month - 0-indexed month for which we need to get the last
 * day of the week
 * @param {String} year - year for which we need to get the last day of the
 * month
 * @returns the day of the week of the last day in this month (Sunday 0,
 * Saturday 6)
 */
function lastDow(month, year) {
    return new Date(year, month + 1, 1).getDay() - 1;
}

/**
 * Set user theme with their preference
 */
async function loadTheme() {
    let userTheme = await getTheme();
    document.getElementsByClassName(
        'calendar-bg'
    )[0].style.background = userTheme;
    document.getElementsByClassName(
        'calendar-wrapper'
    )[0].style.background = userTheme;

    if (document.querySelector('calToday') !== null) {
        document.getElementsByClassName(
            'calToday'
        )[0].style.background = userTheme;
    }

    document.styleSheets[0].insertRule(
        `.calMonthLabel:hover { color: ${userTheme}; text-decoration: underline;
        cursor: pointer; }`,
        0
    );
    document.styleSheets[0].insertRule(
        `.calYearLabel:hover { color: ${userTheme}; text-decoration: underline;
        cursor: pointer; }`,
        0
    );
    document.styleSheets[0].insertRule(
        `.month-link:hover { color: ${userTheme}; text-decoration: underline;
        cursor: pointer; }`,
        0
    );
    document.styleSheets[0].insertRule(
        '.calBlankDay:hover { outline: 0px; }',
        0
    );
    document.styleSheets[0].insertRule(
        `.calDay:hover { outline: 5px solid ${userTheme}; cursor: pointer; }`,
        0
    );
    document.styleSheets[0].insertRule(
        `.calToday { background-color: ${userTheme} !important; }`,
        0
    );
}

/**
 * Formats the month number
 * @param {*} month zero-indexed month integer, like 1 for February
 * @returns a month number string like "02" for February
 */
function monthNumber(month) {
    if (month > 8) {
        return `${month + 1}`;
    } else {
        return `0${month + 1}`;
    }
}

/**
 * Remove goal listeners for monthly and yearly goal panel that were setup by
 * addGoalListeners()
 */
function removeGoalListeners() {
    goalListenerRemoval('#monthGoal', '#plus-month');
    goalListenerRemoval('#yearGoal', '#plus-year');
}

/**
 * Create goal-entry objects for each goal in the passed-in list and add it to
 * the DOM at passed-in div id
 * @param {Array} goalsList - The list of goal objects we need to render
 * @param {String} goalsDivId - The id of the div at which we need to append
 * the list of goals
 */
function renderGoals(goalsList, goalsDivId) {
    const htmlGoalsList = document.querySelector(goalsDivId);
    htmlGoalsList.innerHTML = '';
    if (goalsList !== undefined) {
        for (let i = 0; i < goalsList.length; i++) {
            const newGoal = document.createElement('goals-entry');

            // sets attributes for the goals-entry (this includes setting
            // the json of the goal to be the actual goal object itself
            // and the index so that we can later identify exactly which
            // goal is being edited from the goalJson object in
            // goalListenerSetup())
            newGoal.setAttribute('goalJson', JSON.stringify(goalsList[i]));
            newGoal.setAttribute('index', JSON.stringify(i));
            newGoal.entry = goalsList[i];
            newGoal.index = i;

            htmlGoalsList.append(newGoal);
        }
    }
}

/**
 * Submit goal to db and render it under monthly/yearly goal
 * @param {Object} goalObj - The goal object that we need to update
 * @param {String} goalDivId - The id of the div that contains the goals for
 * which event listener we want to setup
 * @param {Function} callback - This callback strictly updates the backend for
 * the monthly and yearly goals
 */
function submitGoal(goalObj, goalDivId, callback) {
    const popup = document.getElementById('calendar-popup');
    const popup_text = document.getElementById('calendar-popup-text');
    const input_value = popup_text.value;
    popup_text.value = '';
    let newGoalTxt = input_value;

    if (newGoalTxt === undefined || newGoalTxt === '') {
        return;
    }

    if (!('goals' in goalObj)) {
        goalObj.goals = [];
    }

    // hide and reset popup
    popup.style.display = 'none';
    const popup_submit = document.getElementById('submit-note');
    popup_submit.style.backgroundColor = '#a9c7bf';

    goalObj.goals.push({ text: newGoalTxt, done: false });
    callback(goalObj);
    renderGoals(goalObj.goals, goalDivId);
}

/**
 * Dynamically generate calendar for current month
 * @param {String} dateStr - The date that we need to render the calendar for
 */
async function setupCalendar(dateStr = undefined) {
    const calTarget = document.querySelector('.calendar-div');

    // if date string is not defined render the current month for the current
    // year. otherwise, get the date object for the specified date from the
    // backend
    if (dateStr === undefined) {
        today = getCurrentDate();
    } else {
        today = getDateObj(`${dateStr}/1`);
    }

    var month = today.month - 1;
    var paddedMonth = today.month;
    var year = today.year;
    paddedDateStr = `${paddedMonth}/${year}`;

    // load the month and year objects from db
    monthObj = (await getMonthObj(paddedDateStr)) || {};
    monthObj.month = paddedDateStr;
    yearObj = { year: year, goals: (await getYearlyGoals(year)) || [] };

    addGoalListeners();
    renderGoals(monthObj.goals, '#monthGoal');
    renderGoals(yearObj.goals, '#yearGoal');

    var monthFirstDow = firstDow(month, year);

    // month title on top
    // the black background for the header
    let monthHeader = document.createElement('div');
    monthHeader.classList.add('calMonthHeader');

    // the month header that when clicked will open dropdown
    let monthLabel = document.createElement('p');
    monthLabel.classList.add('calMonthLabel');
    //the year header that when clicked will open dropdown
    monthLabel.innerText = MONTHS[month];

    let yearLabel = document.createElement('p');
    yearLabel.classList.add('calYearLabel');
    yearLabel.innerText = ' ' + year;
    monthLabel.onclick = function () {
        document.getElementById('dropdown').classList.toggle('show-content');
        document
            .getElementById('dropdown')
            .classList.toggle('dropdown-content');
    };

    yearLabel.onclick = function () {
        document
            .getElementById('year-dropdown')
            .classList.toggle('show-content');
        document
            .getElementById('year-dropdown')
            .classList.toggle('dropdown-content');
    };

    // month dropdown
    let monthDropdown = document.createElement('div');
    monthDropdown.classList.add('show-content');
    monthDropdown.id = 'dropdown';
    let monthSelect = document.createElement('ul');
    for (let m = 0; m < MONTHS.length; m++) {
        // setup names of MONTHS in dropdown
        let monthLink = document.createElement('li');
        monthLink.innerText = MONTHS[m];
        monthLink.classList.add('month-link');
        monthLink.onclick = function () {
            monthHeader.remove();
            weekdaysLabel.remove();
            daysField.remove();
            removeGoalListeners();
            setupCalendar(`${year}/${m + 1}`);
        };

        // add this month to list of MONTHS
        monthSelect.appendChild(monthLink);
    }

    monthDropdown.appendChild(monthSelect);

    // year dropdown
    let yearDropdown = document.createElement('div');
    yearDropdown.classList.add('show-content');
    yearDropdown.id = 'year-dropdown';
    let yearSelect = document.createElement('ul');
    for (let y = YEAR_START; y <= YEAR_END; y++) {
        let yearLink = document.createElement('li');
        yearLink.innerText = y;
        yearLink.classList.add('month-link');
        yearLink.onclick = function () {
            monthHeader.remove();
            weekdaysLabel.remove();
            daysField.remove();
            removeGoalListeners();
            setupCalendar(`${y}/${month + 1}`);
        };

        yearSelect.appendChild(yearLink);
    }
    yearDropdown.appendChild(yearSelect);

    monthHeader.appendChild(monthLabel);
    monthHeader.appendChild(yearLabel);
    monthHeader.appendChild(monthDropdown);
    monthHeader.appendChild(yearDropdown);
    calTarget.appendChild(monthHeader);

    // top bar of weekday names
    let weekdaysLabel = document.createElement('ul');
    weekdaysLabel.classList.add('calWeekdaysLabel');
    for (let i = 0; i < WEEKDAYS.length; i++) {
        let weekday = document.createElement('li');
        weekday.innerText = WEEKDAYS[i];
        weekday.classList.add('calWeekday');
        weekdaysLabel.appendChild(weekday);
    }

    calTarget.appendChild(weekdaysLabel);

    // all the little days
    let daysField = document.createElement('ul');
    daysField.classList.add('calDaysField');
    let endDay = daysInMonth(month, year);

    // fake days for padding
    // empty tiles for padding
    for (let i = 0; i < monthFirstDow; i++) {
        let blankDay = document.createElement('li');
        blankDay.classList.add('calDay');
        blankDay.classList.add('calBlankDay');
        blankDay.style.cursor = 'default';
        blankDay.innerText = '';
        daysField.appendChild(blankDay);
    }

    let current = new Date();
    // real days
    for (let i = 1; i <= endDay; i++) {
        let day = document.createElement('a');
        day.classList.add('calDay');
        day.innerText = i;
        // link to daily overview
        const mm = monthNumber(month);
        const dd = dayNumber(i);
        const yr = year;
        const href = `${DAY_OV_LINK}?date=${yr}/${mm}/${dd}`;
        day.addEventListener('click', () => {
            window.location.href = href;
        });

        // check if today (so we can highlight it)
        if (
            i == current.getDate() &&
            current.getMonth() == month &&
            current.getFullYear() == year
        ) {
            day.classList.add('calToday');
        }

        let dayNotes = document.createElement('div');
        dayNotes.classList.add('day-notes');
        if (dd in monthObj && 'bullets' in monthObj[dd]) {
            const numTasks = monthObj[dd].bullets.length;
            if (numTasks == 1) {
                dayNotes.innerText = `${numTasks} Task`;
            } else {
                dayNotes.innerText = `${numTasks} Tasks`;
            }
        }

        day.appendChild(dayNotes);

        daysField.appendChild(day);
    }

    // pad with more fake days at the end
    let monthLastDow = lastDow(month, year);
    for (let i = monthLastDow; i < 6 && i >= 0; i++) {
        let blankDay = document.createElement('li');
        blankDay.classList.add('calDay');
        blankDay.classList.add('calBlankDay');
        blankDay.style.cursor = 'default';
        blankDay.innerText = '';
        daysField.appendChild(blankDay);
    }

    calTarget.append(daysField);
    loadTheme();
}
