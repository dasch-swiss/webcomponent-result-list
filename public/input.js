const result = document.querySelector("result-list");

tdk_gs_1 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX tdk: <http://api.0805-test-server.dasch.swiss/ontology/0805/tdk_onto/v2#>\n" +
    "PREFIX knora-api-simple: <http://api.knora.org/ontology/knora-api/simple/v2#>\n" +
    "CONSTRUCT {\n" +
    "?mainres knora-api:isMainResource true .\n" +
    "?mainres tdk:bildSMFund ?bildSMFund .\n" +
    "?bildSMFund tdk:smNr ?smNr .\n" +
    "?mainres knora-api:hasStillImageFileValue ?imgfile .\n" +
    "} WHERE {\n" +
    "?mainres a knora-api:Resource .\n" +
    "?mainres a tdk:Bild .\n" +
    "?mainres tdk:bildSMFund ?bildSMFund .\n" +
    "?bildSMFund tdk:smNr ?smNr .\n" +
    "?smNr knora-api:valueAsString ?smNrStr .\n" +
    "FILTER regex(?smNrStr, \"40B\", \"i\") .\n" +
    "?mainres knora-api:hasStillImageFileValue ?imgfile .\n" +
    "}\n";

tdk_gs_2 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX tdk: <http://api.0805-test-server.dasch.swiss/ontology/0805/tdk_onto/v2#>\n" +
    "PREFIX knora-api-simple: <http://api.knora.org/ontology/knora-api/simple/v2#>\n" +
    "CONSTRUCT {\n" +
    "?mainres knora-api:isMainResource true .\n" +
    "?mainres tdk:bildSMFund ?bildSMFund .\n" +
    "?bildSMFund tdk:smNr ?smNr .\n" +
    "?mainres knora-api:hasStillImageFileValue ?imgfile .\n" +
    "} WHERE {\n" +
    "?mainres a knora-api:Resource .\n" +
    "?mainres a tdk:Bild .\n" +
    "?mainres tdk:bildSMFund ?bildSMFund .\n" +
    "?bildSMFund tdk:smNr ?smNr .\n" +
    "?smNr knora-api:valueAsString ?smNrStr .\n" +
    "FILTER regex(?smNrStr, \"40C\", \"i\") .\n" +
    "?mainres knora-api:hasStillImageFileValue ?imgfile .\n" +
    "}\n";

tdk_info = {
    ontologyIri : "tdk_onto",
    server : "api.0805-test-server.dasch.swiss",
    shortCode : "0805",
    method: "POST",
    url: 'https://api.0805-test-server.dasch.swiss/v2/searchextended',
    requestType: "gravsearch",
    gravSearch: tdk_gs_2,
    user: {
        email: "tdk0805import@example.com",
        pwd: "test"
    },
    display: "properties"
}

fulltext_info = {
    ontologyIri : "tdk_onto",
    server : "api.0805-test-server.dasch.swiss",
    shortCode : "0805",
    method: "GET",
    url: 'https://api.0805-test-server.dasch.swiss/v2/search/40C',
    requestType: "fulltext",
    user: {
        email: "tdk0805import@example.com",
        pwd: "test"
    },
    display: "properties"
}
ww_gs_1 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX knora-api-simple: <http://api.knora.org/ontology/knora-api/simple/v2#>\n" +
    "PREFIX teimww: <http://api.0826-test-server.dasch.swiss/ontology/0826/teimww/v2#>\n" +
    "\n" +
    "CONSTRUCT {\n" +
    "?lexia knora-api:isMainResource true .\n" +
    "?lexia teimww:hasLexiaTitle ?lexiaTitle .\n" +
    "} WHERE {\n" +
    "?lexia a teimww:lexia .\n" +
    "?lexia teimww:hasLexiaTitle ?lexiaTitle .\n" +
    "?lexiaTitle knora-api:valueAsString ?lexiaTitleString .\n" +
    "FILTER regex(?lexiaTitleString, \"^B\", \"i\")\n" +
    "}\n";

