const fromString = require('uuidv4').fromString;
const fuzzball = require('fuzzball');
const fs = require('fs');
const diff = require('deep-diff').diff;
const observableDiff = require('deep-diff').observableDiff;
const applyChange = require('deep-diff').applyChange;

let infostudData = JSON.parse(fs.readFileSync('../sites/com.infostud.poslovi/data/data.json'));

let itposloviData = JSON.parse(fs.readFileSync('../sites/com.itposlovi/data/itposloviCom.json'));

let helloWorldData = JSON.parse(fs.readFileSync('../sites/rs.helloworld/data/helloWorld.json'))
// console.log(itposloviData[0]);

outer: for (let itData of itposloviData) {
    inner: for (let helloData of helloWorldData) {
        // console.log(JSON.stringify(helloData))
        if (fuzzball.ratio(JSON.stringify(itData.description), JSON.stringify(helloData.description)) > 80) {
            // console.log(JSON.stringify(helloData))
            // console.log(JSON.stringify(infoData));
            // let differences = diff(helloData, itData);
            console.log(diff(helloData, itData))
            observableDiff(helloData, itData, (differences) => {
                if(differences.lhs.split('').length < differences.rhs.split('').length) {
                    applyChange(helloData, itData, differences);
                }
            });
            console.log(diff(helloData, itData));

            break outer;

        }
    }
}