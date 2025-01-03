import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { TokenJS } from 'token.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const runLLM = async function (llmType, imageContent, language, icl, i) {
  // Create the Token.js client
  const tokenjs = new TokenJS();

  // Initialize API
  let provider = ""; // options: openai, gemini
  let model = "";

  if (llmType == "openai") {
    provider = "openai";
    model = "gpt-4o";
  } else if (llmType == "gemini") {
    provider = "gemini";
    model = "gemini-1.5-pro";
  }
  // construct message to pass
  let messagesArray = generateMessage(language, imageContent, icl);

  async function main() {
    const response = await tokenjs.chat.completions.create({
      provider: provider,
      model: model,
      messages: messagesArray
    });
    let result = response.choices[0]["message"]["content"];
    try {
      result = result.replaceAll('```json', '');
      result = result.replaceAll('```', '');
      let sbgnmlText = JSON.parse(result).answer;
      sbgnmlText = sbgnmlText.replaceAll('\"', '"');
      sbgnmlText = sbgnmlText.replaceAll('\n', '');
      sbgnmlText = sbgnmlText.replaceAll('empty set', 'source and sink');
      return sbgnmlText;
    } catch (error) {
      return undefined;
    }
  }

  return main();
}

const convertImage = (imgPath) => {
  // read image file
  let data = fs.readFileSync(imgPath);

  // convert image file to base64-encoded string
  const base64Image = Buffer.from(data, 'binary').toString('base64');

  // combine all strings
  const base64ImageStr = `data:image/png;base64,${base64Image}`;
  return base64ImageStr;
};

const convertSBGNML = (sbgnmlPath) => {
	// read sbgnml file
	let data = fs.readFileSync(sbgnmlPath, 'utf8');

	return data;
};

