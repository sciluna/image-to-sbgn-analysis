import cytoscape from 'cytoscape';
import convertSBGNtoCytoscape from 'sbgnml-to-cytoscape';

const analyze = function (convertedSbgnml, trueSbgnml) {
  
  let c, n, nc, e, ec, l = 0;

  let convertedCyJSON = "";
  try {
    convertedCyJSON = convertSBGNtoCytoscape(convertedSbgnml);
    c = 1;
  } catch (error) {
    console.log("sbgnml content is wrong.")
  }
  if (c === 1) {  // converted sbgnml is compalible
    let trueCyJSON = convertSBGNtoCytoscape(trueSbgnml);

    let cy1 = cytoscape({
      styleEnabled: true,
      headless: true
    });

    let cy2 = cytoscape({
      styleEnabled: true,
      headless: true
    });

  }

}

export { analyze }