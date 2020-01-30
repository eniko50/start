const puppeteer = require('puppeteer');
const saver = require('../../utils/saver');
const insertIntoDatabase = require('../../utils/dbConfig');

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
                const unstructuredData = {};
                unstructuredData.HTML = document.querySelector('html').innerHTML;
                const structuredData = {
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
                return [structuredData, unstructuredData];
            });
            try {
                details[0]._id = fromString(JSON.stringify(details[0]));
                await insertIntoDatabase('itposlovi.info_structured', details[0]);
                details[1]._id = fromString(JSON.stringify(details[1]));
                await insertIntoDatabase('itposlovi.info_unstructured', details[1]);
            } catch (e) {
                if (e.message.includes('E11000 duplicate key error collection:')) {
                    continue;
                } else {
                    throw e;
                }
            }
            // jobs.push(details[0]);
            // await saver.saveToJSON(jobs, './sites/info.itposlovi/data/itposloviInfo.json')
        }
        await browser.close();

    } catch (err) {
        console.log(err);
    }
})();

