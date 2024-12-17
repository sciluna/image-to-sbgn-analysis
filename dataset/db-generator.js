let generatedPNGs = [];
let generatedJSONs = [];

let cy = cytoscape({
  container: document.getElementById('cy'),
  style: cytoscapeSbgnStylesheet(cytoscape)
});

document.getElementById("generate-btn").addEventListener("click", function () {
  // reset old data
  generatedPNGs = [];
  generatedJSONs = [];
  // reset sample options
  let selectElement = document.getElementById('samples');
  while (selectElement.options.length > 0) {
    selectElement.remove(0);
  }

  let rows = parseInt(document.getElementById("num-rows").value);
  let cols = parseInt(document.getElementById("num-cols").value);
  let numOfSamples = parseInt(document.getElementById("num-samples").value);
  let language = document.getElementById("AF").checked ? "AF" : "PD";

  for (let i = 1; i < numOfSamples + 1; i++) {
    let {pngData, jsonData} = generate(rows, cols, language);  // generate sample
    generatedPNGs.push(pngData);
    generatedJSONs.push(jsonData);
    // add sample option
    let option = document.createElement("option");
    option.value = "sample" + i;
    option.id = "sample" + i;
    option.text = "sample" + i;
    selectElement.add(option);
  }
  selectElement.value = "sample1";
  selectElement.dispatchEvent(new Event('change'));
  document.getElementById("download").disabled = false;
  cy.fit(cy.elements(), 30);
});

document.getElementById("samples").addEventListener("change", function () {
  let selectedSample = document.getElementById("samples").value;
  let selectedIndex = parseInt(selectedSample.substring(6)) - 1;
  cy.elements().remove();
  cy.json({elements: generatedJSONs[selectedIndex].elements});
  cy.fit(cy.elements(), 30);
});

document.getElementById("download").addEventListener("click", function () {
  let selectedSample = document.getElementById("samples").value;
  let selectedIndex = parseInt(selectedSample.substring(6)) - 1;
  let downloadAll = document.getElementById("singleOrAll").checked;
  if ( downloadAll ) {
    generatedJSONs.forEach((jsonData, i) => {
      saveJSON(jsonData, "sample" + (i+1) + ".json");
    });
  } else {
    saveJSON(generatedJSONs[selectedIndex], "sample" + (selectedIndex + 1) + ".json");
  }
  if ( downloadAll ) {
    generatedPNGs.forEach(async (pngData, i) => {
      saveAs(pngData, "sample" + (i+1) + ".png");
      await new Promise(r => setTimeout(r, 1000)); 
    });
  } else {
    saveAs(generatedPNGs[selectedIndex], "sample" + (selectedIndex + 1) + ".png");
  }
});

let generate = function (rows, cols, language) {
  cy.elements().remove();

  // generate grid and add basic nodes
  let grid = addBasicNodes(rows, cols, cy, language);

  if (language == "AF") {
    addRandomLogicalNodeAF(grid, cy);
    addRandomEdgesAF(grid, cy);  // add random edges
  }
  else {  // PD
    addProcessNodes(grid, cy);
    addRandomLogicalNodePD(grid, cy);
    addRandomEdgesPD(grid, cy);
  }

  // find disconnected components and remove elements not in the largest one
  let components = cy.elements().components();
  const maxLengthComponent = components.reduce((maxArray, currentArray) => {
    return currentArray.length > maxArray.length ? currentArray : maxArray;
  }, []);
  cy.elements().diff(maxLengthComponent).left.remove();

  addCompartment(grid, cy);

  if (language == "PD") {
    addComplexes(grid, cy);
  }

  cy.fit(cy.elements(), 30);
  let png = cy.png({ full: false, bg: "white" });
  let blobDataPNG = saveImage(png, "png");
  let jsonData = cy.json();
  return { pngData: blobDataPNG, jsonData: jsonData };
};

// function to add random edges using BFS
let addBasicNodes = function (rows, cols, cy, language) {
  let grid = [];

  // fill grid with nodes
  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      let rand1 = Math.random();
      // if there will be a node or not in the grid point
      if (rand1 < 0.5) {
        if (language == "AF") {
          let rand2 = Math.random();
          let nodeClass = "";
          // decide node class
          if (rand2 < 0.9) {
            nodeClass = "biological activity";
            grid[i][j] = { type: "B", node: undefined };
          } else {
            nodeClass = "phenotype";
            grid[i][j] = { type: "P", node: undefined };
          }
          let newNode = cy.add({ group: 'nodes', data: { class: nodeClass, label: setLabel(nodeClass), "stateVariables": [], "unitsOfInformation": [] }, position: { x: j * 200, y: i * 200 } }); // add node
          grid[i][j].node = newNode;
        } else if (language == "PD") {
          let rand2 = Math.random();
          let nodeClass = "";
          if (rand2 < 0.35) {
            nodeClass = "macromolecule";
            grid[i][j] = { type: "EPN", node: undefined };
          } else if (rand2 >= 0.35 && rand2 < 0.7) {
            nodeClass = "simple chemical";
            grid[i][j] = { type: "EPN", node: undefined };
          } else if (rand2 >= 0.7 && rand2 < 0.8) {
            nodeClass = "unspecified entity";
            grid[i][j] = { type: "EPN", node: undefined };
          } else if (rand2 >= 0.8 && rand2 < 0.9) {
            nodeClass = "nucleic acid feature";
            grid[i][j] = { type: "EPN", node: undefined };
          } else if (rand2 >= 0.9 && rand2 < 0.95) {
            nodeClass = "perturbing agent";
            grid[i][j] = { type: "EPN", node: undefined };
          } else if (rand2 >= 0.95 && rand2 < 1) {
            nodeClass = "source and sink";
            grid[i][j] = { type: "EPN", node: undefined };
          }
          let newNode = cy.add({ group: 'nodes', data: { class: nodeClass, label: setLabel(nodeClass), "stateVariables": [], "unitsOfInformation": [] }, position: { x: j * 200, y: i * 200 } }); // add node
          grid[i][j].node = newNode;
        }
      } else {
        grid[i][j] = { type: "E", node: undefined };
      }
    }
  }
  return grid;
};

