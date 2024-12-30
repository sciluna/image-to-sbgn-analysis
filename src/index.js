import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runLLM } from './llm.js';
import { analyze } from './analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a web server
const app = express();
const port = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, "../public/")));
app.use(cors());

app.post('/', async (req, res) => {
  let body = "";
  req.on('data', data => {
    body += data;
  });

  req.on('end', async () => {
    body = JSON.parse(body);
    let llm = body.llm;
    let language = body.language;
    let prep = body.prep;
    let icl = body.icl;

    const userCount = 3;  // there are 3 different hand-drawn versions of each sample

    const filenames = fs.readdirSync(path.join(__dirname, "/dataset/" + language + "/json"));
    let allResults = [];

    filenames.forEach(async (file, index) => {  // for each file in the dataset, we will make evaluation for three users
      let filename = path.parse(file).name;
      let inputPathCyJSON = path.join(__dirname, "/dataset/" + language + "/json/" + filename + ".json");
      allResults[index] = [];

      // this is ground truth data for sample 
      let trueCyJSON = fs.readFileSync(inputPathCyJSON, 'utf8');

      for (let i = 1; i <= userCount; i++) {
        // get image content to be converted - apply preprocessing if required
        let inputPathImage = path.join(__dirname, "/dataset/" + language + "/user" + i + "/" + filename + ".png");
        let imageContent;
        if (prep == "raw") {
          imageContent = readImage(inputPathImage);
        } else {  // return to black-white image
          let buffer = await sharp(inputPathImage).grayscale().threshold(128).toBuffer();
          imageContent = `data:image/png;base64,${buffer.toString('base64')}`;
        }

        try {
          let convertedSbgnml = await runLLM(llm, imageContent, language, icl, i);
          //let convertedSbgnml = undefined;
          // now we have both ground truth cy json and converted sbgn, so let's compare them
          let analysisResult = await analyze(convertedSbgnml, trueCyJSON);
          allResults[index].push(analysisResult);
          console.log(allResults[0]);

          if (index == filenames.length - 1 && i == userCount) {
            let csvData = arrayToCsv(allResults, filenames);
            console.log(csvData);
            // Download the CSV file
            /*             fs.writeFile('output.csv', csvData, 'utf8', (err) => {
                          if (err) {
                            console.error('Error writing to file:', err);
                          } else {
                            console.log('CSV file saved successfully!');
                          }
                        }); */
          }
        } catch (error) {
          console.log("Error!");
        }
      }
    });
  });
});

// convert png image to base64
const readImage = (imgPath) => {
  // read image file
  let data = fs.readFileSync(imgPath);

  // convert image file to base64-encoded string
  const base64Image = Buffer.from(data, 'binary').toString('base64');

  // combine all strings
  const base64ImageStr = `data:image/png;base64,${base64Image}`;
  return base64ImageStr;
};

let arrayToCsv = function (data, fileNames) {
  const headers = ['sample', 'c_1', 'n_1', 'nc_1', 'e_1', 'ec_1', 'l_1', 'c_2', 'n_2', 'nc_2', 'e_2', 'ec_2', 'l_2', 'c_3', 'n_3', 'nc_3', 'e_3', 'ec_3', 'l_3'];
  const rows = data.map((row, rowIndex) => {
    const rowData = { sample: fileNames[rowIndex] };
    row.forEach((item, itemIndex) => {
      rowData[`c_${itemIndex + 1}`] = item.c || 'N/A';
      rowData[`n_${itemIndex + 1}`] = item.n || 'N/A';
      rowData[`nc_${itemIndex + 1}`] = item.nc || 'N/A';
      rowData[`e_${itemIndex + 1}`] = item.e || 'N/A';
      rowData[`ec_${itemIndex + 1}`] = item.ec || 'N/A';
      rowData[`l_${itemIndex + 1}`] = item.l || 'N/A';
    });
    return rowData;
  });

  const csvContent = [headers.join(','), ...rows.map(row => Object.values(row).join(','))].join('\n');
  return csvContent;
}

export { port, app }