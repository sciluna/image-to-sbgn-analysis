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
    let langauage = body.langauage;
    let prep = body.prep;
    let icl = body.icl;

    const filenames = fs.readdirSync(path.join(__dirname, "/dataset"));
    const filteredFiles = filenames.filter(file => path.extname(file) === ".png");

    filteredFiles.forEach(async (file, index) => {  // for each file in the dataset
      let filename = path.parse(file).name;
      let inputPathImage = path.join(__dirname, "/dataset/" + file);
      let inputPathSBGN = path.join(__dirname, "/dataset/" + filename + ".sbgn");

      // get image content to be converted - apply preprocessing if required
      let imageContent;
      if (prep == "raw") {
        imageContent = readImage(inputPathImage);
      } else {  // return to black-white image
        let buffer = await sharp(inputPathImage).grayscale().threshold(128).toBuffer();
        imageContent = `data:image/png;base64,${buffer.toString('base64')}`;
      }

      let convertedSbgnml = runLLM(llm, imageContent, langauage, icl);

      let trueSbgnml = fs.readFileSync(inputPathSBGN, 'utf8');

      // now we have both ground truth sbgn and converted sbgn, so let's compare them
      //analyze(convertedSbgnml, trueSbgnml); 
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

export { port, app }