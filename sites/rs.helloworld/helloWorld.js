const puppeteer = require('puppeteer');
const saver = require('../../utils/saver');
const insertIntoDatabase = require('../../utils/dbConfig');
const jobs = [];
const fromString = require('uuidv4').fromString;

let date = Date.now();

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        let url = 'https://www.helloworld.rs/oglasi-za-posao/?page=0&tag=&remote=&cat=&show_more=1&senioritet=&vreme_postavljanja=&rok_konkursa=&jezik=';
        let jobsOnPage = await evaluatePage(page, url);

        while (jobsOnPage.length > 0) {
            const nextPageNumber = parseInt(url.match(/page=(\d+)/)[1]) + 15;
            const nextUrl = `https://www.helloworld.rs/oglasi-za-posao/?page=${nextPageNumber}&tag=&remote=&cat=&show_more=1&senioritet=&vreme_postavljanja=&rok_konkursa=&jezik=`;

            jobsOnPage = await evaluatePage(page, nextUrl);

            url = nextUrl;
        }

        console.log((Date.now() - date) / 1000 / 60);
        await page.close();
        await browser.close();

    } catch (error) {
        console.log(error);
    }
})();

async function evaluatePage(page, url) {
    await page.goto(url);
    console.log(`scraping: ${url}`);

    const jobsURL = await page.evaluate(() => {
        const jobLinks = Array.from(document.querySelectorAll('div.c-head h3 a'));
        const urls = [];
        for (let i = 0; i < jobLinks.length; i++) {
            const jobURL = jobLinks[i]['href'];
            urls.push(jobURL);
        }
        return urls;
    });

    for (let i = 0; i < jobsURL.length; i++) {
        await page.goto(jobsURL[i]);

        const details = await page.evaluate(async (currentUrl) => {
            let image = '';
            const unstructuredData = {};
            unstructuredData.HTML = document.querySelector('html').innerHTML;
            const structuredData = {
                title: document.querySelector('#fastedit_html_oglas h1') ?
                    document.querySelector('#fastedit_html_oglas h1').innerText.trim() :
                    document.querySelector('head > title') ? document.querySelector('head > title').innerText.split('| ')[0].trim() : ''.innerText.split('| ')[0].trim(),
                position: '',
                hiringOrganization: {
                    name: document.querySelector('span:nth-child(6) meta') ?
                        document.querySelector('span:nth-child(6) meta').content : '',
                    sameAs: ''
                },
                validThrough: document.querySelector('div:nth-child(11) div div:nth-child(8) strong') ?
                    document.querySelector('div:nth-child(11) div div:nth-child(8) strong').innerText : '',
                datePosted: document.querySelector('div:nth-child(11) div div:nth-child(6)') ?
                    document.querySelector('div:nth-child(11) div div:nth-child(6)').innerText : '',
                employmentType: '',
                jobLocation: {
                    address: {
                        addressLocality: document.querySelector('div div:nth-child(2) span strong') ?
                            document.querySelector('div div:nth-child(2) span strong').innerText : '',
                        addressCountry: '',
                        addressRegion: document.querySelector('div div:nth-child(2) span meta:nth-child(4)') ?
                            document.querySelector('div div:nth-child(2) span meta:nth-child(4)').content : ''
                    }
                },
                responsibilities: '',
                jobRole: '',
                baseSalary: '',
                equityOffered: '',
                description: document.querySelector('#fastedit_html_oglas') ?
                    document.querySelector('#fastedit_html_oglas')
                        .innerText.trim().replace(/Deadline for applications: \d+\.\d+\.\d+\./g, '') ?
                        document.querySelector('#fastedit_html_oglas').innerText.trim() :
                        document.querySelector('#fastedit_html_oglas img') ?
                            image = document.querySelector('#fastedit_html_oglas img').src : '' : '',
                language: '',
                skillRequirements: '',
                educationRequirements: '',
                experienceRequirements: '',
                skillLevel: document.querySelector('div:nth-child(11) div div:nth-child(4)') ?
                    document.querySelector('div:nth-child(11) div div:nth-child(4)').innerText.trim() : '',
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
            return [structuredData, unstructuredData, image];
        }, jobsURL[i]);

        if (details[2]) {
            let fileName = details[2].split('/');
            fileName = fileName[fileName.length - 1].split('.')[0];
            await saver.downloadAsBlob(details[2], './sites/rs.helloworld/data/images/', fileName);
        } else {
            try {
                details[0]._id = fromString(JSON.stringify(details[0]));
                await insertIntoDatabase('helloWorld_structured', details[0]);
                details[1]._id = fromString(JSON.stringify(details[1]));
                await insertIntoDatabase('helloWorld_unstructured', details[1]);
            } catch (e) {
                if (e.message.includes('E11000 duplicate key error collection:')) {
                    continue;
                } else {
                    throw e;
                }
            }
            // jobs.push(details[0]);
            // await saver.saveToJSON(jobs, './sites/rs.helloworld/data/helloWorld.json');
        }
    }
    return jobsURL;
}