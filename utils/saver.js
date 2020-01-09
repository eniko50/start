const fetch = require('node-fetch');
const fs = require('fs');
const detectFileType = require('detect-file-type');


module.exports = {
    saveToJSON(data, path) {
        const jsonData = JSON.stringify(data, null, 2);
        
        fs.writeFile(path, jsonData,
            (error) => error ? console.error('Data not written', error) : console.log('Data written'));
    },
    async downloadAsPDF(page, url) {
        await page.goto(url);
        await page.emulateMediaType('screen');
        await page.pdf({ path: `./data/images/oglas${Math.random()}.pdf`, format: 'A4', printBackground: false });
    },
    async downloadAsBlob(url, outputPath, fileName) {
        let response = await fetch(url);
        let blob = await response.arrayBuffer();
        let type;

        detectFileType.fromBuffer(blob, function (err, result) {
            if (err) {
                return console.error(err);
            }
            type = result.ext;
        })
        // const fileName = 'oglas' + Math.random().toString(6).substring(6);

        fs.writeFile(`${outputPath}${fileName}.${type}`, Buffer.from(blob), (err) => {
            err ? console.error(err) : console.log('Data fetched!');
        });
    },
}