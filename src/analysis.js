import cytoscape from 'cytoscape';
import convertSBGNtoCytoscape from 'sbgnml-to-cytoscape';

const analyze = async function (convertedSbgnml, trueCyJSON) {

  let c = 0; // c: compile
  let resultObject = {};

  let convertedCyJSON = "";
  try {
    convertedCyJSON = convertSBGNtoCytoscape(convertedSbgnml);
    c = 1;
  } catch (error) {
    console.log("sbgnml content is wrong.")
  }
  if (c === 1) {  // converted sbgnml is compalible
    // cy instance for ground truth
    let cy1 = cytoscape({
      styleEnabled: true,
      headless: true
    });
    // cy instance for converted file
    let cy2 = cytoscape({
      styleEnabled: true,
      headless: true
    });

    cy1.json({ elements: JSON.parse(trueCyJSON).elements });
    cy2.add(convertedCyJSON)

    // node and edge counts
    const nodeCountOriginal = cy1.nodes().length;
    const nodeCountGenerated = cy2.nodes().length;
    const edgeCountOriginal = cy1.edges().length;
    const edgeCountGenerated = cy2.edges().length;

    // label counts
    const nodesWithLabelOriginal = cy1.nodes().filter('[label != ""]');
    const labelCountOriginal = nodesWithLabelOriginal.length;
    const correctLabelCount = countCorrectLabels(cy1, cy2);
    console.log(correctLabelCount);

    resultObject.c = 1;
    resultObject.n = nodeCountGenerated + "/" + nodeCountOriginal;
    resultObject.nc = 1;
    resultObject.e = edgeCountGenerated + "/" + edgeCountOriginal;
    resultObject.ec = 1;
    resultObject.l = correctLabelCount + "/" + labelCountOriginal;

  } else {
    resultObject.c = 0;
    resultObject.n = "N/A";
    resultObject.nc = "N/A";
    resultObject.e = "N/A";
    resultObject.ec = "N/A";
    resultObject.l = "N/A";
  }

  return resultObject;
};

function countCorrectLabels(originalGraph, generatedGraph) {
  // exctract labels from both graph
  const originalLabels = originalGraph.nodes().filter('[label != ""]').toArray().map(node => node.data('label'));
  const generatedLabels = generatedGraph.nodes().filter('[label != ""]').toArray().map(node => node.data('label'));

  // frequency map for original labels
  const labelFrequency = new Map();
  originalLabels.forEach(label => {
    labelFrequency.set(label, (labelFrequency.get(label) || 0) + 1);
  });

  let correctCount = 0;

  // now check each label in the generated graph
  generatedLabels.forEach(label => {
    if (labelFrequency.has(label && labelFrequency.get(label) > 0)) {
      correctCount++;
      // decrease the count to handle duplicates
      labelFrequency.set(label, labelFrequency.get(label) - 1);
    }
  })
  return correctCount;
}

export { analyze }