// function to add process nodes and adjacent edges
let addProcessNodes = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;
  let processClasses = ["process", "omitted process", "uncertain process", "phenotype"];
  let modulationClasses = ["modulation", "stimulation", "catalysis", "inhibition", "necessary stimulation"];

  const emptyCells = [];
  // find empty places
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].type == "E") {
        emptyCells.push({ x, y });
      }
    }
  }

  // directions
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
  ];

  for (let i = 0; i < emptyCells.length; i++) {
    const { x, y } = { x: emptyCells[i].x, y: emptyCells[i].y };
    let possibleIncomers = [];
    let possibleOutgoers = [];
    for (const { dx, dy } of directions) {
      let newX = x + dx;
      let newY = y + dy;

      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "EPN") {
        possibleIncomers.push(grid[newY][newX].node);
      }
      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "EPN" && grid[newY][newX].node.data("class") != "perturbing agent") {
        possibleOutgoers.push(grid[newY][newX].node);
      }
    }
    let random = Math.random();
    let processClass = random < 0.7 ? processClasses[0] : (random < 0.8 ? processClasses[1] : (random < 0.9 ? processClasses[2] : processClasses[3]));
    if (processClass == "phenotype" && possibleIncomers.length > 0) {
      let count = 0;
      while (count < possibleIncomers.length) {
        if (possibleIncomers[count].data("class") != "source and sink") {
          let newNode = cy.add({ group: 'nodes', data: { class: processClass, label: setLabel("phenotype"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: emptyCells[i].x * 200, y: emptyCells[i].y * 200 } }); // add phenotype node
          grid[emptyCells[i].y][emptyCells[i].x] = { type: "PN", node: newNode };
          let modulationClass = modulationClasses[Math.floor(Math.random() * modulationClasses.length)];
          let newEdge3 = cy.add({ group: 'edges', data: { class: modulationClass, source: possibleIncomers[count].id(), target: newNode.id() } }); // add modulation arc
          break;
        }
        count++;
      }
    }
    else if (possibleIncomers.length > 1 && possibleOutgoers.length > 1) {
      const matchingElements = possibleIncomers.filter(item => item.data("class") === "perturbing agent");
      const nonMatchingElements = possibleIncomers.filter(item => item.data("class") !== "perturbing agent");
      possibleIncomers = nonMatchingElements.concat(matchingElements);
      let newNode = cy.add({ group: 'nodes', data: { class: processClass, label: setLabel(processClass), "stateVariables": [], "unitsOfInformation": [] }, position: { x: emptyCells[i].x * 200, y: emptyCells[i].y * 200 } }); // add process node
      grid[emptyCells[i].y][emptyCells[i].x] = { type: "PN", node: newNode };
      let newEdge1 = cy.add({ group: 'edges', data: { class: "consumption", source: possibleIncomers[0].id(), target: newNode.id() } }); // add consumption arc
      let newEdge2 = cy.add({ group: 'edges', data: { class: "production", source: newNode.id(), target: possibleOutgoers[1].id() } }); // add production arc
      for (let j = 2; j < possibleIncomers.length; j++) {
        let modulationClass = modulationClasses[Math.floor(Math.random() * modulationClasses.length)];
        if(possibleIncomers[j].data("class") != "source and sink") {
          let newEdge3 = cy.add({ group: 'edges', data: { class: modulationClass, source: possibleIncomers[j].id(), target: newNode.id() } }); // add modulation arc
        }
      }
    }
    possibleIncomers = [];
    possibleOutgoers = [];
  }

}

// function to add random logical operators to AF
let addRandomLogicalNodeAF = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;
  let logicalNodeClasses = ["and", "or", "not", "delay"];
  let edgeClasses = ["positive influence", "negative influence", "unknown influence", "necessary stimulation"];
  let logicalNodeClass = logicalNodeClasses[Math.floor(Math.random() * logicalNodeClasses.length)];
  let edgeClass = edgeClasses[Math.floor(Math.random() * edgeClasses.length)];
  const emptyCells = [];
  // find empty places
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].type == "E") {
        emptyCells.push({ x, y });
      }
    }
  }
  // Shuffle the empty cells
  emptyCells.sort(() => Math.random() - 0.5);

  // directions
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
  ];

  // select the first empty cell that has appropriate neighbors as the logical node position
  let selectedIndex = -1;
  let neighbors = [];
  let canAddLN = false;
  for (let i = 0; i < emptyCells.length; i++) {
    const { x, y } = { x: emptyCells[i].x, y: emptyCells[i].y };
    let possibleNeighbors = [];
    for (const { dx, dy } of directions) {
      let newX = x + dx;
      let newY = y + dy;

      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "B") {
        possibleNeighbors.push(grid[newY][newX].node);
      }
    }
    if (((logicalNodeClass == "and" || logicalNodeClass == "or") && possibleNeighbors.length > 2) || ((logicalNodeClass == "not" || logicalNodeClass == "delay") && possibleNeighbors.length > 1)) {
      selectedIndex = i;
      neighbors = possibleNeighbors;
      canAddLN = true;
      break;
    }
  }
  if (canAddLN && Math.random() < 0.5) {
    let newNode = cy.add({ group: 'nodes', data: { class: logicalNodeClass, "stateVariables": [], "unitsOfInformation": [] }, position: { x: emptyCells[selectedIndex].x * 200, y: emptyCells[selectedIndex].y * 200 } }); // add node
    grid[emptyCells[selectedIndex].y][emptyCells[selectedIndex].x] = { type: "L", node: newNode };
    let newEdge1 = cy.add({ group: 'edges', data: { class: "logic arc", source: neighbors[0].id(), target: newNode.id() } }); // add logical arc
    let newEdge2 = cy.add({ group: 'edges', data: { class: edgeClass, source: newNode.id(), target: neighbors[1].id() } }); // add modulation arc
    if (logicalNodeClass == "and" || logicalNodeClass == "or") {
      let newEdge3 = cy.add({ group: 'edges', data: { class: "logic arc", source: neighbors[2].id(), target: newNode.id() } }); // add second logical arc if 'and' or 'or'
    }
  }
};

