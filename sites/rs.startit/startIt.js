const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')());
const saver = require('../../utils/saver');
const fromString = require('uuidv4').fromString;

const options = require('../../utils/userAgent').options;
const insertIntoDatabase = require('../../utils/dbConfig');
let date = Date.now();

let jobs = [];

(async () => {
    try {
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        let url = 'https://startit.rs/poslovi/page/1/';

        let jobsOnPage = await evaluatePage(page, url);

        while (jobsOnPage.length > 0) {
            const nextPageNumber = parseInt(url.match(/\d+/)[0]) + 1;
            const nextUrl = `https://startit.rs/poslovi/page/${nextPageNumber}/`;

            jobsOnPage = await evaluatePage(page, nextUrl);

            url = nextUrl;
        }
        console.log((Date.now() - date) / 1000 / 60);

        await browser.close();

    } catch (error) {
        console.log(error);
    }
})();

async function evaluatePage(page, url) {
    await page.goto(url);
    console.log(`scraping: ${url}`);

    const jobsURL = await page.evaluate(() => {
        const jobLinks = document.querySelectorAll('#poslovi-listing div div div h1 a');
        const urls = [];
        for (let i = 0; i < jobLinks.length; i++) {
            const jobURL = jobLinks[i]['href'];
            urls.push(jobURL);
        }
        return urls;
    });

    for (let i = 0; i < jobsURL.length; i++) {

        if (!jobsURL[i].endsWith('.pdf')) {
            await page.goto(jobsURL[i]);

            const details = await page.evaluate(async (currentUrl) => {
                // let image = '';
                const unstructuredData = {};
                unstructuredData.HTML = document.querySelector('html').innerHTML;
                const structuredData = {
                    title: document.querySelector('#so-heading h1') ?
                        document.querySelector('#so-heading h1').innerText : '',
                    position: '',
                    hiringOrganization: {
                        name: document.querySelector('head meta:nth-child(21)') ?
                            document.querySelector('head meta:nth-child(21)').content.split(' | ')[1] : '',
                        sameAs: document.querySelector('#so-co-desc-text a') ?
                            document.querySelector('#so-co-desc-text a').href : ''
                    },
                    validThrough: document.querySelector('#so-co-ad-wrap p strong') ?
                        document.querySelector('#so-co-ad-wrap p strong').innerText.match(/\d+.\d+.\d+./g) ?
                            document.querySelector('#so-co-ad-wrap p strong').innerText.match(/\d+.\d+.\d+./g)[0] : '' : '',
                    datePosted: '',
                    employmentType: '',
                    jobLocation: {
                        address: {
                            addressLocality: document.querySelector('head meta:nth-child(21)') ?
                                document.querySelector('head meta:nth-child(21)').content.split(' | ')[2] : '',
                            addressCountry: '',
                            addressRegion: ''
                        }
                    },
                    responsibilities: '',
                    jobRole: '',
                    baseSalary: '',
                    equityOffered: '',
                    description: document.querySelector('#so-co-ad-wrap') ?
                        document.querySelector('#so-co-ad-wrap').innerText : document.body.innerText.trim(),
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
                return [structuredData, unstructuredData];
            }, jobsURL[i]);

            try {
                details[0]._id = fromString(JSON.stringify(details[0]));
                await insertIntoDatabase('startit_structured', details[0]);
                details[1]._id = fromString(JSON.stringify(details[1]));
                await insertIntoDatabase('startit_unstructured', details[1]);
            } catch (e) {
                if (e.message.includes('E11000 duplicate key error collection:')) {
                    continue;
                } else {
                    throw e;
                }
            }
            // jobs.push(details[0]);
            // await saver.saveToJSON(jobs, './sites/rs.startit/data/startit.json');

        } else {
            let fileName = jobsURL[i].split('/');
            fileName = fileName[fileName.length - 1].split('.')[0];
            await saver.downloadAsBlob(jobsURL[i], './sites/rs.startit/data/images/', fileName);
        }
    }
    return jobsURL;
}

