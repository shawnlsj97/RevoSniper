// The following program is used to helps users to secure their Revolution spin class spots with their favourite bikes. If the booking is available, it will be made immediately, otherwise it will be scheduled at the exact time in the future when it will be available.
// Language used: Javascript
// Libraries used: Puppeteer, Line Reader, Commander, Node Schedule

const puppeteer = require('puppeteer');
const lineReader = require('line-reader');
const { program } = require('commander');
const schedule = require('node-schedule');

const url = "https://revolution.com.sg/reserve#/account"

async function initBrowser(browser) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const title = await page.title();
    console.log("Loaded page: " + title);
    return page;
}

async function userLogin(page) {
    try {
        var email = "";
        var password = "";
        console.log("Obtaining user credentials...");
        lineReader.eachLine('credentials.txt', function (line) {
            var input = line.split(":").map(function (item) {
                return item.trim();
            })
            if (input[0] == "email") {
                email = input[1];
            } else if (input[0] == "password") {
                password = input[1];
            }
        })

        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Entering user credentials...");
        if (email == "" || password == "") {
            throw "ERROR: Error in credentials provided. Please check that you have updated credentials.txt with your correct email and password!"
        }
        // difficulty with Revolution's webpage is the use of iframes throughout the entire class booking pages
        var frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
        var frame = await frameHandle.contentFrame();
        await frame.waitForSelector('#username');
        await frame.type('#username', email);
        await frame.waitForSelector('#password');
        await frame.type('#password', password);
        await page.waitForTimeout(1000);
        page.keyboard.press('Enter');
    } catch (err) {
        throw err;
    }
}

