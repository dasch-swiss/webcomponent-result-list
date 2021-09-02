<svelte:options tag="result-list"/>

<script>
	import {requestData, login} from "./Services/dsp-services";

	export let query_infos;
    let input_valid;

	let promise_data;

	$: query_infos && initialize();

	function initialize() {
        if (inputIsValid()) {
            input_valid = true;
            promise_data = requestData(query_infos);
        }
	}

	function inputIsValid() {
		return query_infos.hasOwnProperty("ontologyIri") &&
				query_infos.hasOwnProperty("server") &&
				query_infos.hasOwnProperty("shortCode") &&
				query_infos.hasOwnProperty("method") &&
				query_infos.hasOwnProperty("url");
	}
</script>

<div class="container">
	{#if input_valid}
        {#await promise_data}
            <div>...loading data</div>
        {:then data}
            {#each data['@graph'] as result}
                <div class="result">{result['@id']}</div>
            {/each}
        {:catch error}
            <div>Error</div>
        {/await}
	{/if}
</div>

<style>
	.container {
		border: 1px solid black;
		padding: 0.5rem;
	}

    .result {
        border: 1px solid darkgray;
        border-radius: 10px;
        padding: 0.5rem;
        margin: 1rem;
    }
</style>
