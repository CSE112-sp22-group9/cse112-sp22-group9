/* eslint-disable */
/*
describe('Google', () => {
    beforeAll(async () => {
        await page.goto('https://google.com');
    });

    it('should display "google" text on page', async () => {
        await expect(page).toMatch('google');
    });
});
*/

/**
 * Note on developing/testing vs deployment testing
 *
 * Since this suite of tests is run automatically run on push to the testing branch, the URL needs to change
 * on local testing with liveserver vs the testing URL can swap between the URL variable
 * Need to also change the original url in the 'beforeAll' statement, everything else should be ok
 *
 */
describe('basic navigation for BJ', () => {
    // change link to deployment site and for local testing
    // on localhost would need to append path, on deployment don't need to

    /* comment/switch the 2 following lines of code to switch between testing deployment and local*/
    //const URL = 'http://127.0.0.1:5500/source';
    const URL = 'https://testing-stegosource-9lives.web.app';
    const MONTHNAMES = [
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

    beforeAll(async () => {
        // on localhost would need to append path, on deployment don't need to

        /* swap/uncomment the 2 lines below to switch between going to deployed site vs local */
        //await page.goto(URL + '/Login/Login.html');
        await page.goto(URL);

        await page.waitForTimeout(500);
    });

    it('Test1: Initial Home Page - Shows create your login ', async () => {
        const headerText = await page.$eval('#title', (header) => {
            return header.innerHTML;
        });
        expect(headerText).toBe('Login to your Account');
    });

    it('Test2: create an account and login - shows weekly page ', async () => {
        jest.setTimeout(30000);

        await page.$eval('#email', (usernameInput) => {
            // test email
            usernameInput.value = 'test@gmail.com';
        });

        await page.$eval('#pin', (passwordInput) => {
            passwordInput.value = 'test123';
        });

        await page.$eval('#login-button', (button) => {
            button.click();
        });

        // need to give page time to login
        await page.waitForTimeout(1000);

        const url = await page.evaluate(() => location.href);
        expect(url).toMatch(URL + '/WeeklyOverview/WeeklyOverview.html');
    });

    it('Test6: at weekly screen, make sure header day is the current day', async () => {
        const currentDateStr = await page.$eval(
            '#header_date',
            (dateHeader) => {
                return dateHeader.innerHTML;
            }
        );

        let currentDate = new Date();

        //kinda too lazy to build the string
        let boolDay = currentDateStr.indexOf(`${currentDate.getDate()}`) > -1;
        let boolMonth =
            currentDateStr.indexOf(`${MONTHNAMES[currentDate.getMonth()]}`) >
            -1;
        let boolYear =
            currentDateStr.indexOf(`${currentDate.getFullYear()}`) > -1;

        expect(`${boolDay && boolMonth && boolYear}`).toMatch('true');
    });

    // copied from old
    it('Test7: click on "Go to current day daily overview", should go to day with correct date heading', async () => {
        await page.$eval('#header_date', (btn) => {
            btn.click();
        });
        await page.waitForTimeout(300);

        const currentDateStr = await page.$eval('#date', (dateHeader) => {
            return dateHeader.innerHTML;
        });

        let currentDate = new Date();

        //kinda too lazy to build the string
        let boolDay = currentDateStr.indexOf(`${currentDate.getDate()}`) > -1;
        let boolMonth =
            currentDateStr.indexOf(`${currentDate.getMonth() + 1}`) > -1;
        let boolYear =
            currentDateStr.indexOf(`${currentDate.getFullYear()}`) > -1;

        expect(`${boolDay && boolMonth && boolYear}`).toMatch('true');
    });

    // new implementation doesn't encode URL when visiting directly from the weekly (not from calendar)
    it('Test8: current date URL should be correct', async () => {
        const url = await page.evaluate(() => location.href);

        expect(url).toMatch(URL + '/DailyOverview/DailyOverview.html');
    });

    // can no longer assume the contents of of the cells are empty?
    // there exists a few old tests which check to make sure boxes are empty
    // this may not apply anymore since there could be preexisting stuff

    it('Test14: add a bullet to TODO, check length', async () => {
        const entryLengthPrev = await page.$eval('#bullets', (bullets) => {
            return bullets.childNodes.length;
        });

        await page.$eval('.entry-form-text', (bulletEntry) => {
            bulletEntry.value = 'pull an all-nighter';
        });

        await page.waitForTimeout(300);

        await page.$eval('.entry-form-button', (button) => {
            button.click();
        });

        const entryLength = await page.$eval('#bullets', (bullets) => {
            return bullets.childNodes.length;
        });

        expect(`${entryLength == entryLengthPrev + 1}`).toMatch('true');
    });

    /*
    // TODO FIX
    // CHECK TO MAKE SURE THE BULLET appears in the weekly
    it('Test15: making a bullet in the daily should appear in the weekly', async () => {

		// go back to weekly
        await page.$eval('#home', (button) => {
            button.click();
        });

        await page.waitForTimeout(5000);

		let flag = false;
		// check weekly preview
        await page.$eval('#weekly_list', (list) => {
			// returns a HTMLCollection, iterable
			prev = list.children;
			console.log(prev);
			for (const child of prev){
				flag = true;
				text = child.innerHTML;
				console.log(text);
				if (text == 'pull an all-nighter') {
					flag = true;
					break;
				}
			}
        });


        expect(`${flag}`).toMatch('true');
    });
    */

    it('Test15: edit a bullet in TODO', async () => {
        // go back to daily page
        await page.$eval('#header_date', (btn) => {
            btn.click();
        });
        await page.waitForTimeout('300');

        /*
         * .on adds an event listener to the 'dialog' event,
         * since there are other functions that get called previously, we want to get
         * rid of those using removeAllListeners and add the one we want for
         * this particular test case
         */

        page.removeAllListeners('dialog');
        page.on('dialog', async (dialog) => {
            await dialog.accept('Finish 150b Final');
        });

        await page.$eval('bullet-entry', (bulletList) => {
            return bulletList.shadowRoot.querySelector('#edit').click();
        });

        await page.waitForTimeout('300');

        let bulletText = await page.$eval('bullet-entry', (bulletList) => {
            return bulletList.shadowRoot.querySelector('.bullet-content')
                .innerHTML;
        });

        expect(bulletText).toMatch('Finish 150b Final');
    });

    it('Test16: add a child bullet in TODO', async () => {
        page.removeAllListeners('dialog');
        page.on('dialog', async (dialog) => {
            await dialog.accept('Remember to fill out CAPES');
        });

        await page.$eval('bullet-entry', (bulletList) => {
            //clicks "add" for the bullet
            bulletList.shadowRoot.querySelector('#add').click();
        });

        await page.waitForTimeout('300');

        let bulletChildren = await page.$eval('bullet-entry', (bulletList) => {
            //gets the length of how many children the bullet has
            return bulletList.shadowRoot.querySelector('.child').children
                .length;
        });

        expect(`${bulletChildren}`).toMatch('1');
    });

    it('Test17: child bullet has correct text', async () => {
        let bulletChildText = await page.$eval('bullet-entry', (bulletList) => {
            //gets the content of the child bullet
            return bulletList.shadowRoot.querySelector('.child > bullet-entry')
                .entry.content;
        });

        expect(bulletChildText).toMatch('Remember to fill out CAPES');
    });

    it('Test18: mark child done bullet in TODO', async () => {
        await page.$eval('bullet-entry', (bulletList) => {
            //clicks "done" for the child bullet
            return bulletList.shadowRoot
                .querySelector('.child > bullet-entry')
                .shadowRoot.querySelector('#done')
                .click();
        });

        let bulletChildDecor = await page.$eval(
            'bullet-entry',
            (bulletList) => {
                //gets the style of the text of the child bullet
                return bulletList.shadowRoot
                    .querySelector('.child > bullet-entry')
                    .shadowRoot.querySelector('.bullet-content').style
                    .textDecoration;
            }
        );

        expect(bulletChildDecor).toMatch('line-through');
    });

    it('Test19: delete a child bullet in TODO', async () => {
        await page.$eval('bullet-entry', (bulletList) => {
            //gets the child bullet and deletes it
            return bulletList.shadowRoot
                .querySelector('.child > bullet-entry')
                .shadowRoot.querySelector('#delete')
                .click();
        });

        await page.waitForTimeout('300');

        // children of the parent should be 0 (we just deleted it)
        const entryLength = await page.$eval('bullet-entry', (bullets) => {
            //gets how many children the bullet has
            return bullets.shadowRoot.querySelector('.child').childNodes.length;
        });

        expect(`${entryLength}`).toMatch('0');
    });

    /**
     * add a child bullet, delete top level, both should disappear
     */
    it('Test20a: add a child bullet in TODO, delete parent pt1', async () => {
        page.removeAllListeners('dialog');
        page.on('dialog', async (dialog) => {
            await dialog.accept('Remember to fill out TA CAPES');
        });

        await page.$eval('bullet-entry', (bulletList) => {
            //clicks "add" for the bullet
            bulletList.shadowRoot.querySelector('#add').click();
        });

        await page.waitForTimeout('300');

        let bulletChildren = await page.$eval('bullet-entry', (bulletList) => {
            //gets the length of how many children the bullet has
            return bulletList.shadowRoot.querySelector('.child').children
                .length;
        });

        expect(`${bulletChildren}`).toMatch('1');
    });

    it('Test20b: add a child bullet in TODO, delete parent pt2', async () => {
        // deleting a bullet should decrease to it's original
        let bulletChildrenLenPrev = await page.$eval(
            '#bullets',
            (bulletList) => {
                //gets the length of how many children the bullet has
                return bulletList.childNodes.length;
            }
        );
        await page.$eval('bullet-entry', (bulletList) => {
            //clicks "delete" for the parent bullet
            bulletList.shadowRoot.querySelector('#delete').click();
        });

        await page.waitForTimeout('300');

        let bulletChildrenLen = await page.$eval('#bullets', (bulletList) => {
            //gets the length of how many children the bullet has
            return bulletList.childNodes.length;
        });

        expect(`${bulletChildrenLen == bulletChildrenLenPrev - 1}`).toMatch(
            'true'
        );
    });

    it('Test21: adding notes shows up', async () => {
        await page.$eval('note-box', (notebox) => {
            //note box text
            notebox.shadowRoot.querySelector('.noteContent').innerHTML =
                'pickup amazon package from locker';
        });

        await page.waitForTimeout('300');

        let noteText = await page.$eval('note-box', (notebox) => {
            //gets text from note box
            return notebox.shadowRoot.querySelector('.noteContent').value;
        });

        /**
         * This doesn't actually save the text, need to click the save button
         */

        expect(noteText).toMatch('pickup amazon package from locker');
    });

    it('Test22: clicking save notes, refreshing notes will still be there', async () => {
        await page.$eval('#notes-save', (btn) => {
            btn.click();
        });

        await page.waitForTimeout('300');

        page.reload();

        // timeout for refresh
        await page.waitForTimeout('2000');

        let noteText = await page.$eval('note-box', (notebox) => {
            //gets text from note box
            return notebox.shadowRoot.querySelector('.noteContent').value;
        });

        /**
         * This doesn't actually save the text, need to click the save button
         */

        expect(noteText).toMatch('pickup amazon package from locker');
    });

    it('Test23: clicking home, goes back to home', async () => {
        await page.$eval('#home', (house) => {
            house.click();
        });

        await page.waitForTimeout('300');

        const url = await page.evaluate(() => location.href);
        expect(url).toMatch(URL + '/WeeklyOverview/WeeklyOverview.html');
    });

    it('Test24: at weekly screen, make sure top header date is still the current day', async () => {
        const currentDateStr = await page.$eval(
            '#header_date',
            (dateHeader) => {
                return dateHeader.innerHTML;
            }
        );

        let currentDate = new Date();

        //kinda too lazy to build the string
        let boolDay = currentDateStr.indexOf(`${currentDate.getDate()}`) > -1;
        let boolMonth =
            currentDateStr.indexOf(`${MONTHNAMES[currentDate.getMonth()]}`) >
            -1;
        let boolYear =
            currentDateStr.indexOf(`${currentDate.getFullYear()}`) > -1;

        expect(`${boolDay && boolMonth && boolYear}`).toMatch('true');
    });

    /**
     * idea for pipeline, try to make the tests point to the testing URL
     * but wait until after the testing URl deploys then point to the URL and run the tests
     *
     */

    it('Test23: notes on weekly should be same', async () => {
        let noteText = await page.$eval('note-box', (notebox) => {
            //gets text from note box
            return notebox.shadowRoot.querySelector('.noteContent').value;
        });

        expect(noteText).toMatch('pickup amazon package from locker');
    });

    // clicking on calender, calender preview checks
    it('Test28: clicking on calender brings you to calendar page', async () => {
        await page.$eval('#header_calendar_button', (calDiv) => {
            // extracts image to click on
            calDiv.children[0].click();
        });

        const url = await page.evaluate(() => location.href);
        expect(url).toMatch(URL + '/Calendar/Calendar.html');
    });

    // clicking on calender, calender preview checks
    it('Test29: month match the current one', async () => {
        await page.waitForTimeout('300');
        const currMonth = await page.$eval('.calMonthLabel', (month) => {
            return month.innerHTML;
        });

        let currentDate = new Date();
        let month = MONTHNAMES[currentDate.getMonth()];
        expect(`${currMonth == month}`).toMatch('true');
    });

    it('Test30: year match the current one', async () => {
        await page.waitForTimeout('300');
        const currYear = await page.$eval('.calYearLabel', (month) => {
            return month.innerHTML;
        });

        let currentDate = new Date();
        let year = currentDate.getFullYear();
        expect(`${currYear == year}`).toMatch('true');
    });

    it('Test31: current highlighted day is current day', async () => {
        await page.waitForTimeout('300');
        const dayText = await page.$eval('.calToday', (day) => {
            return day.innerHTML;
        });

        let currentDate = new Date();
        let day = currentDate.getDate();

        let boolDay = dayText.indexOf(day) == 0;

        expect(`${boolDay}`).toMatch('true');
    });

    // Could do: create yearly/monthly goals, check
});