async function reserveClass(page, options, diffDays) {
    try {
        const date = options.date;
        const time = options.time;
        const location = options.location;
        const bikes = options.bikes;
        var frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
        var frame = await frameHandle.contentFrame();
        const element = await frame.$("ul > li:nth-child(2) > a");
        await frame.evaluate(el => el.click(), element);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (diffDays == 7) { // navigate to next week
            frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
            frame = await frameHandle.contentFrame();
            const element = await frame.$("#reserveweeknav > li.next > a");
            await frame.evaluate(el => el.click(), element);
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
        frame = await frameHandle.contentFrame();
        // find class using date, time and location
        // filter by location first
        console.log("Filtering classes by location...")
        switch (location) {
            case "cecil": {
                let locale = await frame.$("#reserveFilterSites > ul > li:nth-child(1) > a");
                await frame.evaluate(el => el.click(), locale);
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                break;
            }
            case "orchard": {
                let locale = await frame.$("#reserveFilterSites > ul > li:nth-child(2) > a");
                await frame.evaluate(el => el.click(), locale);
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                break;
            }
            case "tanjong": {
                let locale = await frame.$("#reserveFilterSites > ul > li:nth-child(3) > a");
                await frame.evaluate(el => el.click(), locale);
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                break;
            }
            default:
                throw "ERROR: Invalid location provided. Make sure location is cecil / orchard / tanjong!"
        }
        // use date to select column
        // find column
        console.log("Selecting class...");
        frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
        frame = await frameHandle.contentFrame();
        const allDates = await frame.$$eval('#reserve > thead > tr > td > span.thead-date', ths => ths.map((th) => {
            return th.innerText;
        }));
        var idx = -1;
        const desiredDate = date.substring(0, 2) + "." + date.substring(2, 4);
        for (let i = 0; i < allDates.length; i++) {
            if (allDates[i] == desiredDate) {
                idx = i;
                break;
            }
        }
        // get all classes in a column
        const allClassesInDay = await frame.$$('#reserve > tbody > tr > td.day' + idx + ' > div');
        // then use time to select class
        const desiredTime = convert24hTo12h(time);
        var foundClass = false;
        var instrName = "";
        for (let i = 0; i < allClassesInDay.length; i++) {
            instrName = await allClassesInDay[i].$eval("span.scheduleInstruc", n => n.innerText);
            const classTime = await allClassesInDay[i].$eval("span.scheduleTime", ct => (ct.innerText).split('\n')[0]);
            if (classTime == desiredTime) {
                foundClass = true;
                console.log("Selected class by " + instrName + " at " + classTime);
                await allClassesInDay[i].$eval("a", a => a.click());
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                break;
            }
        }
        if (!foundClass) {
            throw "ERROR: Unable to find class at " + time + " on " + date + " @ " + location + ". Please check provided date, time and location!"
        }
        frameHandle = await page.waitForSelector('#zingfit-embed > iframe');
        frame = await frameHandle.contentFrame();
        // select bike using loop, if successful, break
        console.log("Selecting bike...");
        // check classname for "Enrolled"
        var foundBike = false;
        for (let i = 0; i < bikes.length; i++) {
            var bikeNum = bikes[i];
            console.log("Trying bike " + bikeNum + "...");
            const enrolled = await frame.$eval('#spotcell' + bikeNum, e => e.className);
            if (enrolled.toLowerCase().includes("enrolled")) {
                console.log("Bike " + bikeNum + " is occupied");
                continue;
            } else {
                console.log("Bike " + bikeNum + " is available");
                foundBike = true;
                await frame.$eval("#spotcell" + bikeNum, a => a.click());
                break;
            }
        }
        if (!foundBike) {
            throw "ERROR: Unable to find any available bikes for class by " + instrName + " at " + time + " on " + date + " @ " + location + ". Please provide different bike numbers!"
        } else {
            console.log("SUCCESS! You have secured bike " + bikeNum + " for class by " + instrName + " at " + time + " on " + date + " @ " + location + ".");
        }
    } catch (err) {
        throw err;
    }
}

function convert24hTo12h(time) {
    var timeString = time;
    var H = timeString.substr(0, 2);
    var h = H % 12 || 12;
    var ampm = (H < 12 || H === 24) ? "AM" : "PM";
    timeString = h + ":" + timeString.substr(2, 2) + " " + ampm;
    return timeString;
}

async function reserve(options, diffDays) {
    // proceed with webpage interaction
    const browser = await puppeteer.launch({ headless: false, handleSIGINT: true }); // for testing
    try {
        const page = await initBrowser(browser);
        await userLogin(page);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await reserveClass(page, options, diffDays);
    } catch (err) {
        console.log(err);
        browser.close();
    } finally {
        browser.close();
    }
}

async function main() {
    // handle command line args 
    program
        .version('0.0.1')
        .requiredOption('-d, --date <date>', 'class date')
        .requiredOption('-t, --time <time>', 'class time')
        .requiredOption('-l, --location <location>', 'cecil / orchard / tanjong')
        .requiredOption('-b, --bikes <bikes...>', 'bike numbers')
        .parse();

    const options = program.opts();

    // determine if booking window open or we have to schedule booking in the future
    const date = options.date;
    const day = parseInt(date.substring(0, 2), 10);
    const month = parseInt(date.substring(2, 4), 10) - 1;
    const year = parseInt(date.substring(4, 6)) + 2000;
    const wantedDate = new Date(year, month, day);
    const currDate = new Date();
    const diffDays = Math.ceil(Math.abs(wantedDate - currDate) / (1000 * 60 * 60 * 24));
    if (diffDays == 7) {
        if (currDate.getHours() >= 10 && currDate.getMinutes() >= 30) { // booking open
            reserve(options, diffDays);
        } else { // schedule class
            var futureDate = new Date(year, month, day, 10, 30);
            futureDate.setDate(futureDate.getDate() - 7);
            console.log("Class not available for booking yet, scheduling booking on " + futureDate.toString() + "...");
            schedule.scheduleJob(date, function () {
                reserve(options, diffDays)
            });
        }
    } else if (diffDays > 7) { // schedule class
        var futureDate = new Date(year, month, day, 10, 30);
        futureDate.setDate(futureDate.getDate() - 7);
        console.log("Class not available for booking yet, scheduling booking on " + futureDate.toString() + "...");
        schedule.scheduleJob(date, function () {
            reserve(options, diffDays)
        });
    } else { // book now
        reserve(options, diffDays);
    }
}

// for graceful shutdown
process.on('SIGINT', () => {
    process.exit();
});

main();