const generateMessage = function (language, imageContent, icl) {
  if (language == "PD") {

    let stylesheetImagePD = convertImage(path.join(__dirname, "assets/sbgn_pd_stylesheet.png"));
    let firstSampleImagePD = convertImage(path.join(__dirname, "assets/PD_reference1.png"));
    let secondSampleImagePD = convertImage(path.join(__dirname, "assets/PD_reference2.png"));

    let firstSampleSbgnmlPD = convertSBGNML(path.join(__dirname, "assets/PD_reference1.sbgn"));
    let secondSampleSbgnmlPD = convertSBGNML(path.join(__dirname, "assets/PD_reference2.sbgn"));

    let messagesArray = [{
      role: 'system', content: 'You are a helpful and professional assistant for converting hand-drawn biological networks drawn in Systems Biology Graphical Notation (SBGN) Process Description (PD) language and producing the corresponding SBGNML files. For an input hand-drawn biological network, you will analyze it and generate the corresponding SBGNML content. Please provide your final answer in JSON format. Do not return any answer outside of this format. A template looks like this: {"answer": "SBGNML content as a STRING so that we can parse it (This is very important)"}. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, and make sure that you are returning a valid JSON (this is important).'
    }];
    let userPrompt = "Please generate the SBGNML for this hand-drawn SBGN PD diagram. Please note that macromolecule, simple cehmical, complex, nucleic acid feature, perturbing agent, unspecified entity, compartment, submap, empty set, phenotype, process, omitted process, uncertain process, association, dissociation, and, or, not nodes are represented with 'glyph' tag in SBGNML PD and consumption, production, modulation, simulation, catalysis, inhibition, necessary stimulation and logic arc edges are represented with 'arc' tag in SBGNML PD. Make sure that each element in the graph has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, make sure that you are returning a valid JSON (this is important).";
    if (icl == "no_icl") {
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url', image_url: {
              "url": imageContent
            }
          }
        ]
      });
    } else {
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: "Here is a stylesheet of SBGN PD shapes (glyphs and arcs) and their corresponding classes written in the right columns." },
          {
            type: 'image_url', image_url: {
              "url": stylesheetImagePD
            }
          }
        ]
      });
      if (icl == "stylesheet_with_samples") {
        messagesArray.push(
          {
            role: "user",
            content: [
              { type: 'text', text: firstSampleCommentPD },
              {
                type: 'image_url', image_url: {
                  "url": firstSampleImagePD
                }
              }
            ]
          },
          {
            role: "assistant",
            content: JSON.stringify({ answer: firstSampleSbgnmlPD })
          },
          {
            role: "user",
            content: [
              { type: 'text', text: secondSampleCommentPD },
              {
                type: 'image_url', image_url: {
                  "url": secondSampleImagePD
                }
              }
            ]
          },
          {
            role: "assistant",
            content: JSON.stringify({ answer: secondSampleSbgnmlPD })
          });
      }
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url', image_url: {
              "url": imageContent
            }
          }
        ]
      });
    }
    return messagesArray;
  }
  else if (language == "AF") {
    let stylesheetImageAF = convertImage(path.join(__dirname, "assets/sbgn_af_stylesheet.png"));
		let firstSampleImageAF = convertImage(path.join(__dirname, "assets/AF_reference1.png"));
		let secondSampleImageAF = convertImage(path.join(__dirname, "assets/AF_reference2.png"));

		let firstSampleSbgnmlAF = convertSBGNML(path.join(__dirname, "assets/AF_reference1.sbgn"));
		let secondSampleSbgnmlAF = convertSBGNML(path.join(__dirname, "assets/AF_reference2.sbgn"));
    let messagesArray = [{
      role: 'system', content: 'You are a helpful and professional assistant for converting hand-drawn biological networks drawn in Systems Biology Graphical Notation (SBGN) Activity Flow (AF) language and producing the corresponding SBGNML files. For an input hand-drawn biological network, you will analyze it and generate the corresponding SBGNML content. Please provide your final answer in JSON format. Do not return any answer outside of this format. A template looks like this: {"answer": "SBGNML content as a STRING so that we can parse it (This is very important)"}. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, and make sure that you are returning a valid JSON (this is important).'
    }];
    let userPrompt = "Please generate the SBGNML for this hand-drawn SBGN AF diagram. Please note that biological activity, phenotype, and, or, not, delay nodes are represented with 'glyph' tag in SBGNML AF and positive influence, negative influence, unknown influence, necessary simulation and logic arc edges are represented with 'arc' tag in SBGNML AF. Make sure that each element in the graph has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, make sure that you are returning a valid JSON (this is important).";
    if (icl == "no_icl") {
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url', image_url: {
              "url": imageContent
            }
          }
        ]
      });
    } else {
      let stylesheetImage = convertImage(path.join(__dirname, "assets/sbgn_af_stylesheet.png"));
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: "Here is a stylesheet of SBGN AF shapes (glyphs and arcs) and their corresponding classes written in the right columns." },
          {
            type: 'image_url', image_url: {
              "url": stylesheetImageAF
            }
          }
        ]
      });
      if (icl == "stylesheet_with_samples") {
        messagesArray.push({
          role: "user",
          content: [
            { type: 'text', text: firstSampleCommentAF },
            {
              type: 'image_url', image_url: {
                "url": firstSampleImageAF
              }
            }
          ]
        },
          {
            role: "assistant",
            content: JSON.stringify({ answer: firstSampleSbgnmlAF })
          },
          {
            role: "user",
            content: [
              { type: 'text', text: secondSampleCommentAF },
              {
                type: 'image_url', image_url: {
                  "url": secondSampleImageAF
                }
              }
            ]
          },
          {
            role: "assistant",
            content: JSON.stringify({ answer: secondSampleSbgnmlAF })
          });
      }
      messagesArray.push({
        role: "user",
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url', image_url: {
              "url": imageContent
            }
          }
        ]
      });
    }
    return messagesArray;
  }
};

const firstSampleCommentPD = "This SBGN-PD diagram represents a pathway with 13 nodes and 9 edges. 13 nodes include 6 simple chemicals, 2 macromolecules, 2 processes, 2 complexes, and 1 compartment. 9 edges include 4 consumption, 3 production, 1 modulation, and 1 stimulation edges. The process node in the left consumes FAD and HX-CoA, and produces trans-Hex-2-enoyl-CoA and FADH2 while a complex node holding a macromolecule (ACADS) inside modulates (represented with modulation edge) the process. The process node in the right consumes trans-Hex-2-enoyl-CoA and H2O, and produces (S)-Hydroxyhexanoyl-CoA while a complex node holding a macromolecule (ECHS1) inside stimulates (represented with stimulation edge) the process. In the light of this information, generate the SBGNML for this hand-drawn SBGN diagram. Make sure that each element in the resulting SBGNML has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. Do NOT enclose the JSON output in markdown code blocks like ```json and make sure that you are returning a valid JSON (this is important).";

