document.getElementById("generate-btn").addEventListener("click", function () {
  let rows = document.getElementById("num-rows").value;
  let cols = document.getElementById("num-cols").value;
  let numOfSamples = document.getElementById("num-samples").value;
  for (let i = 0; i < numOfSamples; i++) {
    generate(rows, cols, i+1);
  }
});

let generate = function(rows, cols, index){
  let grid = [];
  //console.log(cytoscapeSbgnStylesheet.call(cytoscape));
  let cy = cytoscape({
    container: document.getElementById('cy'),
    style: cytoscapeSbgnStylesheet(cytoscape)
  });

  // fill grid 
  for (let i = 0; i < rows; i++) {
    grid[i] = [];

    for (let j = 0; j < cols; j++) {
      let rand1 = Math.random();
      // if there will be a node or not in the grid point
      if (rand1 < 0.5) {
        let rand2 = Math.random();
        let nodeClass = "";
        // decide node class
        if (rand2 < 0.75) {
          nodeClass = "biological activity";
        } else {
          nodeClass = "phenotype";
        }
        grid[i][j] = nodeClass;
        console.log("adding node");
        cy.add({ group: 'nodes', data: {class: nodeClass, label: geneList[Math.floor(Math.random()*geneList.length)], "stateVariables": [], "unitsOfInformation": []}, position: { x: j * 200, y: i * 200 }}); // add node
      } else {
        grid[i][j] = 0;
      }
    }
  }

  cy.fit(cy.elements(), 30);
  let png = cy.png({full: false, bg: "white"});
  let blobData = saveImage(png, "png");
  //console.log(blobData);
  //saveAs(blobData, "sample" + index + ".png");
}

// image content is base64 data and imageType is png/jpg
let saveImage = function(imageContent, imageType){  
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
  if(imageType == "svg") {
    blob = new Blob([imageContent], {type:"image/svg+xml;charset=utf-8"}); 
  }
  else {
    // this is to remove the beginning of the pngContent: data:img/png;base64,
    let b64data = imageContent.substr(imageContent.indexOf(",") + 1);
    blob = b64toBlob(b64data, "image/"+imageType);      
  }

  return blob;
};

