/**
 * Logins to the server and returns the token.
 *
 * @param info
 * @param user
 * @returns {Promise<any>}
 */
export async function login(info) {
    return fetch(`https://${info.server}/v2/authentication`,
        {
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            method: 'POST',
            body: JSON.stringify({'email': info['user']['email'], 'password': info['user']['pwd']})
        }).then((res) => {
        // Checks if request succeeded
        if (!res.ok) {
            return Promise.reject(
                new Error(`${res.status.toString()}: ${res.statusText}`)
            )
        }

        return res.json();
    });
}

/**
 * Requests all the lists of a project and returns it.
 *
 * @returns {Promise<any>}
 */
export async function getList(info) {
    return fetch(`https://${info.server}/admin/lists?${new URLSearchParams({projectIri: 'http://rdfh.ch/projects/' + info.shortCode})}`)
        .then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(res.statusText)
                )
            }

            return res.json();
        });
}

/**
 * Requests the ontology of a project and returns it.
 *
 * @returns {Promise<any>}
 */
export async function getOntology(info) {
    return fetch('https://' + info.server + '/v2/ontologies/allentities/' + encodeURIComponent('http://' + info.server + '/ontology/' + info.shortCode + '/' + info.ontologyIri + '/v2') + '?allLanguages=true', {
        method: 'GET'
    }).then((res) => {
        // Checks if request succeeded
        if (!res.ok) {
            return Promise.reject(
                new Error(res.statusText)
            )
        }

        return res.json().then(data => data['@graph']);
    });
}

/**
 * Requests the data with the parameter given from parent component.
 *
 * @param offset
 * @param infos
 * @returns {Promise<unknown>}
 */
export async function gravSearchRequest(offset, infos) {
    return fetch(infos['url'], {
        method: infos['method'],
        body: infos['gravSearch'] + `\n OFFSET ${offset}`
    }).then((res) => {
        if (!res.ok) {
            return Promise.reject(
                new Error(`${res.status.toString()}: ${res.statusText}`)
            )
        }

        return res.json();
    });
}

/**
 * Requests the data count with the parameter given from parent component and the offset 0.
 *
 * @returns {Promise<unknown>}
 */
export async function gravSearchRequestCount(infos) {
    return fetch(infos['url'] + '/count', {
        method: infos['method'],
        body: infos['gravSearch']
    }).then((res) => {
        // Checks if request succeeded
        if (!res.ok) {
            return Promise.reject(
                new Error(`${res.status.toString()}: ${res.statusText}`)
            );
        }

        return res.json();
    });
}

/**
 * Requests the resource by the iri and returns it.
 *
 * @param iri
 * @param token
 * @param infos
 * @returns {Promise<any>}
 */
export async function getResByIri(iri, token, infos) {
    // Checks if token is valid
    if (!token) {
        return Promise.reject(
            new Error("No valid token")
        );
    }

    return fetch(`https://${infos.server}/v2/resources/${encodeURIComponent(iri)}`, {
        headers: new Headers({
            'Authorization': `Bearer ${token}`
        })
    }).then((res) => {
        // Checks if request succeeded
        if (!res.ok) {
            return Promise.reject(
                new Error(`${res.status.toString()}: ${res.statusText}`)
            )
        }

        return res.json();
    })
}

/**
 * Requests the list node by the iri and returns it.
 *
 * @param iri
 * @param token
 * @param infos
 * @returns {Promise<any>}
 */
export async function getListNode(iri, token, infos) {
    // Checks if token is valid
    if (!token) {
        return Promise.reject(
            new Error("No valid token")
        )
    }

    return fetch(`https://${infos.server}/v2/node/${encodeURIComponent(iri)}`, {
        headers: new Headers({
            'Authorization': `Bearer ${token}`
        })
    }).then((res) => {
        // Checks if request succeeded
        if (!res.ok) {
            return Promise.reject(
                new Error(res.statusText)
            )
        }

        return res.json();
    });
}
