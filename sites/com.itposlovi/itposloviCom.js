const puppeteer = require('puppeteer');
const saver = require('../../utils/saver');
const insertIntoDatabase = require('../../utils/dbConfig');
const fromString = require('uuidv4').fromString;
const jobs = [];

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        const url = 'http://it-poslovi.com/';
        await page.goto(url);

        console.log(`scraping: ${url}`);

        const jobsURL = await page.evaluate(() => {
            const urls = [];
            const jobLinks = document.querySelectorAll('h3 a');

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
                const stucturedData = {
                    title: document.querySelector('div.leftContent h2') ?
                        document.querySelector('div.leftContent h2').innerText : '',
                    position: '',
                    hiringOrganization: {
                        name: document.querySelector('ul:nth-child(1) li:nth-child(1) a') ?
                            document.querySelector('ul:nth-child(1) li:nth-child(1) a').innerText : '',
                        sameAs: document.querySelector('ul:nth-child(1) li:nth-child(1) a').href || ''
                    },
                    validThrough: '',
                    datePosted: document.querySelector('div.oglasTop small') ?
                        document.querySelector('div.oglasTop small').innerText : '',
                    employmentType: document.querySelector('div.oglasTop ul:nth-child(2) li:nth-child(2)') ?
                        document.querySelector('div.oglasTop ul:nth-child(2) li:nth-child(2)').innerText.split(':')[1].trim() : '',
                    jobLocation: {
                        address: {
                            addressLocality: document.querySelector('div.oglasTop ul:nth-child(1) li:nth-child(2)') ?
                                document.querySelector('div.oglasTop ul:nth-child(1) li:nth-child(2)').innerText.split(':')[1].trim() : '',
                            addressCountry: '',
                            addressRegion: ''
                        }
                    },
                    responsibilities: '',
                    jobRole: '',
                    baseSalary: '',
                    equityOffered: '',
                    description: document.querySelector('div.leftContent p:nth-child(5)') ?
                        document.querySelector('div.leftContent p:nth-child(5)').innerText : '',
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
                return [stucturedData, unstructuredData];
            });
            try {
                details[0]._id = fromString(JSON.stringify(details[0]));
                await insertIntoDatabase('itposlovi.com_stuctured', details[0]);

                details[1]._id = fromString(JSON.stringify(details[1]));
                await insertIntoDatabase('itposlovi.com_unstructured', details[1]);
            } catch (e) {
                if (e.message.includes('E11000 duplicate key error collection:')) {
                    continue;
                } else {
                    throw e;
                }
            }
            // jobs.push(details[0]);
            // await saver.saveToJSON(jobs, './sites/com.itposlovi/data/itposloviCom.json');
        }
        await page.close();
        await browser.close();
    } catch (error) {
        console.log(error);
    }
})();


