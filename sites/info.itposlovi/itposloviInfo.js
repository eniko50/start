const puppeteer = require('puppeteer');
const saver = require('../../utils/saver');
const database = require('../../utils/dbConfig');

const jobs = [];
const fromString = require('uuidv4').fromString;

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        const url = 'http://www.itposlovi.info/poslovi/all/';
        await page.goto(url);

        console.log(`scraping: ${url}`);

        const jobsURL = await page.evaluate(() => {
            const urls = [];
            const jobLinks = document.querySelectorAll('#job-listings div div div.col-md-10 div a');

            for (let i = 0; i < jobLinks.length; i++) {
                urls.push(jobLinks[i]['href']);
            }

            return urls;
        });

        for (let i = 0; i < jobsURL.length; i++) {
            await page.goto(jobsURL[i]);

            const details = await page.evaluate(() => {
                const data = {
                    title: document.querySelector('#job h4') ? 
                    document.querySelector('#job h4').innerText : '',
                    position: '',
                    hiringOrganization: {
                        name: document.querySelector('#job span').children[0] ?
                        document.querySelector('#job span').children[0].innerText : '',
                        sameAs: document.querySelector('#job span').children[0] ?
                        document.querySelector('#job span').children[0].href : '', 
                    },
                    validThrough: '',
                    datePosted: '',
                    employmentType: '',
                    jobLocation: {
                        address: {
                            adressLocality: '',
                            addressCountry: '',
                            addressRegion: ''
                        }
                    },
                    responsibilities: '',
                    jobRole: '',
                    baseSalary: '',
                    equityOffered: '',
                    description: document.querySelector('.job-description') ?
                    document.querySelector('.job-description').innerText : '',
                    language: '',
                    skillRequirements: '',
                    educationRequirements: '',
                    experienceRequirements: '',
                    skillLevel: '',
                    jobStartDate: '',
                    jobEndDate: '',
                    jobLocationType: document.querySelector('#job span') ?
                    document.querySelector('#job span').innerText.match(/\(.+\)/g) ?
                        document.querySelector('#job span').innerText.match(/\(.+\)/g)[0].replace(/[\(\)]/g, '') : '' : '',
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
            await saver.saveToJSON(details, './sites/info.itposlovi/data/itposloviInfo.json')
            // await database('itposloviInfo', details);
        }
        await browser.close();

    } catch (err) {
        console.log(err);
    }
})();