const secondSampleCommentPD = "This SBGN-PD diagram represents a pathway with 16 nodes and 11 edges. 16 nodes include 3 macromolecules (STAT1a, STAT1a and IRF1), 4 nucleic acid features (IRF1-GAS, IRF1-GAS, IRF1 and IRF1), 2 processes, 3 complexes, 2 empty sets, 1 association, and 1 and node. 11 edges include 4 consumption, 3 production, 2 necessary stimulation and 2 logic arcs. In the top left, macromolecule STAT1a is inside a complex node. That complex node and nucleic acid feature (IRF1-GAS) are input to association node, and the output of the association is another complex. Inside the output complex, there is a nucleic acid feature (IRF1-GAS) and another complex node holding a macromolecule (STAT1a). Then, the output complex and nucleic acid feature IRF1 become input to AND node. Please note that the input edges to AND node are logic arcs. The AND node is connected to a process node via a necessary stimulation edge. That process node gets an empty set node as input and produces nucleic acid feature IRF1. That IRF1 is connected to another process via necessary stimulation edge. That process also takes an empty set as input and produces macromolecule IRF1. In the light of this information, generate the SBGNML for this hand-drawn SBGN diagram. Make sure that each element in the resulting SBGNML has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. Do NOT enclose the JSON output in markdown code blocks like ```json and make sure that you are returning a valid JSON (this is important).";

const firstSampleCommentAF = "This SBGN-AF diagram represents a pathway with 5 nodes and 4 edges. 5 nodes include 4 'biological activity' and 1 'phenotype' nodes. 4 edges include 2 'positive influence' and 2 'necessary stimulation' edges. The biological activity 'increase in membrane potential' is connected to biological activity 'sodium channel activity' with a positive influence edge. The biological activity 'sodium channel activity' is connected to biological activity 'depolarization' with a necessary stimulation edge. The biological activity 'depolarization' is connected to biological activity 'potassium channel activity' with a positive influence edge. Finally, The biological activity 'potassium channel activity' is connected to phenotype 'repolarization' with a necessary stimulation edge. In the light of this information, generate the SBGNML for this hand-drawn SBGN diagram. Make sure that each element in the resulting SBGNML has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. Do NOT enclose the JSON output in markdown code blocks like ```json and make sure that you are returning a valid JSON (this is important).";

const secondSampleCommentAF = "This SBGN-AF diagram represents a pathway with 7 nodes and 7 edges. 7 nodes include 5 'biological activity', 1 'phenotype' and 1 'and' nodes. 7 edges include 2 'positive influence', 2 'negative influence', 1 'necessary stimulation' and 2 'logic arc' edges. The biological activity 'RAS' and biological activity 'TGF beta' are inputs to the 'and' node via logic arcs. 'and' node is connected to biological activity 'Mutant p53/P-Smad' with a positive influence edge. The biological activity 'Mutant p53/P-Smad' negatively influence biological activity 'p63' (see negative influence edge where 'Mutant p53/P-Smad' is source and 'p63' is target). The biological activity 'p63' is connected to biological activity 'Metastatic suppressor genes activity' with a necessary stimulation edge. The biological activity 'Metastatic suppressor genes activity' negatively influence phenotype 'Pro-invasion migratin metastasis gene expression platform' (see negative influence edge where 'Metastatic suppressor genes activity' is source and 'Pro-invasion migratin metastasis gene expression platform' is target). Finally, biological activity 'TGF beta' positively influence biological activity 'Pro-invasion migratin metastasis gene expression platform' (see positive influence edge where 'TGF beta' is source and 'Pro-invasion migratin metastasis gene expression platform' is target). In the light of this information, generate the SBGNML for this hand-drawn SBGN diagram. Make sure that each element in the resulting SBGNML has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. Do NOT enclose the JSON output in markdown code blocks like ```json and make sure that you are returning a valid JSON (this is important).";

export { runLLM };