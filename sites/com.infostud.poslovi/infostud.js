const puppeteer = require('puppeteer');
const saver = require('../../utils/saver');
const fromString = require('uuidv4').fromString;

const jobs = [];
let date = Date.now();
const database = require('../../utils/dbConfig');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        let url = 'https://poslovi.infostud.com/oglasi-za-posao?category%5B0%5D=5&page=1';

        let jobsOnPage = await evaluatePage(page, url);

        while (jobsOnPage.length > 0) {
            const nextPageNumber = parseInt(url.match(/page=(\d+$)/)[1]) + 1;
            const nextUrl = `https://poslovi.infostud.com/oglasi-za-posao?category%5B0%5D=5&page=${nextPageNumber}`;

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
        const jobLinks = document.querySelectorAll('ul li.job-title h2 a');
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
            const data = {
                '@context': 'http://zamphyr.com/',
                '@type': 'JobPosting',
                title: document.querySelector('#__fastedit_html_oglas h1') ?
                    document.querySelector('#__fastedit_html_oglas h1').innerText.trim() :
                    document.querySelector('head meta:nth-child(14)') ?
                        document.querySelector('head meta:nth-child(14)').content.split('|')[0].trim() : '',
                position: '',
                hiringOrganization: {
                    '@type': 'Organization',
                    name: document.querySelector('div.uk-panel.info-muted.uk-margin-small-bottom p') ?
                        document.querySelector('div.uk-panel.info-muted.uk-margin-small-bottom p').innerText.match(/.+ (raspisuje)/g)[0].replace(' raspisuje', '').trim() : '',
                    sameAs: '',
                    email: '',
                    telephone: ''
                },
                validThrough: document.querySelector('head meta:nth-child(8)') ?
                    document.querySelector('head meta:nth-child(8)').content : '',
                datePosted: '',
                employmentType: '',
                jobLocation: {
                    '@type': 'Place',
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: document.querySelector('head meta:nth-child(14)') ?
                            document.querySelector('head meta:nth-child(14)').content.split('|')[2].trim() : '',
                        addressCountry: '',
                        addressRegion: '',
                        postalCode: '',
                        streetAddress: ''
                    }
                },
                responsibilities: '',
                jobRole: '',
                baseSalary: {
                    '@type': 'MonetaryAmount',
                    currency: '',
                    minValue: '',
                    maxValue: '',
                    value: ''
                },
                equityOffered: '',
                description: document.querySelector('#__fastedit_html_oglas') ?
                    (document.querySelector('#__fastedit_html_oglas').innerText.trim().replace(/Deadline for applications: \d+\.\d+\.\d+\./g, '') ?
                        document.querySelector('#__fastedit_html_oglas').innerText.trim() : document.querySelector('#ogl img') ?
                            image = document.querySelector('#ogl img').src : '') : '',
                language: {
                    '@type': 'Language',
                    name: '',
                    alternateName: ''
                },
                skillRequirements: '',
                educationRequirements: {
                    '@type': 'EducationalOccupationalCredentiial',
                    credentialCategory: '',
                    educationalLevel: '',
                    about: ''
                },
                experienceRequirements: '',
                skillLevel: '',
                jobStartDate: '',
                jobEndDate: '',
                jobLocationType: {
                    '@type': 'DefinedTerm',
                    description: '',
                    termCode: '',
                    inDefinedTermSet: ''
                },
                proxyOrganization: {
                    '@type': 'Organization',
                    name: '',
                    sameAs: '',
                    email: '',
                    telephone: '',
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: '',
                        addressCountry: '',
                        addressRegion: '',
                        postalCode: '',
                        streetAddress: ''
                    }
                },
                zamphyrLevel: {
                    '@type': 'DefinedTerm',
                    description: '',
                    termCode: '',
                    inDefinedTermSet: ''
                },
                workHours: '',
                industry: '',
                eligibleRegion: {
                    '@type': 'Place',
                    name: '',
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: '',
                        addressCountry: '',
                        addressRegion: ''
                    }
                },
                relocationOffered: '',
                jobBenefits: ''
            }            
            return [data, image];
        }, jobsURL[i]);

        if (details[1]) {
            let fileName = details[1].split('/');
            fileName = fileName[fileName.length - 1].split('.')[0];
            await saver.downloadAsBlob(details[1], './sites/com.infostud.poslovi/data/images/', fileName );
        } else {
            // await database('infostud', details[0]);
            details[0].id = fromString(JSON.stringify(details[0]));
            jobs.push(details[0]);
            await saver.saveToJSON(jobs, './sites/com.infostud.poslovi/data/data.json');
        }
    }

    return jobsURL;
}