let geneListRaw = ["MYP17", "CD14", "LINC01559", "ZNF771", "FXYD1", "UBE2Q1", "LINC00475", "KCNQ5-IT1", "TCN2", "TXNDC2", "LINC00680", "NPIPB4", "AGRN", "ELOVL5", "CNOT10-AS1", "TEX22", "TMEM255B", "ZNF320", "TCL4", "RELL2", "DFNB66", "MED4", "GTPBP4", "INPPL1", "SLC38A4", "KIF25-AS1", "OR52N2", "DSCR3", "SOX9-AS1", "TMCC3", "MYOT", "SLC7A6OS", "MED11", "KIF15", "BMS1", "POLDIP2", "HAO2", "PLEKHH3", "CST1", "TMX2-CTNND1", "RAPH1", "MAN1A1", "ACKR3", "ZBED2", "TSPY4", "LAMC3", "OCLN", "C5orf63", "RAB3IP", "NLRP13", "C3orf70", "SLC30A3", "DCTPP1", "FNDC1-IT1", "KBTBD3", "TSNARE1", "SHANK2-AS3", "THEMIS", "HSBP1L1", "RBX1", "BDP1", "MBNL2", "LINC01300", "HAO1", "BOP1", "CELSR1", "LINC00470", "SFTPD", "MUC1", "NMUR1", "DERL2", "WBSCR2", "CBLN1", "ANGPT1", "ZNF235", "FOXI3", "ADGRF4", "POU4F2", "WNT8B", "ANGEL1", "SNORD76", "ZNF501", "CASC5", "SSBP3", "MACROD2-IT1", "MAP1LC3A", "IFI6", "SNORD12", "SAC3D1", "ST6GALNAC5", "RIMS4", "C8orf46", "LHX5-AS1", "TRBV4-2", "TRIM38", "ZRANB1", "POLK", "PRR20E", "PUSL1", "REEP2", "OR10G4", "STARD3NL", "FAAH", "ARG2", "NGFR", "METAP1D", "CAPNS1", "VTRNA1-2", "ZSCAN25", "TXNRD1", "SDIM1", "ADRM1", "XYLT1", "NAALADL2", "SAMD13", "FOXN2", "CCKBR", "WNT9B", "DFNB17", "PIRC57", "TMPPE", "ADAM23", "KRTAP3-2", "KIR2DL3", "UBXN10", "AACS", "HIST1H1C", "TMEM143", "RBMY1J", "SPP2", "OR5P2", "FRA2J", "EIF2B4", "NHLRC4", "GTF2H2C_2", "NCAPH", "TAF8", "SNORD142", "PEX7", "TBL3", "DHRSX-IT1", "P3H3", "CLDN4", "WDR4", "AKNA", "TXLNB", "TTC3-AS1", "YPEL1", "SAMSN1-AS1", "CD5L", "SEPHS2", "TRV-CAC14-1", "TRGV3", "TKTL2", "HCL2", "YES1", "SKA1", "TAF4B", "HOXA4", "LINC01076", "DGCR12", "TATDN1", "COX10-AS1", "C9orf84", "DPP10-AS3", "CDK18", "LACE1", "TSSC4", "SCNN1D", "ABCA9-AS1", "NOVA1-AS1", "FBXL2", "RHCE", "MTFP1", "ZMYM2", "OR6C68", "TRAPPC3", "GAS2L2", "TAX1BP3", "ZNF639", "CEP170", "VWDE", "VPS37C", "ERVK-8", "TRR-CCT5-1", "DEFB103B", "CNTF", "PPP2CA", "TRA-AGC14-1", "PAPOLA", "SYCE2", "RBPMS", "GTF3C6", "CARTPT", "GCN1", "LYPD4", "PPP4C", "ATG3", "PIRC102", "SCIN", "OVGP1", "C7orf61", "TRA", "SLC44A1", "IGFL1", "SPINK6", "LINC01123", "ANIB1", "ITPKC", "PSRC1", "SLC35E3", "OR51I1", "TNFAIP8L1", "DNAJC10", "FRA12C", "KRT27", "CKMT1B", "LINC01189", "UNC119B", "TRA-TGC4-1", "GALNT15", "USE1", "UBAP2L", "IRAIN", "GPR137", "LINC00488", "APBA1", "TGFB2-AS1", "SMAD6", "LHX9", "DCAF4L2", "LINC00367", "LZTS1-AS1", "TMEM213", "PSMB9", "FAM111B", "ZNF524", "DLGAP4", "WIPF1", "ZNF512B", "VWA5B2", "OR8B2", "TRT-AGT1-1", "CIPC", "TYMP", "PEPE", "ZNF565", "TMEM14C", "PANX3", "MYOM2", "HTR2B", "GALNT9", "SCGB3A1", "ATP1B2", "AIFM2", "TPRXL", "NALT1", "FAM179B", "CPSF7", "PTAFR", "C6orf203", "PSMD14", "ABCA12", "SERPINB1", "STEAP3-AS1", "HDC", "TLE1", "TCP10L", "TTN-AS1", "HEPHL1", "AVPR1A", "SUSD1", "CASC20", "ZDHHC12", "DDX25", "TRBV7-3", "SRGAP3-AS2", "FAM84A", "FTH1", "HSD17B13", "OR8K5", "WDR53", "GNPTG", "DDX47", "MRPL28", "PRAMEF20", "LINC01591", "CDH24", "LINC01618", "MRT19", "C11orf21", "TMEM63C", "ARL1", "BTNL3", "OXR1", "VPREB3", "TMEM156", "MYF6", "HSD17B11", "CDKL4", "EPPIN-WFDC6", "ZNF365", "PPP3CC", "DHRS4", "DEFB129", "SLC25A25", "DYX4", "LRRC52", "C1orf158", "NMBR", "HLA-DOA", "NRON", "DMRT1", "TRGJP", "NSMF", "IGHGP", "G6PC2", "INF2", "ACAT1", "POLR3GL", "OR9G4", "GPC5", "LINC01433", "FRMD5", "HSF2", "SNORD115-9", "RPL26L1", "LIM2", "GALNT2", "CXCL17", "CRYBA1", "ZBTB4", "TCHP", "BRMS1L", "MPLKIP", "CYP2W1", "HAGHL", "VTCN1", "KRT84", "SOX11", "E2F8", "TERF2IP", "MIP", "RPS16", "VAPA", "MRPS33", "LINC01097", "CCND2-AS2", "SLC35E1", "LACTBL1", "CAMK1", "RORA", "TPRA1", "LRRC41", "ATF5", "FOXK1", "PRNP", "AFM", "MRPL45", "NUP205", "RPS6", "FOXI2", "NGDN", "OR52E6", "IHH", "LINC01268", "BUB1B", "RNF217-AS1", "MAP2K2", "MITD1", "ZNF684", "IL25", "TIMM44", "CASQ1", "SLC24A2", "SYN3", "YOD1", "TRS-CGA1-1", "MYPN", "NEDD8", "FAM198B", "FRA10G", "ENPP6", "CCDC70", "GLI4", "PIN1", "TRK-TTT3-5", "RSPH9", "SNORD116-7", "DIAPH1", "COMP", "CACNA1C", "TMED6", "DYT21", "TP53", "DYT17", "SYCE3", "MYRFL", "RASAL2-AS1", "FRA11H", "ZC3H12A", "TRBV7-7", "OXCT2", "ZNF212", "A4GNT", "CBX7", "KIF2C", "VIPR2", "LINC01037", "OCM2", "GFRA1", "SPP1", "SNORD3C", "SLC4A2", "FAM136A", "PTGES2", "IZUMO2", "PLPP4", "PRSS45", "NR1I3", "SNRPD1", "NDUFC2", "FGF23", "TMEM62", "SNORD75", "UGT1A9", "ZZZ3", "CDC42-IT1", "ITIH4-AS1", "KIN", "DZANK1", "IFT20", "AHCTF1", "FRA11A", "CKS1B", "PCDHA3", "CCDC155", "PROCR", "CST5", "C17orf102", "SLC39A14", "LKAAEAR1", "PCDHA11", "CRNKL1", "ASPRV1", "C16orf45", "ETAA1", "PCGF5", "ACAP1", "CCDC92B", "MAPKAPK5", "DNAJB13", "CALML5", "ZNF691", "SLC2A4", "PKD2L1", "ANKRD46", "KLK2", "SCIMP", "NNMT", "PRSS21", "ATAD3B", "CYP8B1", "TRAJ61", "PAM16", "KCNG1", "SYNCRIP", "GZMB", "FAM134A", "SMPDL3A", "CDH19", "CHN1", "B3GALT4", "TEX15", "RHOB", "GIMAP6", "INPP5D", "PGAP2", "OR2M2", "CAPZA2", "SKP1", "CFAP77", "FAF1", "CXCR6", "MTL5", "EMC1", "NAMPT", "TRIM41", "RASA4", "C1QL2", "UPP2-IT1", "PTPN2", "SNORD159", "SNORD105B", "CNTNAP3", "LTV1", "BTBD16", "OOEP", "DFNA27", "SGPP1", "LINC00852", "WFDC13", "KMT5A", "ATOH7", "CDH11", "PDCD11", "SLCO2B1", "SPATA31A5", "MYBPH", "ALG14", "PPM1B", "HERC3", "ZNF474", "SCARNA27", "TTTY4B", "GOPC", "PI4KA", "DDAH1", "TMPRSS5", "LINC01430", "TUBA4B", "PDCD7", "MYO15B", "SLN", "METTL2A", "PIRC43", "HIST1H2BK", "KIR2DS4", "FAM222A", "PPP6R2", "TRK-CTT2-3", "MRPL32", "EWSR1", "PHLDA2", "MYL2", "LRRN4", "PPA2", "SAMHD1", "WSB2", "ENTHD1", "C19orf70", "PEMT", "TRG-TCC2-3", "ZNF705A", "FBXL14", "SF3A1", "HCG9", "APH1B", "LAMA4", "LAMP5-AS1", "ZNF800", "DOC2A", "UBXN10-AS1", "COMMD3", "SPACA3", "HSPB7", "SIKE1", "EGLN1", "CADPS2", "APOA4", "SNORA18", "HS3ST4", "ZNF90", "KCNJ8", "RFPL3", "C2-AS1", "HECTD3", "TENM4", "DISC1FP1", "ZNF793", "EPN2-IT1", "CDK5RAP3", "PRAMEF14", "EPG5", "MARCH6", "CAPNS2", "SPRR2F", "RGPD4-AS1", "AIDA", "TRAJ54", "AATBC", "PACRG-AS2", "TMC3", "GOLGA4", "SPG14", "ECSCR", "TRQ-TTG9-1", "TPRG1-AS1", "ATP2B2", "FYN", "DDB1", "RNASEH2C", "C7", "GMDS-AS1", "SOCS6", "SLC36A1", "MGAT4C", "IGF2-AS", "SPPL2A", "TMEM52B", "PPP2R5C", "ELMO1-AS1", "SNAR-B2", "DDX6", "LINC00472", "CNNM1", "KIAA0556", "TOX3", "HCG11", "LDLRAD2", "LINC00705", "ZFP30", "OR2T27", "IGHJ4", "LINC01293", "ACTL10", "FRA7G", "SCAR6", "C18orf8", "GPR18", "TMEM209", "GNAS-AS1", "SPIDR", "CSNK1G3", "UBE2N", "FAM120B", "KRR1", "SLC4A9", "MRPL20", "MARS", "C9orf72", "ZYX", "DFNY1", "DEFB135", "SGCZ", "SLC39A2", "DEFB104B", "OR4N2", "OR1D5", "CDC42SE2", "RASSF2", "TTTY21B", "C1orf95", "TRY-GTA3-1", "KMT5B", "SLC9C2", "KCNQ1-AS1", "HOXD13", "SNORD114-16", "SHKBP1", "EME2", "HES2", "PIPOX", "KRTAP5-2", "EFCC1", "LINC01354", "KIAA1211", "TRT-TGT5-1", "SHOX", "SEC62-AS1", "RPP40", "JPH4", "SPECC1", "IGF1R", "PSMD2", "FKTN", "FCHSD1", "SCRN1", "ZC2HC1C", "ATP1B1", "RNF146", "UBR5", "HPV18I1", "SPACA1", "PDE3A", "PATZ1", "CLDN25", "SUGCT", "PRMT1", "ST6GALNAC3", "TRA-TGC2-1", "GJA3", "PCDH7", "KCNH2", "PRR33", "HIF1A", "BID", "TRIT1", "HIST1H2AE", "SNX4", "RUSC1-AS1", "SPG19", "LINC01298", "TRR-CCG1-2", "RPRD2", "LIPA", "CDK5R1", "LINC01075", "ST8SIA5", "ZNF256", "UBXN11", "FEM1C", "MAML3", "OR2A7", "SNX9", "CASR", "RAD51AP2", "NUB1", "NPTX2", "ASB17", "NXPH4", "MTHFD1", "FBXO4", "ZNF462", "NGEF", "SUOX", "CYHR1", "KNG1", "SYT6", "TRIB3", "OR5B17", "MTX3", "PCDHB5", "SNTB1", "PKD3", "SMARCAL1", "ZDHHC24", "TRP-AGG2-8", "FADS6", "PPFIBP2", "ZNF165", "AGPAT4", "SNORD115-10", "NCOR2", "QPRT", "LCN9", "NADK2-AS1", "CTRL", "STK17A", "DEFA1A3", "SATB2-AS1", "TRAJ46", "NPM2", "LARGE-AS1", "LINC01350", "LINC00596", "LINC00567", "FAM81B", "C1orf134", "MGAT4B", "SYPL1", "CACNB3", "HMGCL", "SPATA31D1", "CCDC181", "LDHB", "CPN1", "LINC00278", "MAN2B2", "EVX1-AS", "DBR1", "GCHFR", "SNORA11B", "MER5", "PACSIN3", "FAM71F2", "CDCA5", "TMEM109", "HSPA9", "DEFB136", "CLPB", "MYPOP", "MINK1", "MAP7", "ATF3", "FAM118A", "XRCC3", "EIF2B1", "STAP1", "EVI5L", "ANO10", "TRI-TAT2-2", "MMP15", "ABCB5", "LENG8", "LINC01517", "ORC1", "PLCD1", "SBSN", "ITPR3", "MIC12", "MYCNUT", "GTF3C5", "CYTIP", "ADAM19", "DCLRE1B", "GSN-AS1", "STATH", "RPS27A", "DUX4L9", "RPL13", "HEXB", "KRT24", "LINC00226", "LINC01580", "TRY-GTA5-3", "H2AFY", "USP18", "FBLN1", "TNP2", "FBXL22", "FGD5", "C12orf80", "ARHGAP31-AS1", "FAM60A", "TRBV5-4", "PRICKLE2-AS1", "BTBD19", "HOXB5", "BMP3", "SCARB2", "TPD52", "MYO5C", "LINC00961", "SYTL2", "KRTAP23-1", "C10orf131", "CEP135", "MYB-AS1", "PLA2G1B", "VWA3B", "BAMBI", "WBSCR27", "POLR2J2", "SASH1", "RPL18A", "ZC3H3", "GOLGA8F", "DOK6", "FTCD-AS1", "PMPCA", "MBD3L4", "ZBTB5", "LINC00348", "DGKB", "CRHR2", "EIF3C", "OR4A15", "ADAM7", "SMIM11A", "PDGFD", "FAM83H-AS1", "SRSF7", "BMP2", "OR6C76", "LMOD2", "RN7SL2", "POLR3B", "STK19", "PATE4", "KCNE1B", "SPATA31A7", "FOXA3", "LINC00987", "ZNF30", "CTPS1", "RPF2", "ANKRD54", "RNU6-9", "SNORD138", "C14orf169", "IL22", "TRIM2", "MBD3L2", "NMTRQ-TTG12-1", "RNF111", "PRKAR1B", "SLC6A2", "SMG7-AS1", "CERS6", "GNB2", "INSRR", "CAMTA1-IT1", "JPD", "TXNDC15", "LINC00842", "CEBPZOS", "MKRN3-AS1", "SMAD4", "MYL1", "SFTPA1", "ERCC6-PGBD3", "ALDH3A1", "EIF3A", "MRPS30", "CRYGA", "PTPN1", "ENPEP", "HEATR4", "MROH7", "SPPL2C", "ZNF99", "RNU12", "SNORD116-22", "DDX60", "PMEL", "DOT1L", "IGLV3-10", "SNHG24", "LINC00242", "HSPA8", "PPT1", "CHRNA6", "ZNF654", "CACNA1S", "RPL17", "P4HA2-AS1", "CX3CL1", "SOWAHC", "ZNRF1", "GRM7-AS1", "MYO16", "LINC01355", "GABRR2", "DFNA18", "PHC3", "LEPR", "ARHGEF10L", "SNCA-AS1", "AP4S1", "GLCE", "LTF", "PIK3R1", "ERVE-4", "EFCAB14-AS1", "BPY2B", "APOBEC3A_B", "SPATA18", "CCDC180", "LINC00615", "KY", "NKILA", "LINC01017", "SETD5", "CORO7", "NQO2", "MS4A8", "ZBTB48", "ZSCAN29", "A3GALT2", "CER1", "SAXO2", "RASL11B", "TFAP2E", "INMT", "FBXO31", "SLC35G4", "AANAT", "PCDHB8", "N6AMT1", "UBE2K", "TBCA", "CCDC153", "LINC00654", "CNOT4", "AIG1", "TRK-CTT15-1", "TMEM18", "GPR89B", "PTGFRN", "KCND3-IT1", "LAPTM4A", "NOP14-AS1", "ERF", "PCDH15", "VOPP1", "PA2G4", "SLC25A21", "DAOA", "PTBP3", "LINC00235", "WSB1", "SUSD3", "MED1", "SCARNA10", "ACTA1", "C19orf12", "DSG2-AS1", "LINC01335", "UNC5C", "MYO1G", "ETHE1", "TRGV1", "STMND1", "DFNA57", "SLC23A1", "KDM7A", "SNORA90", "ZNF273", "SUGT1"];

let geneList = geneListRaw.filter(str => str.length <= 7);