// function to add random logical operators to PD
let addRandomLogicalNodePD = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;
  let logicalNodeClasses = ["and", "or", "not"];
  let modulationClasses = ["modulation", "stimulation", "catalysis", "inhibition", "necessary stimulation"];
  let logicalNodeClass = logicalNodeClasses[Math.floor(Math.random() * logicalNodeClasses.length)];
  let modulationClass = modulationClasses[Math.floor(Math.random() * modulationClasses.length)];

  const emptyCells = [];
  // find empty places
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].type == "E") {
        emptyCells.push({ x, y });
      }
    }
  }
  // Shuffle the empty cells
  emptyCells.sort(() => Math.random() - 0.5);

  // directions
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
  ];

  // select the first empty cell that has appropriate neighbors as the logical node position
  let selectedIndex = -1;
  let neighborsEPN = [];
  let neighborsProcess = [];
  let canAddLN = false;
  for (let i = 0; i < emptyCells.length; i++) {
    const { x, y } = { x: emptyCells[i].x, y: emptyCells[i].y };
    for (const { dx, dy } of directions) {
      let newX = x + dx;
      let newY = y + dy;

      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "EPN" && grid[newY][newX].node.data("class") != "source and sink") {
        neighborsEPN.push(grid[newY][newX].node);
      } else if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "PN") {
        neighborsProcess.push(grid[newY][newX].node);
      }
    }
    if (((logicalNodeClass == "and" || logicalNodeClass == "or") && (neighborsEPN.length > 1 && neighborsProcess.length > 0)) || (logicalNodeClass == "not" && (neighborsEPN.length > 0 && neighborsProcess.length > 0))) {
      canAddLN = true;
      selectedIndex = i;
      break;
    }
    neighborsEPN = [];
    neighborsProcess = [];
  }

  if (canAddLN && Math.random() < 0.5) {
    let newNode = cy.add({ group: 'nodes', data: { class: logicalNodeClass, "stateVariables": [], "unitsOfInformation": [] }, position: { x: emptyCells[selectedIndex].x * 200, y: emptyCells[selectedIndex].y * 200 } }); // add logical node
    grid[emptyCells[selectedIndex].y][emptyCells[selectedIndex].x] = { type: "L", node: newNode };
    let newEdge1 = cy.add({ group: 'edges', data: { class: "logic arc", source: neighborsEPN[0].id(), target: newNode.id() } }); // add first logic arc
    let newEdge2 = cy.add({ group: 'edges', data: { class: modulationClass, source: newNode.id(), target: neighborsProcess[0].id() } }); // add modulation arc that is connected to process
    if (logicalNodeClass == "and" || logicalNodeClass == "or") {
      let newEdge3 = cy.add({ group: 'edges', data: { class: "logic arc", source: neighborsEPN[1].id(), target: newNode.id() } });  // add second logical arc if 'and' or 'or'
    }
  }
};

// function to add random edges using BFS
let addRandomEdgesAF = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;
  const edgeClasses = ["positive influence", "negative influence", "unknown influence", "necessary stimulation"];
  const visited = new Set();
  const edges = [];

  // directions
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: -1 }, // up-right
    { dx: 1, dy: 0 },  // right
    { dx: 1, dy: 1 },  // down-right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 1 }, // down-left
    { dx: -1, dy: 0 }, // left
    { dx: -1, dy: -1 } // up-left
  ];

  // helper function to perform BFS
  function bfs(startX, startY) {
    const queue = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      for (const { dx, dy } of directions) {
        let newX = x + dx;
        let newY = y + dy;

        if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
          const neighborKey = `${newX},${newY}`;

          // check if the neighbor is non-empty and not visited
          if (grid[newY][newX].type !== "E" && !visited.has(neighborKey)) {
            // add a random edge between (x, y) and (newX, newY)
            if (grid[y][x].type !== "L" && grid[newY][newX].type !== "L") {
              const edgeClass = edgeClasses[Math.floor(Math.random() * edgeClasses.length)];
              if (grid[y][x].type == "B") {
                let newEdge = cy.add({ group: 'edges', data: { class: edgeClass, source: grid[y][x].node.id(), target: grid[newY][newX].node.id() } }); // add edge
              }
              else if (grid[newY][newX].type == "B") {
                let newEdge = cy.add({ group: 'edges', data: { class: edgeClass, source: grid[newY][newX].node.id(), target: grid[y][x].node.id() } }); // add edge
              }
            }
            // mark the neighbor as visited and add it to the queue
            visited.add(neighborKey);
            queue.push({ x: newX, y: newY });
          }
        }
      }
    }
  }

  // Start BFS from a random node
  const startNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].type !== "E" && grid[y][x].type !== "L") {
        startNodes.push({ x, y });
      }
    }
  }

  // Shuffle the start nodes to randomize BFS starting points
  startNodes.sort(() => Math.random() - 0.5);

  for (const node of startNodes) {
    if (!visited.has(`${node.x},${node.y}`)) {
      bfs(node.x, node.y);
    }
  }

  // add extra edges 
  startNodes.sort(() => Math.random() - 0.5);
  const mainDirections = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
  ];
  for (let i = 0; i < Math.ceil(startNodes.length / 4); i++) {
    const { x, y } = startNodes[i];
    for (const { dx, dy } of mainDirections) {
      let newX = x + dx;
      let newY = y + dy;
      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "B") {
        let edgeExist = grid[newY][newX].node.edgesWith(grid[y][x].node).length > 0;
        if (!edgeExist) {
          const edgeClass = edgeClasses[Math.floor(Math.random() * edgeClasses.length)];
          let newEdge = cy.add({ group: 'edges', data: { class: edgeClass, source: grid[newY][newX].node.id(), target: grid[y][x].node.id() } }); // add edge
          break;
        }
      }
    }
  }
  return edges;
};

// function to add random edges between process and EPNs
let addRandomEdgesPD = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;
  let edgeClasses = ["consumption", "production", "modulation", "stimulation", "catalysis", "inhibition", "necessary stimulation"];
  const processCells = [];
  // find process places
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].type == "PN") {
        processCells.push({ x, y });
      }
    }
  }

  // Shuffle the process cells
  processCells.sort(() => Math.random() - 0.5);

  // directions
  const directions = [
    { dx: 1, dy: -1 }, // up-right
    { dx: 1, dy: 1 },  // down-right
    { dx: -1, dy: 1 }, // down-left
    { dx: -1, dy: -1 } // up-left
  ];

  
  for (let i = 0; i <  Math.ceil(processCells.length / 4); i++) {
    let neighborsEPN = [];
    const { x, y } = { x: processCells[i].x, y: processCells[i].y };
    for (const { dx, dy } of directions) {
      let newX = x + dx;
      let newY = y + dy;

      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && grid[newY][newX].type == "EPN" && grid[newY][newX].node.data("class") != "source and sink") {
        neighborsEPN.push(grid[newY][newX].node);
      }
    }
    if (neighborsEPN.length > 0 && Math.random() < 0.75) {
      for (let j = 0; j < neighborsEPN.length; j++) {
        let edgeClass = edgeClasses[Math.floor(Math.random() * edgeClasses.length)];
        if (edgeClass == "production") {
          if (neighborsEPN[j].data("class") != "perturbing agent") {
            let newEdge1 = cy.add({ group: 'edges', data: { class: edgeClass, source: grid[y][x].node.id(), target: neighborsEPN[j].id() } }); // add production arc
          }
        } else {
          let newEdge1 = cy.add({ group: 'edges', data: { class: edgeClass, source: neighborsEPN[j].id(), target: grid[y][x].node.id() } }); // add other types of arc
        }
      }
    }
  }
}