ww_gs_2 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX knora-api-simple: <http://api.knora.org/ontology/knora-api/simple/v2#>\n" +
    "PREFIX teimww: <http://api.0826-test-server.dasch.swiss/ontology/0826/teimww/v2#>\n" +
    "\n" +
    "CONSTRUCT {\n" +
    "?book knora-api:isMainResource true .\n" +
    "?book teimww:hasPrefixBookTitle ?prefixBookTitle .\n" +
    "?book teimww:hasBookTitle ?bookTitle .\n" +
    "?passage teimww:occursIn ?book .\n" +
    "?passage teimww:isMentionedIn ?sPassage .\n" +
    "} WHERE {\n" +
    "?book a teimww:book .\n" +
    "OPTIONAL { ?book teimww:hasPrefixBookTitle ?prefixBookTitle . }\n" +
    "?book teimww:hasBookTitle ?bookTitle .\n" +
    "?bookTitle knora-api:valueAsString ?bookTitleString .\n" +
    "FILTER regex(?bookTitleString, \"^B\", \"i\")\n" +
    "?passage teimww:occursIn ?book .\n" +
    "?passage teimww:isMentionedIn ?sPassage .\n" +
    "\n" +
    "}"

wordweb_info = {
    ontologyIri : "teimww",
    server : "api.0826-test-server.dasch.swiss",
    shortCode : "0826",
    method: "POST",
    url: 'https://api.0826-test-server.dasch.swiss/v2/searchextended',
    gravSearch: ww_gs_2,
    user: {
        email: "root@example.com",
        pwd: "test"
    },
    display: "properties"
}

pou_gs_1 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX pou: <http://api.0827-test-server.dasch.swiss/ontology/0827/pou/v2#>\n" +
    "CONSTRUCT {\n" +
    "?physcop knora-api:isMainResource true .\n" +
    "?physcop pou:dateOnPhotograph ?date .\n" +
    "?photo pou:physicalCopy ?physcop .\n" +
    "?physcop knora-api:hasStillImageFileValue ?imgfile .\n" +
    "?physcop pou:photographer ?photographer .\n" +
    "?photo pou:peopleOnPic ?people .\n" +
    "?photo pou:dateOfPassport ?dateOfPassport .\n" +
    "?people pou:originTown ?originTown .\n" +
    "?people pou:originKaza ?originKaza .\n" +
    "?people pou:originKarye ?originKarye .\n" +
    "?people pou:originMahalle ?originMahalle .\n" +
    "?people pou:house ?originHouse .\n" +
    "?people pou:turkishName ?tname2 .\n" +
    "} WHERE {\n" +
    "?physcop a knora-api:Resource .\n" +
    "?physcop a pou:PhysicalCopy .\n" +
    "OPTIONAL{?physcop pou:dateOnPhotograph ?date .}\n" +
    "?photo pou:physicalCopy ?physcop .\n" +
    "OPTIONAL{?photo pou:dateOfPassport ?dateOfPassport . }\n" +
    "?physcop knora-api:hasStillImageFileValue ?imgfile .\n" +
    "?photo pou:peopleOnPic ?people .\n" +
    "OPTIONAL{?physcop pou:photographer ?photographer .}\n" +
    "OPTIONAL{?people pou:originTown ?originTown .}\n" +
    "OPTIONAL{?people pou:originKaza ?originKaza .}\n" +
    "OPTIONAL{?people pou:originKarye ?originKarye .}\n" +
    "OPTIONAL{?people pou:originMahalle ?originMahalle .}\n" +
    "OPTIONAL{ ?people pou:house ?originHouse .}\n" +
    "OPTIONAL{?people pou:turkishName ?tname2 .}\n" +
    "}\n" +
    "ORDER BY ?date";

pou_gs_2 = "PREFIX knora-api: <http://api.knora.org/ontology/knora-api/v2#>\n" +
    "PREFIX pou: <http://api.0827-test-server.dasch.swiss/ontology/0827/pou/v2#>\n" +
    "PREFIX knora-api-simple: <http://api.knora.org/ontology/knora-api/simple/v2#>\n" +
    "CONSTRUCT {\n" +
    "?mainres knora-api:isMainResource true .\n" +
    "?mainres pou:addresse ?addresse .\n" +
    "} WHERE {\n" +
    "?mainres a knora-api:Resource .\n" +
    "?mainres a pou:CoverLetter .\n" +
    "?mainres pou:addresse ?addresse .\n" +
    "}";

pou_info = {
    ontologyIri : "pou",
    server : "api.0827-test-server.dasch.swiss",
    shortCode : "0827",
    method: "POST",
    requestType: "gravsearch",
    url: 'https://api.0827-test-server.dasch.swiss/v2/searchextended',
    gravSearch: pou_gs_2,
    user: {
        email: "pou0827import@example.com",
        pwd: "test"
    },
    display: "properties"
}

result.request_infos = fulltext_info;
