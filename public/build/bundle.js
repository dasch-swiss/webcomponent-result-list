
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /**
     * Logins to the server and returns the token.
     *
     * @param info
     * @param user
     * @returns {Promise<any>}
     */
    async function login(info) {
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
    async function getList(info) {
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
    async function getOntology(info) {
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
    async function gravSearchRequest(offset, infos) {
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
    async function gravSearchRequestCount(infos) {
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
    async function getResByIri(iri, token, infos) {
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
    async function getListNode(iri, token, infos) {
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

    /* src/ResultList.svelte generated by Svelte v3.42.4 */

    const { Object: Object_1, console: console_1 } = globals;

    const file = "src/ResultList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i][0];
    	child_ctx[27] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    // (500:4) {:catch error}
    function create_catch_block_1(ctx) {
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Something went wrong";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Resource data couldn't be loaded. Let's give it another shot!";
    			t3 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Try again";
    			attr_dev(div0, "class", "error-header");
    			add_location(div0, file, 501, 12, 19061);
    			attr_dev(div1, "class", "error-text");
    			add_location(div1, file, 502, 12, 19126);
    			add_location(button, file, 504, 16, 19280);
    			attr_dev(div2, "class", "error-btn-container");
    			add_location(div2, file, 503, 12, 19230);
    			attr_dev(div3, "class", "error");
    			add_location(div3, file, 500, 8, 19029);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(500:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (467:4) {:then data}
    function create_then_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*search_data_fetched*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*search_data_fetched*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(467:4) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (469:8) {#if search_data_fetched}
    function create_if_block(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*promise_data*/ 1) show_if = !!isEmpty(/*data*/ ctx[22]);
    		if (show_if) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx, [-1, -1]);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(469:8) {#if search_data_fetched}",
    		ctx
    	});

    	return block;
    }

    // (472:12) {:else}
    function create_else_block(ctx) {
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let t2;
    	let button1_disabled_value;
    	let t3;
    	let promise;
    	let t4;
    	let each_1_anchor;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block,
    		value: 33
    	};

    	handle_promise(promise = /*promise_amount*/ ctx[1], info);
    	let each_value = /*resources*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("<");
    			t1 = space();
    			button1 = element("button");
    			t2 = text(">");
    			t3 = space();
    			info.block.c();
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			button0.disabled = /*preventPrevious*/ ctx[7]();
    			add_location(button0, file, 474, 16, 17976);
    			button1.disabled = button1_disabled_value = preventNext(/*data*/ ctx[22]);
    			add_location(button1, file, 475, 16, 18071);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);
    			insert_dev(target, t3, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => t4.parentNode;
    			info.anchor = t4;
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[10], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*promise_data*/ 1 && button1_disabled_value !== (button1_disabled_value = preventNext(/*data*/ ctx[22]))) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			info.ctx = ctx;

    			if (dirty[0] & /*promise_amount*/ 2 && promise !== (promise = /*promise_amount*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}

    			if (dirty[0] & /*resources*/ 8) {
    				each_value = /*resources*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(472:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (470:12) {#if isEmpty(data)}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No data found!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(470:12) {#if isEmpty(data)}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <svelte:options tag="result-list"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <svelte:options tag=\\\"result-list\\\"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }",
    		ctx
    	});

    	return block;
    }

    // (479:48)                      {getAmountRange(data)}
    function create_then_block_1(ctx) {
    	let t0_value = /*getAmountRange*/ ctx[8](/*data*/ ctx[22]) + "";
    	let t0;
    	let t1;
    	let t2_value = /*bla*/ ctx[33]['schema:numberOfItems'] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(" of ");
    			t2 = text(t2_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*promise_data*/ 1 && t0_value !== (t0_value = /*getAmountRange*/ ctx[8](/*data*/ ctx[22]) + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*promise_amount*/ 2 && t2_value !== (t2_value = /*bla*/ ctx[33]['schema:numberOfItems'] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(479:48)                      {getAmountRange(data)}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <svelte:options tag="result-list"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }
    function create_pending_block_1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(1:0) <svelte:options tag=\\\"result-list\\\"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }",
    		ctx
    	});

    	return block;
    }

    // (488:32) {#each value.values as val}
    function create_each_block_2(ctx) {
    	let div0;
    	let raw0_value = 2 + "";
    	let t;
    	let div1;
    	let raw1_value = /*val*/ ctx[30] + "";

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			add_location(div0, file, 488, 36, 18726);
    			add_location(div1, file, 489, 36, 18783);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			div0.innerHTML = raw0_value;
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			div1.innerHTML = raw1_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 8 && raw1_value !== (raw1_value = /*val*/ ctx[30] + "")) div1.innerHTML = raw1_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(488:32) {#each value.values as val}",
    		ctx
    	});

    	return block;
    }

    // (485:24) {#each Object.entries(resource) as [key, value]}
    function create_each_block_1(ctx) {
    	let div0;

    	let t0_value = (/*value*/ ctx[27].labels
    	? /*value*/ ctx[27].labels['en']
    	: 'Property') + "";

    	let t0;
    	let t1;
    	let div1;
    	let each_value_2 = /*value*/ ctx[27].values;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "prop-header");
    			add_location(div0, file, 485, 28, 18517);
    			add_location(div1, file, 486, 28, 18624);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 8 && t0_value !== (t0_value = (/*value*/ ctx[27].labels
    			? /*value*/ ctx[27].labels['en']
    			: 'Property') + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*resources*/ 8) {
    				each_value_2 = /*value*/ ctx[27].values;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(485:24) {#each Object.entries(resource) as [key, value]}",
    		ctx
    	});

    	return block;
    }

    // (483:16) {#each resources as resource}
    function create_each_block(ctx) {
    	let section;
    	let t;
    	let each_value_1 = Object.entries(/*resource*/ ctx[23]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			add_location(section, file, 483, 20, 18406);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}

    			append_dev(section, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 8) {
    				each_value_1 = Object.entries(/*resource*/ ctx[23]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(483:16) {#each resources as resource}",
    		ctx
    	});

    	return block;
    }

    // (465:25)          <div>...loading data</div>     {:then data}
    function create_pending_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "...loading data";
    			add_location(div, file, 465, 8, 17753);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(465:25)          <div>...loading data</div>     {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block_1,
    		value: 22,
    		error: 34
    	};

    	handle_promise(promise = /*promise_data*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			this.c = noop;
    			attr_dev(div, "class", "container");
    			add_location(div, file, 463, 0, 17695);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty[0] & /*promise_data*/ 1 && promise !== (promise = /*promise_data*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const result_per_request = 25;

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
    		});

    		return newLabel;
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
     * Checks if data is an empty object.
     *
     * @param data
     * @returns {boolean}
     */
    function isEmpty(data) {
    	return Object.keys(data).length === 0;
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('result-list', slots, []);
    	let { request_infos } = $$props;

    	/**
     * Promises objects
     */
    	let promise_data, promise_amount, promise_all_results;

    	/**
     * Offset for the gravsearch query. Defaul is set to 0
     * @type {number}
     */
    	let current_offset = 0;

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
     * Array containing the resources that will be displayed in the template.
     * @type {*[]}
     */
    	let resources = [];

    	/**
     * Initializes function that will be triggered if the input parameter "request_infos" is changed.
     * Does all the necessary requests like getting the token, list, ontology of the project and doing the gravsearch
     * request.
     */
    	function initialize() {
    		if (inputIsValid()) {
    			current_offset = 0;
    			const p1 = login(request_infos);
    			const p2 = getList(request_infos).then(l => l.lists);
    			const p3 = getOntology(request_infos);
    			const p4 = gravSearchRequest(current_offset, request_infos);

    			$$invalidate(0, promise_data = Promise.all([p1, p2, p3, p4]).then(([d1, d2, d3, d4]) => {
    				token = d1;
    				lists = d2;
    				ontology = d3;
    				console.log(d1, d2, d3);
    				getData(d4);
    				$$invalidate(1, promise_amount = gravSearchRequestCount(request_infos));
    				$$invalidate(2, search_data_fetched = true);
    				return d4;
    			}));
    		} else {
    			console.log("not valid input");
    		}
    	}

    	/**
     * Starts the gravsearch request and assigns to a promise.
     * @param offset
     */
    	function startSearchRequest(offset) {
    		$$invalidate(0, promise_data = gravSearchRequest(offset, request_infos).then(data => {
    			getData(data);
    			$$invalidate(2, search_data_fetched = true);
    			return data;
    		}));
    	}

    	/**
     * Requests the data by looping through all the resources and initializes the requests for its properties.
     * @param data
     * @returns {Promise<void>}
     */
    	async function getData(data) {
    		$$invalidate(3, resources = []);

    		for (let a of wrapData(data)) {
    			const resData = await getResByIri(a['@id'], token, request_infos);

    			const resource = {
    				'knora-api:arkUrl': {
    					labels: { 'en': 'ARK Url', 'de': 'ARK Url' },
    					values: new Array(`<a href=${resData['knora-api:arkUrl']['@value']} target='_blank'>${resData['knora-api:arkUrl']['@value']}</a>`)
    				},
    				'@id': {
    					labels: { 'en': 'Resource ID', 'de': 'Resource ID' },
    					values: new Array(a['@id'])
    				}
    			};

    			for (const [key, value] of Object.entries(resData)) {
    				if (key.includes(`${request_infos['ontologyIri']}:`)) {
    					const correctedKey = key.replace('Value', '');

    					if (Array.isArray(value)) {
    						for (let val of value) {
    							await saveProp(correctedKey, val, resource);
    						}
    					} else {
    						await saveProp(correctedKey, value, resource);
    					}
    				}
    			}

    			$$invalidate(3, resources = [...resources, resource]);
    			console.log(resources);
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
    							resource[propName]['values'].push(propValue['knora-api:decimalValueAsDecimal']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:decimalValueAsDecimal']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:BooleanValue':
    				// ['knora-api:booleanValueAsBoolean'] = true
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:booleanValueAsBoolean']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:booleanValueAsBoolean']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:ColorValue':
    				// ['knora-api:colorValueAsColor'] = '#ff3333'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:colorValueAsColor']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:colorValueAsColor']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:TimeValue':
    				// ['knora-api:timeValueAsTimeStamp']['@value'] = '2019-08-30T10:45:20.173572Z'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:timeValueAsTimeStamp']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:timeValueAsTimeStamp']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:UriValue':
    				// ['knora-api:uriValueAsUri']['@value'] = 'http://www.google.ch'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:uriValueAsUri']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:uriValueAsUri']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:GeomValue':
    				// TODO -> ['knora-api:geometryValueAsGeometry'] = "{\"status\":\"active\",\"lineColor\":\"#ff3333\",\"lineWidth\":2,\"points\":[{\"x\":0.08098591549295775,\"y\":0.16741071428571427},{\"x\":0.7394366197183099,\"y\":0.7299107142857143}],\"type\":\"rectangle\",\"original_index\":0}"
    				break;
    			case 'knora-api:GeonameValue':
    				// ['knora-api:geonameValueAsGeonameCode'] = '2661604'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:geonameValueAsGeonameCode']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:geonameValueAsGeonameCode']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:IntervalValue':
    				// ['knora-api:intervalValueHasStart']['@value'] = '0'
    				// ['knora-api:intervalValueHasEnd']['@value'] = '216000'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`);
    						} else {
    							resource[propName] = {
    								values: [
    									`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`
    								],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:TextValue':
    				// Simple Text
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
    				});
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
    							};
    						}
    					}
    				});
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
    				});
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
    				});
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
    				});
    				break;
    		}
    	}

    	function inputIsValid() {
    		return request_infos.hasOwnProperty("ontologyIri") && request_infos.hasOwnProperty("server") && request_infos.hasOwnProperty("shortCode") && request_infos.hasOwnProperty("method") && request_infos.hasOwnProperty("url");
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

    	const writable_props = ['request_infos'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<result-list> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => previous();
    	const click_handler_1 = () => next();
    	const click_handler_2 = () => initialize();

    	$$self.$$set = $$props => {
    		if ('request_infos' in $$props) $$invalidate(9, request_infos = $$props.request_infos);
    	};

    	$$self.$capture_state = () => ({
    		login,
    		getList,
    		getOntology,
    		gravSearchRequest,
    		gravSearchRequestCount,
    		getResByIri,
    		getListNode,
    		request_infos,
    		promise_data,
    		promise_amount,
    		promise_all_results,
    		current_offset,
    		result_per_request,
    		token,
    		lists,
    		ontology,
    		search_data_fetched,
    		resources,
    		initialize,
    		startSearchRequest,
    		getData,
    		saveProp,
    		changeLabels,
    		inputIsValid,
    		isEmpty,
    		next,
    		previous,
    		preventPrevious,
    		preventNext,
    		getAmountRange,
    		wrapData
    	});

    	$$self.$inject_state = $$props => {
    		if ('request_infos' in $$props) $$invalidate(9, request_infos = $$props.request_infos);
    		if ('promise_data' in $$props) $$invalidate(0, promise_data = $$props.promise_data);
    		if ('promise_amount' in $$props) $$invalidate(1, promise_amount = $$props.promise_amount);
    		if ('promise_all_results' in $$props) promise_all_results = $$props.promise_all_results;
    		if ('current_offset' in $$props) current_offset = $$props.current_offset;
    		if ('token' in $$props) token = $$props.token;
    		if ('lists' in $$props) lists = $$props.lists;
    		if ('ontology' in $$props) ontology = $$props.ontology;
    		if ('search_data_fetched' in $$props) $$invalidate(2, search_data_fetched = $$props.search_data_fetched);
    		if ('resources' in $$props) $$invalidate(3, resources = $$props.resources);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*request_infos*/ 512) {
    			/**
     * Observing the input variables and starting the initialization.
     */
    			request_infos && initialize();
    		}
    	};

    	return [
    		promise_data,
    		promise_amount,
    		search_data_fetched,
    		resources,
    		initialize,
    		next,
    		previous,
    		preventPrevious,
    		getAmountRange,
    		request_infos,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class ResultList extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.container{margin-top:1rem;border:1px solid lightgray;padding:1rem}section{margin:1rem 0;padding:1.5rem;display:grid;grid-template-columns:auto 1fr;gap:1rem;border:1px solid darkgray;font-size:smaller}@media(max-width: 600px){section{grid-template-columns:1fr;gap:0.5rem}}.prop-header{font-weight:bold}.error{text-align:center}.error-header{font-size:larger;margin-top:0.5rem}.error-text{margin:0.5rem}.error-btn-container>button{margin:0.5rem;background-color:dodgerblue;color:white}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{ request_infos: 9 },
    			null,
    			[-1, -1]
    		);

    		const { ctx } = this.$$;
    		const props = this.attributes;

    		if (/*request_infos*/ ctx[9] === undefined && !('request_infos' in props)) {
    			console_1.warn("<result-list> was created without expected prop 'request_infos'");
    		}

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["request_infos"];
    	}

    	get request_infos() {
    		return this.$$.ctx[9];
    	}

    	set request_infos(request_infos) {
    		this.$$set({ request_infos });
    		flush();
    	}
    }

    customElements.define("result-list", ResultList);

}());
//# sourceMappingURL=bundle.js.map