///  --- Complexes will be added only for PD --- ///
// function to replace some nodes to complexes
let addComplexes = function (grid, cy) {
  const rows = grid.length;
  const cols = grid[0].length;

  // first try to add association and dissociation
  const processNodes = cy.nodes().filter(node => {
    if (node.data("class") == "process" || node.data("class") == "omitted process" || node.data("class") == "uncertain process") {
      return true;
    } else {
      return false;
    }
  });

  // association
  let isAssociationAdded = false;
  for (let i = 0; i < processNodes.length; i++) {
    let processNode = processNodes[i];
    let incomers = cy.collection();
    let outgoers = cy.collection();
    processNode.incomers().edges().forEach((edge, i) => {
      if(edge.data("class") == "consumption" && (processNode.incomers().nodes()[i].data("class") == "macromolecule" || processNode.incomers().nodes()[i].data("class") == "simple chemical")) {
        incomers.merge(edge);
      }
    });
    processNode.outgoers().edges().forEach((edge, i) => {
      if(edge.data("class") == "production" && (processNode.outgoers().nodes()[i].data("class") == "macromolecule" || processNode.outgoers().nodes()[i].data("class") == "simple chemical")) {
        outgoers.merge(edge);
      }
    });
    if(incomers.length > 1 && outgoers.length > 0) {  // we can replace with association
      isAssociationAdded = true;
      processNode.data("class", "association");
      let incomerNodes = incomers.sources();
      let outgoingNode = outgoers.target()[0];
      outgoingNode.data("label", incomerNodes[0].data("label"));
      outgoingNode.data("class", incomerNodes[0].data("class"));
      let parent = outgoingNode.parent();
      let newNode1 = cy.add({ group: 'nodes', data: { class: incomerNodes[1].data("class"), label: incomerNodes[1].data("label"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: outgoingNode.position().x, y: outgoingNode.position().y} }); // add second node for complex
      let newNode2 = cy.add({ group: 'nodes', data: { class: "complex", label: setLabel("complex"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: outgoingNode.position().x, y: outgoingNode.position().y } }); // add complex
      if(parent.length > 0) {
        newNode2.move({parent: parent.id()});
      }
      outgoingNode.move({parent: newNode2.id()});
      newNode1.move({parent: newNode2.id()});
      outgoingNode.shift({x: 0, y: -(outgoingNode.height()/2 + 12)});
      newNode1.shift({x: 0, y: (outgoingNode.height()/2 + 12)});
      outgoingNode.incomers().edges().move({target:newNode2.id()});
      outgoingNode.outgoers().edges().move({source:newNode2.id()});
    }
  }
  // try dissociation
  let isDissociationAdded = false;
  if (!isAssociationAdded) {
    for (let i = 0; i < processNodes.length; i++) {
      let processNode = processNodes[i];
      let incomers = cy.collection();
      let outgoers = cy.collection();
      processNode.incomers().edges().forEach((edge, i) => {
        if(edge.data("class") == "consumption" && (processNode.incomers().nodes()[i].data("class") == "macromolecule" || processNode.incomers().nodes()[i].data("class") == "simple chemical")) {
          incomers.merge(edge);
        }
      });
      processNode.outgoers().edges().forEach((edge, i) => {
        if(edge.data("class") == "production" && (processNode.outgoers().nodes()[i].data("class") == "macromolecule" || processNode.outgoers().nodes()[i].data("class") == "simple chemical")) {
          outgoers.merge(edge);
        }
      });
      if(incomers.length > 0 && outgoers.length > 1) {  // we can replace with association
        isDissociationAdded = true;
        processNode.data("class", "dissociation");
        let incomerNode = incomers.sources()[0];
        let outgoingNodes = outgoers.targets();
        incomerNode.data("label", outgoingNodes[0].data("label"));
        incomerNode.data("class", outgoingNodes[0].data("class"));
        let parent = incomerNode.parent();
        let newNode1 = cy.add({ group: 'nodes', data: { class: outgoingNodes[1].data("class"), label: outgoingNodes[1].data("label"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: incomerNode.position().x, y: incomerNode.position().y} }); // add second node for complex
        let newNode2 = cy.add({ group: 'nodes', data: { class: "complex", label: setLabel("complex"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: incomerNode.position().x, y: incomerNode.position().y } }); // add complex
        if(parent.length > 0) {
          newNode2.move({parent: parent.id()});
        }
        incomerNode.move({parent: newNode2.id()});
        newNode1.move({parent: newNode2.id()});
        incomerNode.shift({x: 0, y: -(incomerNode.height()/2 + 12)});
        newNode1.shift({x: 0, y: (incomerNode.height()/2 + 12)});
        incomerNode.incomers().edges().move({target:newNode2.id()});
        incomerNode.outgoers().edges().move({source:newNode2.id()});
      }
    }
  }

  if (!isAssociationAdded && !isDissociationAdded) {
    let candidates = cy.edges("[class = 'modulation']");
    let selectedNode;
    if (candidates.length > 0) {
      selectedNode = candidates[0].source();
    }
    if(selectedNode && (selectedNode.data("class") == "macromolecule" || selectedNode.data("class") == "simple chemical")) {
      let parent = selectedNode.parent();
      let newNode1 = cy.add({ group: 'nodes', data: { class: "complex", label: setLabel("complex"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: selectedNode.position().x, y: selectedNode.position().y } }); // add complex
      selectedNode.incomers().edges().move({target:newNode1.id()});
      selectedNode.outgoers().edges().move({source:newNode1.id()});
      let newNode2 = cy.add({ group: 'nodes', data: { class: selectedNode.data("class"), label: setLabel(selectedNode.data("class")), "stateVariables": [], "unitsOfInformation": [] }, position: { x: selectedNode.position().x, y: selectedNode.position().y} }); // add second node for complex
      let newNode3 = cy.add({ group: 'nodes', data: { class: selectedNode.data("class"), label: setLabel(selectedNode.data("class")), "stateVariables": [], "unitsOfInformation": [] }, position: { x: selectedNode.position().x, y: selectedNode.position().y} }); // add second node for complex
      if(parent.length > 0) {
        newNode1.move({parent: parent.id()});
      }
      newNode2.move({parent: newNode1.id()});
      newNode3.move({parent: newNode1.id()});
      newNode2.shift({x: 0, y: -(newNode2.height()/2 + 12)});
      newNode3.shift({x: 0, y: (newNode3.height()/2 + 12)});
      selectedNode.remove();
    }
  }

  cy.fit(cy.elements(), 30);
};

// function to add compartment
let addCompartment = function (grid, cy) {
  const rand1 = Math.random();
  if (rand1 < 0.5) { // add a compartment
    const rand2 = Math.random();
    if (rand2 < 0.5) {  // add compartment to whole graph
      let newNode = cy.add({ group: 'nodes', data: { class: "compartment", label: setLabel("compartment"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: (grid.length - 1) * 200 / 2, y: (grid[0].length - 1) * 200 / 2 } }); // add compartment node
      cy.nodes().move({parent: newNode.id()});
      if(newNode.descendants().length == 0) {
        newNode.remove();
      }
    }
    else {
      let horizontal = {start: Math.floor(Math.random() * Math.ceil(grid[0].length / 2)), end: Math.floor(Math.floor(grid[0].length / 2) + Math.random() * Math.ceil(grid[0].length / 2))};
      let vertical = {start: Math.floor(Math.random() * Math.ceil(grid.length / 2)), end: Math.floor(Math.floor(grid.length / 2) + Math.random() * Math.ceil(grid.length / 2))};
      let newNode = cy.add({ group: 'nodes', data: { class: "compartment", label: setLabel("compartment"), "stateVariables": [], "unitsOfInformation": [] }, position: { x: (grid.length - 1) * 200 / 2, y: (grid[0].length - 1) * 200 / 2 } }); // add compartment node
      for(let i = vertical.start; i <= vertical.end; i++ ) {
        for(let j = horizontal.start; j <= horizontal.end; j++ ) {
          if (grid[j][i].type != "E") {
            grid[j][i].node.move({parent: newNode.id()});
          }
        }
      }
      if(newNode.descendants().length == 0) {
        newNode.remove();
      }
    }
  }

  cy.fit(cy.nodes(), 30);
};

// image content is base64 data and imageType is png/jpg
let saveImage = function (imageContent, imageType) {
  // see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
  function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    let byteCharacters = atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);

      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      let byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    let blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  let blob;
  if (imageType == "svg") {
    blob = new Blob([imageContent], { type: "image/svg+xml;charset=utf-8" });
  }
  else {
    // this is to remove the beginning of the pngContent: data:img/png;base64,
    let b64data = imageContent.substr(imageContent.indexOf(",") + 1);
    blob = b64toBlob(b64data, "image/" + imageType);
  }

  return blob;
};

// save graph as CyJSON
let saveJSON = function (jsonContent, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(jsonContent, null, 2)], {
    type: "text/plain"
  }));
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

let setLabel = function (nodeClass) {
  if (nodeClass == "biological activity" || nodeClass == "macromolecule") {
    return geneList[Math.floor(Math.random() * geneList.length)];
  } else if (nodeClass == "simple chemical") {  // simple chemical
    return simpleChemicalList[Math.floor(Math.random() * simpleChemicalList.length)];
  } else if (nodeClass == "perturbing agent") {  // perturbing agent
    return perturbingAgentList[Math.floor(Math.random() * perturbingAgentList.length)];
  } else if (nodeClass == "phenotype") {  // phenotype
    return phenotypeList[Math.floor(Math.random() * phenotypeList.length)];
  } else if (nodeClass == "unspecified entity") {  // unspecified entity
    return unspecifiedEntityList[Math.floor(Math.random() * unspecifiedEntityList.length)];
  } else if (nodeClass == "nucleic acid feature") {  // nucleic acid feature
    return nucleicAcidFeatureList[Math.floor(Math.random() * nucleicAcidFeatureList.length)];
  } else if (nodeClass == "compartment") {  // compartment
    return compartmentList[Math.floor(Math.random() * compartmentList.length)];
  } else {
    return "";
  }
};

const geneListRaw = ["MYP17", "CD14", "LINC01559", "ZNF771", "FXYD1", "UBE2Q1", "LINC00475", "KCNQ5-IT1", "TCN2", "TXNDC2", "LINC00680", "NPIPB4", "AGRN", "ELOVL5", "CNOT10-AS1", "TEX22", "TMEM255B", "ZNF320", "TCL4", "RELL2", "DFNB66", "MED4", "GTPBP4", "INPPL1", "SLC38A4", "KIF25-AS1", "OR52N2", "DSCR3", "SOX9-AS1", "TMCC3", "MYOT", "SLC7A6OS", "MED11", "KIF15", "BMS1", "POLDIP2", "HAO2", "PLEKHH3", "CST1", "TMX2-CTNND1", "RAPH1", "MAN1A1", "ACKR3", "ZBED2", "TSPY4", "LAMC3", "OCLN", "C5orf63", "RAB3IP", "NLRP13", "C3orf70", "SLC30A3", "DCTPP1", "FNDC1-IT1", "KBTBD3", "TSNARE1", "SHANK2-AS3", "THEMIS", "HSBP1L1", "RBX1", "BDP1", "MBNL2", "LINC01300", "HAO1", "BOP1", "CELSR1", "LINC00470", "SFTPD", "MUC1", "NMUR1", "DERL2", "WBSCR2", "CBLN1", "ANGPT1", "ZNF235", "FOXI3", "ADGRF4", "POU4F2", "WNT8B", "ANGEL1", "SNORD76", "ZNF501", "CASC5", "SSBP3", "MACROD2-IT1", "MAP1LC3A", "IFI6", "SNORD12", "SAC3D1", "ST6GALNAC5", "RIMS4", "C8orf46", "LHX5-AS1", "TRBV4-2", "TRIM38", "ZRANB1", "POLK", "PRR20E", "PUSL1", "REEP2", "OR10G4", "STARD3NL", "FAAH", "ARG2", "NGFR", "METAP1D", "CAPNS1", "VTRNA1-2", "ZSCAN25", "TXNRD1", "SDIM1", "ADRM1", "XYLT1", "NAALADL2", "SAMD13", "FOXN2", "CCKBR", "WNT9B", "DFNB17", "PIRC57", "TMPPE", "ADAM23", "KRTAP3-2", "KIR2DL3", "UBXN10", "AACS", "HIST1H1C", "TMEM143", "RBMY1J", "SPP2", "OR5P2", "FRA2J", "EIF2B4", "NHLRC4", "GTF2H2C_2", "NCAPH", "TAF8", "SNORD142", "PEX7", "TBL3", "DHRSX-IT1", "P3H3", "CLDN4", "WDR4", "AKNA", "TXLNB", "TTC3-AS1", "YPEL1", "SAMSN1-AS1", "CD5L", "SEPHS2", "TRV-CAC14-1", "TRGV3", "TKTL2", "HCL2", "YES1", "SKA1", "TAF4B", "HOXA4", "LINC01076", "DGCR12", "TATDN1", "COX10-AS1", "C9orf84", "DPP10-AS3", "CDK18", "LACE1", "TSSC4", "SCNN1D", "ABCA9-AS1", "NOVA1-AS1", "FBXL2", "RHCE", "MTFP1", "ZMYM2", "OR6C68", "TRAPPC3", "GAS2L2", "TAX1BP3", "ZNF639", "CEP170", "VWDE", "VPS37C", "ERVK-8", "TRR-CCT5-1", "DEFB103B", "CNTF", "PPP2CA", "TRA-AGC14-1", "PAPOLA", "SYCE2", "RBPMS", "GTF3C6", "CARTPT", "GCN1", "LYPD4", "PPP4C", "ATG3", "PIRC102", "SCIN", "OVGP1", "C7orf61", "TRA", "SLC44A1", "IGFL1", "SPINK6", "LINC01123", "ANIB1", "ITPKC", "PSRC1", "SLC35E3", "OR51I1", "TNFAIP8L1", "DNAJC10", "FRA12C", "KRT27", "CKMT1B", "LINC01189", "UNC119B", "TRA-TGC4-1", "GALNT15", "USE1", "UBAP2L", "IRAIN", "GPR137", "LINC00488", "APBA1", "TGFB2-AS1", "SMAD6", "LHX9", "DCAF4L2", "LINC00367", "LZTS1-AS1", "TMEM213", "PSMB9", "FAM111B", "ZNF524", "DLGAP4", "WIPF1", "ZNF512B", "VWA5B2", "OR8B2", "TRT-AGT1-1", "CIPC", "TYMP", "PEPE", "ZNF565", "TMEM14C", "PANX3", "MYOM2", "HTR2B", "GALNT9", "SCGB3A1", "ATP1B2", "AIFM2", "TPRXL", "NALT1", "FAM179B", "CPSF7", "PTAFR", "C6orf203", "PSMD14", "ABCA12", "SERPINB1", "STEAP3-AS1", "HDC", "TLE1", "TCP10L", "TTN-AS1", "HEPHL1", "AVPR1A", "SUSD1", "CASC20", "ZDHHC12", "DDX25", "TRBV7-3", "SRGAP3-AS2", "FAM84A", "FTH1", "HSD17B13", "OR8K5", "WDR53", "GNPTG", "DDX47", "MRPL28", "PRAMEF20", "LINC01591", "CDH24", "LINC01618", "MRT19", "C11orf21", "TMEM63C", "ARL1", "BTNL3", "OXR1", "VPREB3", "TMEM156", "MYF6", "HSD17B11", "CDKL4", "EPPIN-WFDC6", "ZNF365", "PPP3CC", "DHRS4", "DEFB129", "SLC25A25", "DYX4", "LRRC52", "C1orf158", "NMBR", "HLA-DOA", "NRON", "DMRT1", "TRGJP", "NSMF", "IGHGP", "G6PC2", "INF2", "ACAT1", "POLR3GL", "OR9G4", "GPC5", "LINC01433", "FRMD5", "HSF2", "SNORD115-9", "RPL26L1", "LIM2", "GALNT2", "CXCL17", "CRYBA1", "ZBTB4", "TCHP", "BRMS1L", "MPLKIP", "CYP2W1", "HAGHL", "VTCN1", "KRT84", "SOX11", "E2F8", "TERF2IP", "MIP", "RPS16", "VAPA", "MRPS33", "LINC01097", "CCND2-AS2", "SLC35E1", "LACTBL1", "CAMK1", "RORA", "TPRA1", "LRRC41", "ATF5", "FOXK1", "PRNP", "AFM", "MRPL45", "NUP205", "RPS6", "FOXI2", "NGDN", "OR52E6", "IHH", "LINC01268", "BUB1B", "RNF217-AS1", "MAP2K2", "MITD1", "ZNF684", "IL25", "TIMM44", "CASQ1", "SLC24A2", "SYN3", "YOD1", "TRS-CGA1-1", "MYPN", "NEDD8", "FAM198B", "FRA10G", "ENPP6", "CCDC70", "GLI4", "PIN1", "TRK-TTT3-5", "RSPH9", "SNORD116-7", "DIAPH1", "COMP", "CACNA1C", "TMED6", "DYT21", "TP53", "DYT17", "SYCE3", "MYRFL", "RASAL2-AS1", "FRA11H", "ZC3H12A", "TRBV7-7", "OXCT2", "ZNF212", "A4GNT", "CBX7", "KIF2C", "VIPR2", "LINC01037", "OCM2", "GFRA1", "SPP1", "SNORD3C", "SLC4A2", "FAM136A", "PTGES2", "IZUMO2", "PLPP4", "PRSS45", "NR1I3", "SNRPD1", "NDUFC2", "FGF23", "TMEM62", "SNORD75", "UGT1A9", "ZZZ3", "CDC42-IT1", "ITIH4-AS1", "KIN", "DZANK1", "IFT20", "AHCTF1", "FRA11A", "CKS1B", "PCDHA3", "CCDC155", "PROCR", "CST5", "C17orf102", "SLC39A14", "LKAAEAR1", "PCDHA11", "CRNKL1", "ASPRV1", "C16orf45", "ETAA1", "PCGF5", "ACAP1", "CCDC92B", "MAPKAPK5", "DNAJB13", "CALML5", "ZNF691", "SLC2A4", "PKD2L1", "ANKRD46", "KLK2", "SCIMP", "NNMT", "PRSS21", "ATAD3B", "CYP8B1", "TRAJ61", "PAM16", "KCNG1", "SYNCRIP", "GZMB", "FAM134A", "SMPDL3A", "CDH19", "CHN1", "B3GALT4", "TEX15", "RHOB", "GIMAP6", "INPP5D", "PGAP2", "OR2M2", "CAPZA2", "SKP1", "CFAP77", "FAF1", "CXCR6", "MTL5", "EMC1", "NAMPT", "TRIM41", "RASA4", "C1QL2", "UPP2-IT1", "PTPN2", "SNORD159", "SNORD105B", "CNTNAP3", "LTV1", "BTBD16", "OOEP", "DFNA27", "SGPP1", "LINC00852", "WFDC13", "KMT5A", "ATOH7", "CDH11", "PDCD11", "SLCO2B1", "SPATA31A5", "MYBPH", "ALG14", "PPM1B", "HERC3", "ZNF474", "SCARNA27", "TTTY4B", "GOPC", "PI4KA", "DDAH1", "TMPRSS5", "LINC01430", "TUBA4B", "PDCD7", "MYO15B", "SLN", "METTL2A", "PIRC43", "HIST1H2BK", "KIR2DS4", "FAM222A", "PPP6R2", "TRK-CTT2-3", "MRPL32", "EWSR1", "PHLDA2", "MYL2", "LRRN4", "PPA2", "SAMHD1", "WSB2", "ENTHD1", "C19orf70", "PEMT", "TRG-TCC2-3", "ZNF705A", "FBXL14", "SF3A1", "HCG9", "APH1B", "LAMA4", "LAMP5-AS1", "ZNF800", "DOC2A", "UBXN10-AS1", "COMMD3", "SPACA3", "HSPB7", "SIKE1", "EGLN1", "CADPS2", "APOA4", "SNORA18", "HS3ST4", "ZNF90", "KCNJ8", "RFPL3", "C2-AS1", "HECTD3", "TENM4", "DISC1FP1", "ZNF793", "EPN2-IT1", "CDK5RAP3", "PRAMEF14", "EPG5", "MARCH6", "CAPNS2", "SPRR2F", "RGPD4-AS1", "AIDA", "TRAJ54", "AATBC", "PACRG-AS2", "TMC3", "GOLGA4", "SPG14", "ECSCR", "TRQ-TTG9-1", "TPRG1-AS1", "ATP2B2", "FYN", "DDB1", "RNASEH2C", "C7", "GMDS-AS1", "SOCS6", "SLC36A1", "MGAT4C", "IGF2-AS", "SPPL2A", "TMEM52B", "PPP2R5C", "ELMO1-AS1", "SNAR-B2", "DDX6", "LINC00472", "CNNM1", "KIAA0556", "TOX3", "HCG11", "LDLRAD2", "LINC00705", "ZFP30", "OR2T27", "IGHJ4", "LINC01293", "ACTL10", "FRA7G", "SCAR6", "C18orf8", "GPR18", "TMEM209", "GNAS-AS1", "SPIDR", "CSNK1G3", "UBE2N", "FAM120B", "KRR1", "SLC4A9", "MRPL20", "MARS", "C9orf72", "ZYX", "DFNY1", "DEFB135", "SGCZ", "SLC39A2", "DEFB104B", "OR4N2", "OR1D5", "CDC42SE2", "RASSF2", "TTTY21B", "C1orf95", "TRY-GTA3-1", "KMT5B", "SLC9C2", "KCNQ1-AS1", "HOXD13", "SNORD114-16", "SHKBP1", "EME2", "HES2", "PIPOX", "KRTAP5-2", "EFCC1", "LINC01354", "KIAA1211", "TRT-TGT5-1", "SHOX", "SEC62-AS1", "RPP40", "JPH4", "SPECC1", "IGF1R", "PSMD2", "FKTN", "FCHSD1", "SCRN1", "ZC2HC1C", "ATP1B1", "RNF146", "UBR5", "HPV18I1", "SPACA1", "PDE3A", "PATZ1", "CLDN25", "SUGCT", "PRMT1", "ST6GALNAC3", "TRA-TGC2-1", "GJA3", "PCDH7", "KCNH2", "PRR33", "HIF1A", "BID", "TRIT1", "HIST1H2AE", "SNX4", "RUSC1-AS1", "SPG19", "LINC01298", "TRR-CCG1-2", "RPRD2", "LIPA", "CDK5R1", "LINC01075", "ST8SIA5", "ZNF256", "UBXN11", "FEM1C", "MAML3", "OR2A7", "SNX9", "CASR", "RAD51AP2", "NUB1", "NPTX2", "ASB17", "NXPH4", "MTHFD1", "FBXO4", "ZNF462", "NGEF", "SUOX", "CYHR1", "KNG1", "SYT6", "TRIB3", "OR5B17", "MTX3", "PCDHB5", "SNTB1", "PKD3", "SMARCAL1", "ZDHHC24", "TRP-AGG2-8", "FADS6", "PPFIBP2", "ZNF165", "AGPAT4", "SNORD115-10", "NCOR2", "QPRT", "LCN9", "NADK2-AS1", "CTRL", "STK17A", "DEFA1A3", "SATB2-AS1", "TRAJ46", "NPM2", "LARGE-AS1", "LINC01350", "LINC00596", "LINC00567", "FAM81B", "C1orf134", "MGAT4B", "SYPL1", "CACNB3", "HMGCL", "SPATA31D1", "CCDC181", "LDHB", "CPN1", "LINC00278", "MAN2B2", "EVX1-AS", "DBR1", "GCHFR", "SNORA11B", "MER5", "PACSIN3", "FAM71F2", "CDCA5", "TMEM109", "HSPA9", "DEFB136", "CLPB", "MYPOP", "MINK1", "MAP7", "ATF3", "FAM118A", "XRCC3", "EIF2B1", "STAP1", "EVI5L", "ANO10", "TRI-TAT2-2", "MMP15", "ABCB5", "LENG8", "LINC01517", "ORC1", "PLCD1", "SBSN", "ITPR3", "MIC12", "MYCNUT", "GTF3C5", "CYTIP", "ADAM19", "DCLRE1B", "GSN-AS1", "STATH", "RPS27A", "DUX4L9", "RPL13", "HEXB", "KRT24", "LINC00226", "LINC01580", "TRY-GTA5-3", "H2AFY", "USP18", "FBLN1", "TNP2", "FBXL22", "FGD5", "C12orf80", "ARHGAP31-AS1", "FAM60A", "TRBV5-4", "PRICKLE2-AS1", "BTBD19", "HOXB5", "BMP3", "SCARB2", "TPD52", "MYO5C", "LINC00961", "SYTL2", "KRTAP23-1", "C10orf131", "CEP135", "MYB-AS1", "PLA2G1B", "VWA3B", "BAMBI", "WBSCR27", "POLR2J2", "SASH1", "RPL18A", "ZC3H3", "GOLGA8F", "DOK6", "FTCD-AS1", "PMPCA", "MBD3L4", "ZBTB5", "LINC00348", "DGKB", "CRHR2", "EIF3C", "OR4A15", "ADAM7", "SMIM11A", "PDGFD", "FAM83H-AS1", "SRSF7", "BMP2", "OR6C76", "LMOD2", "RN7SL2", "POLR3B", "STK19", "PATE4", "KCNE1B", "SPATA31A7", "FOXA3", "LINC00987", "ZNF30", "CTPS1", "RPF2", "ANKRD54", "RNU6-9", "SNORD138", "C14orf169", "IL22", "TRIM2", "MBD3L2", "NMTRQ-TTG12-1", "RNF111", "PRKAR1B", "SLC6A2", "SMG7-AS1", "CERS6", "GNB2", "INSRR", "CAMTA1-IT1", "JPD", "TXNDC15", "LINC00842", "CEBPZOS", "MKRN3-AS1", "SMAD4", "MYL1", "SFTPA1", "ERCC6-PGBD3", "ALDH3A1", "EIF3A", "MRPS30", "CRYGA", "PTPN1", "ENPEP", "HEATR4", "MROH7", "SPPL2C", "ZNF99", "RNU12", "SNORD116-22", "DDX60", "PMEL", "DOT1L", "IGLV3-10", "SNHG24", "LINC00242", "HSPA8", "PPT1", "CHRNA6", "ZNF654", "CACNA1S", "RPL17", "P4HA2-AS1", "CX3CL1", "SOWAHC", "ZNRF1", "GRM7-AS1", "MYO16", "LINC01355", "GABRR2", "DFNA18", "PHC3", "LEPR", "ARHGEF10L", "SNCA-AS1", "AP4S1", "GLCE", "LTF", "PIK3R1", "ERVE-4", "EFCAB14-AS1", "BPY2B", "APOBEC3A_B", "SPATA18", "CCDC180", "LINC00615", "KY", "NKILA", "LINC01017", "SETD5", "CORO7", "NQO2", "MS4A8", "ZBTB48", "ZSCAN29", "A3GALT2", "CER1", "SAXO2", "RASL11B", "TFAP2E", "INMT", "FBXO31", "SLC35G4", "AANAT", "PCDHB8", "N6AMT1", "UBE2K", "TBCA", "CCDC153", "LINC00654", "CNOT4", "AIG1", "TRK-CTT15-1", "TMEM18", "GPR89B", "PTGFRN", "KCND3-IT1", "LAPTM4A", "NOP14-AS1", "ERF", "PCDH15", "VOPP1", "PA2G4", "SLC25A21", "DAOA", "PTBP3", "LINC00235", "WSB1", "SUSD3", "MED1", "SCARNA10", "ACTA1", "C19orf12", "DSG2-AS1", "LINC01335", "UNC5C", "MYO1G", "ETHE1", "TRGV1", "STMND1", "DFNA57", "SLC23A1", "KDM7A", "SNORA90", "ZNF273", "SUGT1"];

let geneList = geneListRaw.filter(str => str.length <= 7); // returns 817 genes

const simpleChemicalList = [
  "Acetate", "Acetone", "Adenine", "Adenosine", "Amino\nacid", "Aspartate", 
  "ATP", "Benzene", "Citrate", "Cholesterol", "Citric\nacid", "Cysteine", "DNA", "Dopamine", "Ethanol", "Folic\nacid", "Fructose", "Galactose", "Glucose", "Glutamine", "Glutamate", "Glycine", "Glycerol", "Histamine", "Histidine", "Inositol", "Lactate", "Lactose", "Leucine", "Malate", "NAD+", "NADH", "NADP+", "NADPH", 
  "Phosphate", "Proline", "Pyruvate", "Ribose", "Serine", "Sucrose", "Taurine", "Threonine", "Tyrosine", "Uracil", "Uric\nacid", "Ureide", "Urea", "Uridine", "Vitamin A", "Vitamin B1", "Vitamin B2", "Vitamin B6", "Vitamin B12", 
  "Vitamin C", "Vitamin D", "Vitamin E", "Vitamin K", "Zinc", "Aspirin", "Caffeine", "Calcium", "Carnosine", "Choline","Curcumin", "Dandelion", "Dextrose", "GABA", "Glycogen", "Insulin", "Leptin", "Lysine", "Melatonin", "Metformin", "Oleic\nacid", "Oxalate", "Urolithin", "Valine", "Vanillin", "Vitamin B5", "Vitamin B9", "Zinc\nsulfate", "Ammonia", "Amylase", "ATPase", "Biotin", "Butanol", "Carotene", "Carnitine", "Chloride", "Cobalt",  "Fumarate", "Indole", "Iodine", "Lactic\nacid", "Maltose", "Manganese", "Methanol", "Nicotine", "PABA", "Pentose", "Phenol", "Sulfate", "Toluene"
];

const perturbingAgentList = [
  "External\nStimulus", "Stress", "Genetic\nMutation", "Drug\nTreatment", "Chemical\nExposure", "Insulin", "Growth\nFactor", "Cytokine", "Hormone", "Toxin", "Viral\nInfection", "Bacterial\nInfection", "Radiation", "Heat\nShock", "Cold\nShock", "Hypoxia", "Aspirin", "Ibuprofen", "Paracetamol", "Morphine", "Codeine", "Steroid"
];

const nucleicAcidFeatureList = [
  "Clm", "Tetm", "Laclm", "Chromosome", "IRF1", "IRF1-GAS", "R4", "R2", "R3", "R1", "CP", "iNOS", "mRNA"
];

const unspecifiedEntityList = [
  "unfolded\nprotein", "p-T-AKT", "AKT", "GSK3", "iNOS", "CaM", "receptors", "antigen", "gluten", "Th2", "CD4+", "DNA\ndamage", "EDCs", "mRNA", "e1AD", "e3AD", "m1AD", "n2AD", "CO2", "MMSO4", "m8GN", "Ub"
];

const phenotypeList = ["Apoptosis", "Necrosis", "Autophagy", "DNA repair", "Myogenesis", "Cytokine\nstorm",
  "Protein\naggregation", "Atrophy", "DNA\ndamage\nresponse", "ER stress", "Hypertrophy", "Fibrosis", "Tumor\nregression", "Insulin\nresistance", "Lipid\naccumulation", "Immune\nsuppression", "Autoimmune\nreaction", "Angiogenesis", "Cell\ncycle\narrest", "Cellular\nsenescence", "Metastasis", "Protein\nmisfolding", "Acidosis", "Hypoxia", "Oxidative\nstress", "Inflammation", "Immune\nsuppression", "Cell\nproliferation", "Cytotoxicity", "Lipid\naccumulation"]; // 30 phenotypes

let compartmentList = ["Cytoplasm", "Nucleus", "Mitochondria", "ER", "Muscle cytosol", "Synaptic cleft",
  "Synaptic button", "Neuron", "Nucleoplasm", "Cytosol", "Juxtanuclear inclusion", "Extracellular", "Peroxisome", "Inner membrane", "Outer membrane"]; // 15 compartments