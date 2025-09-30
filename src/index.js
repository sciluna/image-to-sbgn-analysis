import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runLLM } from './llm.js';
import { analyze } from './analysis.js';
import cytoscape from 'cytoscape';

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

    const filenames = fs.readdirSync(path.join(__dirname, "/experiment/" + language + "/json"));

    async function processFiles() {
      let allResults = [];

      await Promise.all(
        filenames.map(async (file, index) => {
          let filename = path.parse(file).name;
          let inputPathCyJSON = path.join(__dirname, "/experiment/" + language + "/json/" + filename + ".json");
          allResults[index] = [];

          // this is ground truth data for sample 
          let trueCyJSON = fs.readFileSync(inputPathCyJSON, 'utf8');

          // get image content to be converted - use binary version if option is binary
          let imageContent;
          if (prep == "raw") {
            let inputPathImage = path.join(__dirname, "/experiment/" + language + "/input/raw/" + filename + "_hd" + ".png");
            imageContent = readImage(inputPathImage);
          } else {  // use black-white image
            let inputPathImage = path.join(__dirname, "/experiment/" + language + "/input/binary/" + filename + "_binary" + ".png");
            imageContent = readImage(inputPathImage);
    /*           let buffer = await sharp(inputPathImage).grayscale().threshold(128).toBuffer();
            imageContent = `data:image/png;base64,${buffer.toString('base64')}`; */
          }

          try {
            let resultFilename = path.join(__dirname, "/experiment/" + language + "/results/raw/" + filename + ".txt");
            let sbgnFilename = path.join(__dirname, "/experiment/" + language + "/results/sbgnml/" + filename + ".sbgnml");
            let convertedSbgnml = await runLLM(llm, imageContent, language, icl, resultFilename, sbgnFilename);
            // now we have both ground truth cy json and converted sbgn, so let's compare them
            let analysisResult = await analyze(convertedSbgnml, trueCyJSON);
            allResults[index].push(analysisResult);
            console.log("Processed " + filename);
            console.log(allResults[index]);
          } catch (error) {
            console.error("Error processing", filename, error);
          }
        })
      );

      let csvData = arrayToCsv(allResults, filenames);
      fs.writeFileSync(`src/experiment/${language}/output.csv`, csvData, 'utf8');
      console.log('CSV file saved successfully!');
    }

    processFiles();
  });
});

/* This part is to generate csv file for MTurk from cytoscape.js JSON files
const baseUrl = 'https://github.com/sciluna/image-to-sbgn-analysis/blob/main/dataset/auto-generated/';

app.post('/', async (req, res) => {
  let body = "";
  req.on('data', data => {
    body += data;
  });

  req.on('end', async () => {
    body = JSON.parse(body);
    const files = fs.readdirSync(path.join(__dirname, "/mt_sbgnmls"));
    let csvData = [];

    files.forEach((file, index) => {
      let filename = path.parse(file).name;
      let inputPathCyJSON = path.join(__dirname, "/mt_sbgnmls/" + filename + ".json");
      let rawData = fs.readFileSync(inputPathCyJSON, 'utf8');
      let jsonData = JSON.parse(rawData);
      let language = index < 25 ? "AF" : "PD";
      let refLink = index < 25 ? "https://raw.githubusercontent.com/sciluna/image-to-sbgn-analysis/refs/heads/main/dataset/auto-generated/sbgn_af_stylesheet.png" : "https://raw.githubusercontent.com/sciluna/image-to-sbgn-analysis/refs/heads/main/dataset/auto-generated/sbgn_pd_stylesheet.png";
      const imageUrl = baseUrl + language + "/" + filename + ".png?raw=true";
      const [nodeData, edgeData] = processJsonContent(jsonData);
      csvData.push({ url: imageUrl, filename: filename + ".png", nodeData, edgeData, refCardLink: refLink });
    });
    csvData = jsonToCsv(csvData);
    fs.writeFileSync('./sbgn_data.csv', csvData, 'utf8');
    console.log(csvData);
  });
});

// Convert JSON to CSV manually
function jsonToCsv(jsonData) {
  let csv = '';
  
  // Extract headers
  const headers = Object.keys(jsonData[0]);
  csv += headers.join(',') + '\n';
  
  // Extract values
  jsonData.forEach(obj => {
      const values = headers.map(header => obj[header]);
      csv += values.join(',') + '\n';
  });
  
  return csv;
}

function processJsonContent(jsonData) {
  let cy = cytoscape({
    styleEnabled: true,
    headless: true
  });

  cy.json({ elements: jsonData.elements });

  let nodeMap = new Map();
  let edgeMap = new Map();
  let nodeData = "";
  let edgeData = "";

  cy.nodes().forEach (node => {
    let nodeClass = node.data('class');
    if(nodeMap.has(nodeClass)) {
      nodeMap.set(nodeClass, nodeMap.get(nodeClass) + 1);
    } else {
      nodeMap.set(nodeClass, 1);
    }
  });
  cy.edges().forEach (edge => {
    let edgeClass = edge.data('class');
    if(edgeMap.has(edgeClass)) {
      edgeMap.set(edgeClass, edgeMap.get(edgeClass) + 1);
    } else {
      edgeMap.set(edgeClass, 1);
    }
  });

  nodeData = Array.from(nodeMap, ([key, value]) => `${value} ${key}`).join('; ');
  edgeData = Array.from(edgeMap, ([key, value]) => `${value} ${key}`).join('; ');
  return [nodeData, edgeData]
} */

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
  const headers = ['sample', 'c_1', 'n_1', 'nc_1', 'e_1', 'ec_1', 'l_1'];
  const rows = data.map((row, rowIndex) => {
    const rowData = { sample: fileNames[rowIndex].substring(0, fileNames[rowIndex].indexOf("."))};
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