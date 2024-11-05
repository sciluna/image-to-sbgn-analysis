function getCheckedRadio(name) {
	// Get all radio buttons with the name 'language'
	const radios = document.getElementsByName(name);
	
	// Loop through the radio buttons and return the one that's checked
	for (let i = 0; i < radios.length; i++) {
			if (radios[i].checked) {
					return radios[i].value; // Get the label text (PD or AF)
			}
	}
	return null; // If none are checked
}

document.getElementById("runExp").addEventListener("click", async function (event) {

  let selectedLLM = getCheckedRadio("llm");
  let selectedLang = getCheckedRadio("language");
  let selectedPrep = getCheckedRadio("preprocessing");
  let selectedICL = getCheckedRadio("icl");

  console.log(selectedLLM);
  console.log(selectedLang);
  console.log(selectedPrep);
  console.log(selectedICL);

  let data = {
    llm: selectedLLM,
    language: selectedLang,
    prep: selectedPrep,
    icl: selectedICL
  }

  let response = await sendRequest(data);
});

let sendRequest = async function (data){
	let url = "http://localhost:5000/";

	const settings = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'text/plain'
		},
		body: JSON.stringify(data)
	};

	let res = await fetch(url, settings)
	.then(response => response.json())
	.then(result => {
		return result;
	})
	.catch(e => {
		console.log("Error!");
	});

	return res;
};