<svelte:options tag="result-list"/>

<script>
    import {
        login,
        getList,
        getOntology,
        searchRequest,
        searchRequestCount,
        getResByIri,
        getListNode
    } from "./Services/dsp-services";
    import {Image} from "./model";

    /**
     * Object assigned from outside the web component. Contains all the necessary details for doing the requests.
     */
    export let request_infos;

    /**
     * Stores the info what should be displayed. Value can be 'properties' or 'images'.
     */
    let display = "";

    /**
     * Promises objects
     */
	let promise_data, promise_amount, promise_all_results;

    /**
     * Offset for the gravsearch query. Default is set to 0.
     * @type {number}
     */
    let current_offset = 0;

    /**
     * Amount of maximum results of a gravsearch request answer.
     * @type {number}
     */
    const result_per_request = 25;

    /**
     * Size of image in pixels that will be shown if display is set to 'images'.
     * @type {number}
     */
    const square_size = 150;

    /**
     * Size of image in pixels that will be shown if display is set to 'properties'.
     * @type {number}
     */
    const image_size = 700;

    /**
     * Token, lists and ontology of a project.
     */
    let token, lists, ontology;

    /**
     * Flag if the data was fetched by completing a data request.
     * @type {boolean}
     */
    let search_data_fetched = false;

    /**
     * Flag to be set if display is set to 'images' and there is no images property in the resource.
     * @type {boolean}
     */
    let invalid_images = false;

    /**
     * Array containing the resources that will be displayed in the template.
     * @type {*[]}
     */
    let resources = [];

    /**
     * Array containing the images that will be displayed in the template.
     * @type {*[]}
     */
    let images = [];

    /**
     * Observing the input variables and starting the initialization.
     */
	$: request_infos && initialize();

    /**
     * Initializes function that will be triggered if the input parameter "request_infos" is changed.
     * Does all the necessary requests like getting the token, list, ontology of the project and doing the gravsearch
     * request.
     */
	function initialize() {

        if (inputIsValid()) {
            current_offset = 0;
            display = getDisplayInfo();
            // Set up all requests
            const p1 = login(request_infos);
            const p2 = getList(request_infos).then(l => l.lists);
            const p3 = getOntology(request_infos);
            const p4 = searchRequest(current_offset, request_infos);

            promise_data = Promise.all([p1, p2, p3, p4])
                .then(([d1, d2, d3, d4]) => {
                    token = d1;
                    lists = d2;
                    ontology = d3;

                    if (display === 'images') {
                        if (hasValidImages(d4)) {
                            images = addImages(wrapData(d4));
                            promise_amount = searchRequestCount(request_infos);
                            search_data_fetched = true;
                        } else {
                            invalid_images = true;
                        }
                    } else {
                        getData(d4);
                        promise_amount = searchRequestCount(request_infos);
                        search_data_fetched = true;
                    }

                    return d4;
                });

        } else {
            console.log("not valid input");
        }
	}

    /**
     * Starts the gravsearch request and assigns to a promise.
     *
     * @param offset
     */
    function startSearchRequest(offset) {
        promise_data = searchRequest(offset, request_infos)
            .then((data) => {

                if (display === 'images') {
                    if (hasValidImages(data)) {
                        images = addImages(wrapData(data));
                        search_data_fetched = true;
                    } else {
                        invalid_images = true;
                    }
                } else {
                    getData(data);
                    search_data_fetched = true;
                }

                return data;
            });
    }

    /**
     * Requests the data by looping through all the resources and initializes the requests for its properties.
     *
     * @param data
     * @returns {Promise<void>}
     */
    async function getData(data) {
        resources = [];

        for (let a of wrapData(data)) {
            const resData = await getResByIri(a['@id'], token, request_infos);

            const resource = {
                'knora-api:arkUrl': {
                    labels: {'en': 'ARK Url', 'de': 'ARK Url'},
                    values: new Array(`<a href=${resData['knora-api:arkUrl']['@value']} target='_blank'>${resData['knora-api:arkUrl']['@value']}</a>`)
                },
                '@id': {
                    labels: {'en': 'Resource ID', 'de': 'Resource ID'},
                    values: new Array(a['@id'])
                }
            };

            for (const [key, value] of Object.entries(resData)) {
                if (key.includes(`${request_infos['ontologyIri']}:`)) {
                    const correctedKey = key.replace('Value', '');
                    if (Array.isArray(value)) {
                        for (let val of value) {
                            await saveProp(correctedKey, val, resource)
                        }
                    } else {
                        await saveProp(correctedKey, value, resource);
                    }
                }
            }

            // Adding the still image information
            if (resData.hasOwnProperty('knora-api:hasStillImageFileValue')) {
                resource['knora-api:hasStillImageFileValue'] = {
                    labels: {'en': 'Still image', 'de': 'Bild'},
                    values: convertImageObj(resData)
                };
            }

            resources = [...resources, resource];
        }
    }


    /**
     * Evaluates which type the property is and saves the value to the resource object.
     *
     * @param propName
     * @param propValue
     * @param resource
     * @returns {Promise<void>}
     */
    async function saveProp(propName, propValue, resource) {

        switch (propValue['@type']) {
            case 'knora-api:DecimalValue':
                // ['knora-api:decimalValueAsDecimal']['@value'] = '1.5'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:decimalValueAsDecimal']['@value'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:decimalValueAsDecimal']['@value']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:BooleanValue':
                // ['knora-api:booleanValueAsBoolean'] = true
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:booleanValueAsBoolean'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:booleanValueAsBoolean']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:ColorValue':
                // ['knora-api:colorValueAsColor'] = '#ff3333'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:colorValueAsColor'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:colorValueAsColor']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:TimeValue':
                // ['knora-api:timeValueAsTimeStamp']['@value'] = '2019-08-30T10:45:20.173572Z'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:timeValueAsTimeStamp']['@value'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:timeValueAsTimeStamp']['@value']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:UriValue':
                // ['knora-api:uriValueAsUri']['@value'] = 'http://www.google.ch'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:uriValueAsUri']['@value'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:uriValueAsUri']['@value']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:GeomValue':
                // TODO -> ['knora-api:geometryValueAsGeometry'] = "{\"status\":\"active\",\"lineColor\":\"#ff3333\",\"lineWidth\":2,\"points\":[{\"x\":0.08098591549295775,\"y\":0.16741071428571427},{\"x\":0.7394366197183099,\"y\":0.7299107142857143}],\"type\":\"rectangle\",\"original_index\":0}"
                break;
            case 'knora-api:GeonameValue':
                // ['knora-api:geonameValueAsGeonameCode'] = '2661604'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:geonameValueAsGeonameCode'])
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:geonameValueAsGeonameCode']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:IntervalValue':
                // ['knora-api:intervalValueHasStart']['@value'] = '0'
                // ['knora-api:intervalValueHasEnd']['@value'] = '216000'
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`)
                        } else {
                            resource[propName] = {
                                values: [`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:TextValue':
                // Simple Text
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:valueAsString'])
                        } else {
                            resource[propName] = {
                                values: new Array(propValue['knora-api:valueAsString']),
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                // Rich Text
                // TODO -> ['knora-api:textValueAsXml'] = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<text><p>test with <strong>markup</strong></p></text>"
                break;
            case 'knora-api:IntValue':
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:intValueAsInt']);
                        } else {
                            resource[propName] = {
                                values: [propValue['knora-api:intValueAsInt']],
                                labels: changeLabels(onto['rdfs:label'])
                            }
                        }
                    }
                })
                break;
            case 'knora-api:DateValue':
                // In case the details will be needed
                // ['knora-api:dateValueHasCalendar'] = 'GREGORIAN'
                // ['knora-api:dateValueHasEndDay'] = 13;
                // ['knora-api:dateValueHasEndEra'] =  'CE';
                // ['knora-api:dateValueHasEndMonth'] = 5;
                // ['knora-api:dateValueHasEndYear'] = 2018;
                // ['knora-api:dateValueHasStartDay'] = 13;
                // ['knora-api:dateValueHasStartEra'] = 'CE';
                // ['knora-api:dateValueHasStartMonth'] = 5;
                // ['knora-api:dateValueHasStartYear'] = 2018;

                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:valueAsString']);
                        } else {
                            resource[propName] = {
                                values: new Array(propValue['knora-api:valueAsString']),
                                labels: changeLabels(onto['rdfs:label'])
                            };
                        }
                    }
                })
                break;
            case 'knora-api:ListValue':
                const listObject = await getListNode(propValue['knora-api:listValueAsListNode']['@id'], token, request_infos);

                lists.forEach(list => {
                    if (list.id === listObject['knora-api:hasRootNode']['@id']) {
                        if (resource[listObject['knora-api:hasRootNode']['@id']]) {
                            resource[listObject['knora-api:hasRootNode']['@id']]['values'].push(listObject['rdfs:label']);
                        } else {
                            resource[listObject['knora-api:hasRootNode']['@id']] = {
                                values: new Array(listObject['rdfs:label']),
                                labels: changeLabels(list['labels'])
                            };
                        }
                    }
                })
                break;
            case 'knora-api:LinkValue':
                ontology.forEach(onto => {
                    if (onto['@id'] === propName) {
                        if (resource[propName]) {
                            resource[propName]['values'].push(propValue['knora-api:linkValueHasTarget']['@id']);
                        } else {
                            resource[propName] = {
                                values: new Array(propValue['knora-api:linkValueHasTarget']['@id']),
                                labels: changeLabels(onto['rdfs:label'])
                            };
                        }
                    }
                })
                break;
            default:
                break;
        }

    }

    /**
     * Create the label object with languages as keys.
     *
     * @param labels
     * @returns {{}|*}
     */
    function changeLabels(labels) {
        if (Array.isArray(labels)) {
            let newLabel = {};
            labels.forEach(label => {
                if (label.hasOwnProperty('@language')) {
                    newLabel[label['@language']] = label['@value'];
                } else if (label.hasOwnProperty('language')) {
                    newLabel[label['language']] = label['value'];
                }
            })
            return newLabel
        } else {
            let newLabel = {};
            if (labels.hasOwnProperty('@language')) {
                newLabel[labels['@language']] = labels['@value'];
            } else if (labels.hasOwnProperty('language')) {
                newLabel[labels['language']] = labels['value'];
            }
            return newLabel;
        }
    }

    /**
     * Checks if request_infos object has the necessary properties for executing the request.
     *
     * @returns {boolean}
     */
    function inputIsValid() {
        return request_infos.hasOwnProperty("ontologyIri") &&
            request_infos.hasOwnProperty("server") &&
            request_infos.hasOwnProperty("shortCode") &&
            request_infos.hasOwnProperty("method") &&
            request_infos.hasOwnProperty("url");
    }

    /**
     * Getting the display info from input object.
     *
     * @returns {*|string}
     */
    function getDisplayInfo() {
        return request_infos['display'] && (request_infos['display'] === 'properties' || request_infos['display'] === 'images') ? request_infos['display'] : "properties";
    }

    /**
     * Checks if the data has hasStillImageFileValue property, so the images passed to the child component and
     * can be displayed in the end.
     *
     * @param data
     * @returns {boolean}
     */
    function hasValidImages(data) {
        if (data.hasOwnProperty('@graph') && Array.isArray(data['@graph'])) {
            return data['@graph'].every(obj => obj['knora-api:hasStillImageFileValue']);
        } else {
            return data.hasOwnProperty('knora-api:hasStillImageFileValue');
        }
    }

    /**
     * Converts every element from the results into a image object and is added to an array.
     *
     * @param images
     * @returns {Image[]}
     */
    function addImages(images) {
        return [...images.map(image => convertImageObj(image))];
    }

    /**
     * Converts a object from result into an image object.
     *
     * @param image
     * @returns {Image}
     */
    function convertImageObj(image) {
        const url = `${image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasIIIFBaseUrl']['@value']}/${image['knora-api:hasStillImageFileValue']['knora-api:fileValueHasFilename']}`;

        return new Image(
            image['@id'],
            url,
            image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasDimX'],
            image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasDimY']);
    }

    /**
     * Builds the iiif url with square image and a custom size.
     *
     * @param url
     * @param size
     * @returns {string}
     */
    function getIIIfSquareURL(url, size) {
        return `${url}/square/${size},/0/default.jpg`;
    }

    /**
     * Builds the iiif url with full image and a custom size.
     *
     * @param url
     * @param size
     * @returns {string}
     */
    function getIIIfFullURL(url, size) {
        return `${url}/full/${size},/0/default.jpg`;
    }

    /**
     * ???
     *
     * @param img
     */
    function openImageOverlay(img) {
        console.log('Clicked on image', getIIIfFullURL(img['url'], image_size));
        // TODO Find a solution to show the image in full size.
    }

    /**
     * Checks if data is an empty object.
     *
     * @param data
     * @returns {boolean}
     */
    function isEmpty(data) {
        return Object.keys(data).length === 0;
    }

    /**
     * Increases the offset and starts a new request with the new offset.
     */
    function next() {
        startSearchRequest(current_offset += 1);
    }

    /**
     * Decreases the offset and starts a new request with the new offset.
     */
    function previous() {
        startSearchRequest(current_offset -= 1);
    }

    /**
     * Prevents showing previous results if current offset is 0.
     *
     * @returns {boolean}
     */
    function preventPrevious() {
        return current_offset === 0;
    }

    /**
     * Prevents showing next results if data does not have flag for more result.
     *
     * @param data
     * @returns {boolean}
     */
    function preventNext(data) {
        return !(data.hasOwnProperty('knora-api:mayHaveMoreResults') && data['knora-api:mayHaveMoreResults']);
    }

    /**
     * Get range of the displayed results.
     *
     * @param data
     */
    function getAmountRange(data) {
        if (data.hasOwnProperty('@graph')) {
            return `${current_offset * result_per_request + 1}-${current_offset * result_per_request + data['@graph'].length}`;
        } else {
            return `${current_offset * result_per_request + 1}`;
        }
    }

    /**
     * Wraps the data in an array if there is one or no result.
     *
     * @param data
     */
    function wrapData(data) {
        if (data['@graph']) {
            return data['@graph'];
        } else if (data['@id']) {
            return [data];
        } else {
            return [];
        }
    }
</script>

<div class="container">
    {#await promise_data}
        <div>...loading data</div>
    {:then data}

        {#if search_data_fetched}
            {#if isEmpty(data)}
                No data found!
            {:else}

                <!-- Pagination buttons -->
                <button disabled={preventPrevious()} on:click={() => previous()}>&lt;</button>
                <button disabled={preventNext(data)} on:click={() => next()}>&gt;</button>

                <!-- Pagination range -->
                {#await promise_amount then bla}
                    {getAmountRange(data)} of {bla['schema:numberOfItems']}
                {/await}

                <!-- Check what resource will show -->
                {#if display === "images"}
                    <!-- Show images -->
                    <section class="img-section">
                        {#if images.length > 0}
                            <div class="images-container" style="--size: {square_size}px">
                                {#each images as img, i}
                                    <img on:click={() => openImageOverlay(img)}
                                         class="small-image"
                                         src="{getIIIfSquareURL(img['url'], square_size)}"
                                         alt="result image number {i + 1}">
                                {/each}
                            </div>
                        {:else }
                            <div>No Results</div>
                        {/if}
                    </section>
                {:else if display === "properties"}
                    <!-- Show properties -->
                    {#each resources as resource}
                        <section class="res-section">
                            {#if resource.hasOwnProperty('knora-api:hasStillImageFileValue')}
                                <div></div>
                                <div><img src="{getIIIfFullURL(resource['knora-api:hasStillImageFileValue']['values']['url'], square_size)}"></div>
                            {/if}

                            {#each Object.entries(resource) as [key, value]}
                                {#if key !== 'knora-api:hasStillImageFileValue'}
                                    <div class="prop-header">{value.labels ? value.labels['en']: 'Property'}</div>
                                    <div>
                                        {#each value.values as val}
                                            <div>{@html val}</div>
                                        {/each}
                                    </div>
                                {/if}
                            {/each}
                        </section>
                    {/each}
                {/if}


            {/if}
        {/if}

        {#if invalid_images}
            No invalid images
        {/if}

    {:catch error}
        <div class="error">
            <div class="error-header">Something went wrong</div>
            <div class="error-text">Resource data couldn't be loaded. Let's give it another shot!</div>
            <div class="error-btn-container">
                <button on:click={() => initialize()}>Try again</button>
            </div>
        </div>
    {/await}
</div>

<style>
    .container {
        margin-top: 1rem;
        border: 1px solid lightgray;
        padding: 1rem;
    }

    .res-section {
        margin: 1rem 0;
        padding: 1.5rem;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        border: 1px solid darkgray;
        font-size: smaller;
    }

    @media (max-width: 600px) {
        .res-section {
            grid-template-columns: 1fr;
            gap: 0.5rem;
        }
    }

    .prop-header {
        font-weight: bold;
    }

    .error {
        text-align: center;
    }

    .error-header {
        font-size: larger;
        margin-top: 0.5rem;
    }

    .error-text {
        margin: 0.5rem;
    }

    .error-btn-container > button {
        margin: 0.5rem;
        background-color: dodgerblue;
        color: white;
    }

    .img-section {
        margin: 1rem 0;
    }

    .images-container {
        margin-top: 1rem;
        margin-bottom: 1rem;
        display: grid;
        justify-content: center;
        /*grid-template-columns: repeat(auto-fill, minmax(150px, 150px));*/
        grid-template-columns: repeat(auto-fill, minmax(var(--size), var(--size)));
        gap: 1rem;
    }

    .small-image {
        opacity: 1;
        -webkit-transition: .3s ease-in-out;
        transition: .3s ease-in-out;
    }

    .small-image:hover {
        opacity: .5;
        cursor: pointer;
    }
</style>
