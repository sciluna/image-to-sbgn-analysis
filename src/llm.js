import { config } from 'dotenv';
import { TokenJS } from 'token.js'

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
    let answer = response.choices[0]["message"]["content"];
    answer = answer.replaceAll('```json', '');
    answer = answer.replaceAll('```', '');
    return JSON.stringify(answer);
  }
  return main();
}

const generateMessage = function(language, image, icl) {
  if (language == "PD") {
    let messagesArray = [{ role: 'system', content: 'You are a helpful and professional assistant for converting hand-drawn biological networks drawn in Systems Biology Graphical Notation (SBGN) Process Description (PD) language and producing the corresponding SBGNML files. For an input hand-drawn biological network, you will analyze it and generate the corresponding SBGNML content. Please provide your final answer in JSON format. Do not return any answer outside of this format. A template looks like this: {"answer": "SBGNML content as a STRING so that we can parse it (This is very important)"}. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, and make sure that you are returning a valid JSON (this is important).'
    }];
    let userPrompt = "Please generate the SBGNML for this hand-drawn SBGN PD diagram. Please note that macromolecule, simple cehmical, complex, nucleic acid feature, perturbing agent, unspecified entity, compartment, submap, empty set, phenotype, process, omitted process, uncertain process, association, dissociation, and, or, not nodes are represented with 'glyph' tag in SBGNML PD and consumption, production, modulation, simulation, catalysis, inhibition, necessary stimulation and logic arc edges are represented with 'arc' tag in SBGNML PD. Make sure that each element in the graph has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, make sure that you are returning a valid JSON (this is important).";
    if (icl == "no_icl") {
      messagesArray.push({ 
				role: "user", 
				content: [
					{type: 'text', text: userPrompt}, 
					{type: 'image_url', image_url: {
            "url": image
          }}
				]
			});
    } else {
      let stylesheetImage = convertImage(path.join(__dirname, "assets/sbgn_stylesheet.png"));
      messagesArray.push({ 
        role: "user", 
        content: [
          {type: 'text', text: "Here is a stylesheet (learner's card) of SBGN PD shapes (nodes and edges) and their corresponding classes written in the right columns."}, 
          {type: 'image_url', image_url: {
            "url": stylesheetImage
          }}
        ]
      });
      if (icl == "stylesheet_with_samples") {
        messagesArray.push({ 
          role: "user", 
          content: [
            {type: 'text', text: promptsPD.firstSampleComment}, 
            {type: 'image_url', image_url: {
              "url": firstSampleImage 
            }}
          ]
        },
        { 
          role: "assistant", 
          content: JSON.stringify({ answer: firstSampleSBGNML })
        },
        { 
          role: "user", 
          content: [
            {type: 'text', text: promptsPD.secondSampleComment}, 
            {type: 'image_url', image_url: {
              "url": secondSampleImage 
            }}
          ]
        },
        { 
          role: "assistant", 
          content: JSON.stringify({ answer: secondSampleSBGNML })
        });
      }
      messagesArray.push({ 
				role: "user", 
				content: [
					{type: 'text', text: userPrompt}, 
					{type: 'image_url', image_url: {
            "url": image
          }}
				]
			});
    }
    return messagesArray;
  }
  else if (language == "AF") {
    let messagesArray = [{ role: 'system', content: 'You are a helpful and professional assistant for converting hand-drawn biological networks drawn in Systems Biology Graphical Notation (SBGN) Activity Flow (AF) language and producing the corresponding SBGNML files. For an input hand-drawn biological network, you will analyze it and generate the corresponding SBGNML content. Please provide your final answer in JSON format. Do not return any answer outside of this format. A template looks like this: {"answer": "SBGNML content as a STRING so that we can parse it (This is very important)"}. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, and make sure that you are returning a valid JSON (this is important).'
    }];
    let userPrompt = "Please generate the SBGNML for this hand-drawn SBGN AF diagram. Please note that biological activity, phenotype, and, or, not, delay nodes are represented with 'glyph' tag in SBGNML AF and positive influence, negative influence, unknown influence, necessary simulation and logic arc edges are represented with 'arc' tag in SBGNML AF. Make sure that each element in the graph has the correct tag, this is very inportant. Please also make sure that each glyph has a label and bbox subtags and each arc has source and target defined as attribute inside arc tag (not as subtags). Take your time and act with careful consideration. DO NOT enclose the JSON output in markdown code blocks like ```json and ```, make sure that you are returning a valid JSON (this is important).";
    if (icl == "no_icl") {
      messagesArray.push({ 
				role: "user", 
				content: [
					{type: 'text', text: userPrompt}, 
					{type: 'image_url', image_url: {
            "url": image
          }}
				]
			});
    } else {
      let stylesheetImage = convertImage(path.join(__dirname, "assets/af_learners_card_small.png"));
      messagesArray.push({ 
				role: "user", 
				content: [
					{type: 'text', text: "Here is a stylesheet of SBGN AF shapes (nodes and edges) and their corresponding classes written in the right columns."}, 
					{type: 'image_url', image_url: {
            "url": stylesheetImage
          }}
				]
			});
      if (icl == "stylesheet_with_samples") {
        messagesArray.push({ 
          role: "user", 
          content: [
            {type: 'text', text: promptsAF.firstSampleComment}, 
            {type: 'image_url', image_url: {
              "url": firstSampleImage
            }}
          ]
        },
        { 
          role: "assistant", 
          content: JSON.stringify({ answer: firstSampleSBGNML })
        },
         { 
          role: "user", 
          content: [
            {type: 'text', text: promptsAF.secondSampleComment}, 
            {type: 'image_url', image_url: {
              "url": secondSampleImage 
            }}
          ]
        },
        { 
          role: "assistant", 
          content: JSON.stringify({ answer: secondSampleSBGNML })
        });
      }
      messagesArray.push({ 
				role: "user", 
				content: [
					{type: 'text', text: userPrompt}, 
					{type: 'image_url', image_url: {
            "url": image
          }}
				]
			});
    }
    return messagesArray;
  }
};

export { runLLM };