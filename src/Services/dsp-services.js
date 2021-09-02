/**
 * Logins to the server and returns the token.
 *
 * @param user
 * @returns {Promise<any>}
 */
export async function login(user) {
    const res = await fetch(`https://${server}/v2/authentication`,
        {
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            method: 'POST',
            body: JSON.stringify({'email': user['Email'], 'password': user['Pwd']})
        })

    const json = await res.json();

    // Checks if request succeeded
    if (!res.ok) {
        console.error(json);
        return Promise.reject(
            new Error(`${res.status.toString()}: ${res.statusText}`)
        )
    }

    return json.token;
}

/**
 * Requests the ontology of a project and returns it.
 *
 * @returns {Promise<any>}
 */
export async function getOntology(info) {
    const res = await fetch('https://' + info.server + '/v2/ontologies/allentities/' + encodeURIComponent('http://' + info.server + '/ontology/' + info.shortCode + '/' + info.ontologyIri + '/v2') + '?allLanguages=true', {
        method: 'GET'
    })

    // Checks if request succeeded
    if (!res.ok) {
        throw new Error(res.statusText);
    }

    const json = await res.json();
    return json['@graph'];
}

/**
 * Requests the data with the parameter given from parent component.
 *
 * @param infos
 * @returns {Promise<unknown>}
 */
export async function requestData(infos) {
    const res = await fetch(infos['url'], {
        method: infos['method'],
        body: infos['gravSearch']
    })

    const json = await res.json();

    // Checks if request succeeded
    if (!res.ok) {
        console.error(json);
        return Promise.reject(
            new Error(`${res.status.toString()}: ${res.statusText}`)
        )
    }

    return json;
}
