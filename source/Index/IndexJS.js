let collapsible_years_list = document.getElementsByClassName('coll_yr_button');

window.addEventListener('load', () => {
    //gets the session, if the user isn't logged in, sends them to login page
    let session = window.sessionStorage;
    console.log('here is storage session', session);
    if (session.getItem('loggedIn') !== 'true') {
        window.location.href = '../Login/Login.html';
    }
    // getting backend sample day
    // eslint-disable-next-line no-undef
    let dbPromise = initDB();
    dbPromise.onsuccess = function (e) {
        console.log('database connected');
        // eslint-disable-next-line no-undef
        setDB(e.target.result);
        // eslint-disable-next-line no-undef
        let req = getSettings();
        req.onsuccess = function (e) {
            let settingObj = e.target.result;
            console.log('setting initial theme');
            document.documentElement.style.setProperty(
                '--bg-color',
                settingObj.theme
            );
            setSelected(document.querySelector('#themes'), settingObj.theme);
        };
    };
});

/**
 * Sets the theme dropdown index choice as selected based on input value
 * @param {Object} select - the select object
 * @param {string} val - the value of the option to select
 * @returns void
 */
function setSelected(select, val) {
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value == val) {
            select.options[i].selected = true;
            break;
        }
    }
    return;
}

/**
 * Shows or hides collapsible_child of button
 * @returns void
 */
function collapsible_year_toggle() {
    this.classList.toggle('active');
    let target_year = this.id.substring(0, 4);
    let target = document.getElementById(target_year + '_months');
    if (target.style.display === 'flex') {
        target.style.display = 'none';
        this.innerText = '>';
    } else {
        target.style.display = 'flex';
        this.innerText = 'v';
    }
}

for (let i = 0; i < collapsible_years_list.length; i++) {
    collapsible_years_list[i].addEventListener(
        'click',
        collapsible_year_toggle
    );
}

// changes global color theme
document.querySelector('#themes').addEventListener('change', () => {
    // eslint-disable-next-line no-undef
    let req = getSettings();
    req.onsuccess = function (e) {
        console.log('got settings');
        console.log(e.target.result);
        let settingObj = e.target.result;
        settingObj.theme = document.querySelector('#themes').value;
        document.documentElement.style.setProperty(
            '--bg-color',
            settingObj.theme
        );
        // eslint-disable-next-line no-undef
        updateSettings(settingObj);
    };
});
