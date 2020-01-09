const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')());

const saver = require('../../utils/saver');
const options = require('../../utils/userAgent').options;
const database = require('../../utils/dbConfig');
const fromString = require('uuidv4').fromString;

const jobs = [];
let date = Date.now();

( async () => {
    try {
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        let url = 'https://rs.jooble.org/posao-it/Srbija?p=1';

        let jobsOnPage = await evaluatePage(page, url);

        while (jobsOnPage.length > 0) {
            const nextPageNumber = parseInt(url.match(/p=(\d+$)/)[1]) + 1;
            const nextUrl = `https://rs.jooble.org/posao-it/Srbija?p=${nextPageNumber}`;

            jobsOnPage = await evaluatePage(page, nextUrl);

            url = nextUrl;
        }
        console.log((Date.now() - date) / 1000 / 60);
        await browser.close();

    } catch (err) {
        console.log(err);
    }
})();

async function evaluatePage(page, url) {
    await page.goto(url);
    console.log(`scraping: ${url}`);
    
    const jobsURL = await page.evaluate(() => {
        const jobLinks = document.querySelectorAll('div div.top-wr a');
        const urls = [];
        for (let i = 0; i < jobLinks.length; i++) {
            const jobURL = jobLinks[i].href;
            urls.push(jobURL);
        }
        return urls;
    });

    for (let i = 0; i < jobsURL.length; i++) {
        await page.goto(jobsURL[i]);

        const details = await page.evaluate(() => {
            const data = {
                title: document.querySelector('div.vacancy-desc_info h1') ? 
                document.querySelector('div.vacancy-desc_info h1').innerText : '',
                position: '',
                hiringOrganization: {
                    name: document.querySelector('tr:nth-child(1) td.value-column') ? 
                    document.querySelector('tr:nth-child(1) td.value-column').innerText : '',
                    sameAs: ''
                },
                validThrough: '',
                datePosted: '',
                employmentType: '',
                jobLocation: {
                    address: {
                        addressLocality: document.querySelector('tr:nth-child(2) td.value-column') ? 
                        document.querySelector('tr:nth-child(2) td.value-column').innerText : '',
                        addressRegion: '',
                        addressCountry: ''
                    }
                },
                responsibilities: '',
                jobRole: '',
                baseSalary: '',
                equityOffered: '',
                description: document.querySelector('div.vacancy-desc_text_wrapper') ?
                document.querySelector('div.vacancy-desc_text_wrapper').innerText : '',
                language: '',
                skillRequirements: '',
                educationRequirements: '',
                experienceRequirements: '',
                skillLevel: '',
                jobStartDate: '',
                jobEndDate: '',
                jobLocationType: '',
                proxyOrganization: '',
                zamphyrLevel: '',
                workHours: '',
                industry: '',
                eligibleRegion: '',
                relocationOffered: '',
                jobBenefits: ''
            }
            return data;
        });
        details.id = fromString(JSON.stringify(details));
        jobs.push(details);
        await saver.saveToJSON(jobs, './sites/com.jooble/data/jooble.json');
        // await database('jooble', details);
    }
    return jobsURL;
}